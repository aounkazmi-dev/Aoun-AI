import { describe, it, expect } from "vitest";
import { consumeStream } from "./stream";
import { restore } from "./storage";

const stream = (text: string, size = 1) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const bytes = new TextEncoder().encode(text);
      for (let i = 0; i < bytes.length; i += size)
        controller.enqueue(bytes.slice(i, i + size));
      controller.close();
    },
  });
describe("SSE transport", () => {
  it("preserves unicode across arbitrary byte boundaries", async () => {
    const events: string[] = [];
    await consumeStream(
      stream(
        'event: token\ndata: {"text":"Hello 👋"}\n\nevent: done\ndata: {}\n\n',
      ),
      (e) => {
        if (e.event === "token") events.push(String(e.data.text));
      },
    );
    expect(events).toEqual(["Hello 👋"]);
  });
  it("handles CRLF frames", async () => {
    await expect(
      consumeStream(stream("event: done\r\ndata: {}\r\n\r\n"), () => {}),
    ).resolves.toBeUndefined();
  });
  it("rejects a truncated stream", async () => {
    await expect(
      consumeStream(
        stream('event: token\ndata: {"text":"Partial"}\n\n'),
        () => {},
      ),
    ).rejects.toThrow("before the answer finished");
  });
  it("propagates explicit error events", async () => {
    await expect(
      consumeStream(
        stream('event: error\ndata: {"message":"Retry"}\n\n'),
        () => {},
      ),
    ).rejects.toThrow("Retry");
  });
});
describe("local history", () => {
  it("recovers from corrupt and invalid storage", () => {
    expect(restore("{bad")).toEqual([]);
    expect(restore('{"not":"array"}')).toEqual([]);
    expect(restore("[null,4]")).toEqual([]);
  });
  it("marks unfinished restored messages as stopped and rejects invalid sources", () => {
    const result = restore(
      JSON.stringify([
        {
          id: "1",
          title: "Chat",
          updatedAt: 1,
          messages: [
            { id: "m", role: "assistant", content: "Partial", sources: [null] },
          ],
        },
      ]),
    );
    expect(result[0].messages[0].status).toBe("stopped");
    expect(result[0].messages[0].sources).toEqual([]);
  });
});
