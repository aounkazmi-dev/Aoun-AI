import { apiUrl } from "./api";
import { consumeStream } from "./stream";
import type { StreamEvent } from "./types";

const transientStatuses = new Set([502, 503, 504]);
const startupMessage =
  "The assistant is taking too long to start. Please try again shortly.";

function pause(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const cancel = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, 1000);
    signal.addEventListener("abort", cancel, { once: true });
  });
}

// Wake a sleeping host before sending a prompt. A hosting loading page is not readiness.
async function waitUntilReady(signal: AbortSignal, deadline: number) {
  while (Date.now() < deadline) {
    signal.throwIfAborted();
    try {
      const response = await fetch(apiUrl("/api/ready"), {
        cache: "no-store",
        signal: AbortSignal.any([
          signal,
          AbortSignal.timeout(
            Math.max(1, Math.min(10000, deadline - Date.now())),
          ),
        ]),
      });
      if (response.ok && (await response.json()).ready === true) return;
    } catch {
      signal.throwIfAborted();
      // Cold starts can return HTML, drop connections, or temporarily fail CORS.
    }
    await pause(signal);
  }
  throw new Error(startupMessage);
}

export async function sendChat(
  payload: { message: string; history: { role: string; content: string }[] },
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void,
  onConnecting: (connecting: boolean) => void = () => {},
) {
  const deadline = Date.now() + 90000;
  const body = JSON.stringify(payload);
  onConnecting(true);
  await waitUntilReady(signal, deadline);
  onConnecting(false);
  for (let attempt = 0; ; attempt++) {
    let receivedText = false;
    let retryable = true;
    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body,
      });
      if (!response.ok) {
        retryable = transientStatuses.has(response.status);
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "The assistant is unavailable. Please try again.",
        );
      }
      if (
        !response.body ||
        !response.headers.get("content-type")?.includes("text/event-stream")
      )
        throw new Error(
          "The assistant is still connecting. Please try again shortly.",
        );
      await consumeStream(response.body, (event) => {
        if (event.event === "token" && event.data.text) receivedText = true;
        onEvent(event);
      });
      return;
    } catch (error) {
      signal.throwIfAborted();
      // Never replay a partial answer, validation error, or rate-limited request.
      if (receivedText || !retryable || attempt >= 2 || Date.now() >= deadline)
        throw error;
      onConnecting(true);
      await pause(signal);
      await waitUntilReady(signal, deadline);
      onConnecting(false);
    }
  }
}
