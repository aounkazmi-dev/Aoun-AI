export type Source = {
  id: string;
  title: string;
  section: string;
  source: string;
  url: string;
  excerpt: string;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  status?: "complete" | "error" | "stopped";
  mode?: string;
};
export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};
export type StreamEvent = { event: string; data: Record<string, unknown> };
