import type { StreamEvent } from "./types";

export async function consumeStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let completed = false;
  function process() {
    pending = pending.replace(/\r\n/g, "\n");
    let end: number;
    while ((end = pending.indexOf("\n\n")) !== -1) {
      const frame = pending.slice(0, end);
      pending = pending.slice(end + 2);
      const event =
        frame
          .split("\n")
          .find((line) => line.startsWith("event:"))
          ?.slice(6)
          .trim() || "message";
      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      const parsed = JSON.parse(data) as Record<string, unknown>;
      if (event === "error")
        throw new Error(
          String(parsed.message || "The response was interrupted."),
        );
      if (event === "done") completed = true;
      onEvent({ event, data: parsed });
    }
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        pending += decoder.decode();
        process();
        break;
      }
      pending += decoder.decode(value, { stream: true });
      process();
    }
    if (!completed)
      throw new Error(
        "The connection closed before the answer finished. Please retry.",
      );
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
