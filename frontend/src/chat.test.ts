import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sendChat } from "./chat";

const payload = { message: "Who is Aoun?", history: [] };
const ready = () => Response.json({ ready: true });
const answer = (
  frames = 'event: token\ndata: {"text":"Aoun is a builder."}\n\nevent: done\ndata: {}\n\n',
) => new Response(frames, { headers: { "Content-Type": "text/event-stream" } });
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

it("waits through host loading pages, network failures, and not-ready responses before posting", async () => {
  fetchMock
    .mockResolvedValueOnce(new Response("Waking up…"))
    .mockRejectedValueOnce(new TypeError("Failed to fetch"))
    .mockResolvedValueOnce(Response.json({ ready: false }, { status: 503 }))
    .mockResolvedValueOnce(ready())
    .mockResolvedValueOnce(answer());
  const onEvent = vi.fn();
  const result = sendChat(payload, new AbortController().signal, onEvent);
  await vi.runAllTimersAsync();
  await result;
  expect(
    fetchMock.mock.calls.slice(0, 4).every(([url]) => url === "/api/ready"),
  ).toBe(true);
  expect(
    fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(1);
  expect(onEvent).toHaveBeenCalledWith({ event: "done", data: {} });
});

it.each([502, 503, 504])(
  "recovers from a transient %s without changing the prompt",
  async (status) => {
    fetchMock
      .mockResolvedValueOnce(ready())
      .mockResolvedValueOnce(new Response("Starting", { status }))
      .mockResolvedValueOnce(ready())
      .mockResolvedValueOnce(answer());
    const result = sendChat(payload, new AbortController().signal, vi.fn());
    await vi.runAllTimersAsync();
    await result;
    const posts = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(posts).toHaveLength(2);
    expect(posts.map(([, init]) => init?.body)).toEqual([
      JSON.stringify(payload),
      JSON.stringify(payload),
    ]);
  },
);

it("recovers from a provider failure before the first token", async () => {
  fetchMock
    .mockResolvedValueOnce(ready())
    .mockResolvedValueOnce(
      answer('event: error\ndata: {"message":"Interrupted"}\n\n'),
    )
    .mockResolvedValueOnce(ready())
    .mockResolvedValueOnce(answer());
  const result = sendChat(payload, new AbortController().signal, vi.fn());
  await vi.runAllTimersAsync();
  await expect(result).resolves.toBeUndefined();
});

it("does not replay a partially streamed answer", async () => {
  fetchMock
    .mockResolvedValueOnce(ready())
    .mockResolvedValueOnce(
      answer(
        'event: token\ndata: {"text":"Partial"}\n\nevent: error\ndata: {"message":"Interrupted"}\n\n',
      ),
    );
  await expect(
    sendChat(payload, new AbortController().signal, vi.fn()),
  ).rejects.toThrow("Interrupted");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it.each([400, 422, 429])("does not retry a %s response", async (status) => {
  fetchMock
    .mockResolvedValueOnce(ready())
    .mockResolvedValueOnce(
      Response.json({ detail: "Request rejected" }, { status }),
    );
  await expect(
    sendChat(payload, new AbortController().signal, vi.fn()),
  ).rejects.toThrow("Request rejected");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("lets Stop cancel the startup wait without sending a prompt", async () => {
  const controller = new AbortController();
  fetchMock.mockResolvedValue(Response.json({ ready: false }, { status: 503 }));
  const result = sendChat(payload, controller.signal, vi.fn());
  const assertion = expect(result).rejects.toMatchObject({
    name: "AbortError",
  });
  await vi.advanceTimersByTimeAsync(500);
  controller.abort();
  await assertion;
  await vi.runAllTimersAsync();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("bounds an unavailable service's startup wait", async () => {
  fetchMock.mockResolvedValue(Response.json({ ready: false }, { status: 503 }));
  const result = sendChat(payload, new AbortController().signal, vi.fn());
  const assertion = expect(result).rejects.toThrow("taking too long to start");
  await vi.advanceTimersByTimeAsync(91000);
  await assertion;
  expect(fetchMock.mock.calls.every(([url]) => url === "/api/ready")).toBe(
    true,
  );
});

it("limits repeated chat failures to three attempts", async () => {
  fetchMock.mockImplementation(async (url) =>
    url === "/api/ready"
      ? ready()
      : new Response("Unavailable", { status: 503 }),
  );
  const result = sendChat(payload, new AbortController().signal, vi.fn());
  const assertion = expect(result).rejects.toThrow("unavailable");
  await vi.runAllTimersAsync();
  await assertion;
  expect(
    fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(3);
});
