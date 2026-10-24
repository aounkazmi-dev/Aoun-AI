import type { Conversation, Message } from "./types";
export const STORAGE_KEY = "aounos.conversations.v1";
export function restore(raw: string | null): Conversation[] {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (c): c is Conversation =>
          c &&
          typeof c.id === "string" &&
          typeof c.title === "string" &&
          typeof c.updatedAt === "number" &&
          Array.isArray(c.messages),
      )
      .slice(0, 30)
      .map((c) => ({
        ...c,
        title: c.title.slice(0, 80),
        messages: c.messages
          .filter(
            (m: Message) =>
              m &&
              typeof m.id === "string" &&
              ["user", "assistant"].includes(m.role) &&
              typeof m.content === "string",
          )
          .slice(-100)
          .map((m) => ({
            ...m,
            content: m.content.slice(0, 24000),
            status: m.status || "stopped",
            sources: Array.isArray(m.sources)
              ? m.sources.filter(
                  (s) =>
                    s &&
                    [
                      "id",
                      "title",
                      "section",
                      "source",
                      "url",
                      "excerpt",
                    ].every((k) => typeof s[k as keyof typeof s] === "string"),
                )
              : [],
          })),
      }));
  } catch {
    return [];
  }
}
export function loadConversations(): Conversation[] {
  try {
    return restore(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}
export function saveConversations(items: Conversation[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      items
        .slice(0, 30)
        .map((c) => ({ ...c, messages: c.messages.slice(-100) })),
    ),
  );
}
