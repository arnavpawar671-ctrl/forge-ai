import { supabase } from "../../../lib/supabase";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ConversationCreatedPayload {
  id: string;
  title: string;
  mode: string;
  personality: string;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface StreamOptions {
  messages: ChatMessage[];
  mode: string;
  conversationId?: string | null;
  onToken: (token: string) => void;
  onConversationCreated?: (
    conversation: ConversationCreatedPayload,
  ) => void;
  onDone: (conversationId?: string) => void;
  onError: (message: string) => void;
}

const API_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function streamChat({
  messages,
  mode,
  conversationId,
  onToken,
  onConversationCreated,
  onDone,
  onError,
}: StreamOptions): Promise<void> {
  let completed = false;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("You must be signed in to use ForgeAI.");
    }

    const response = await fetch(
      API_URL + "/api/v1/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({
          messages,
          mode,
          conversation_id: conversationId ?? null,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        errorText || "Chat request failed.",
      );
    }

    if (!response.body) {
      throw new Error(
        "Streaming is not supported by this response.",
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, {
        stream: true,
      });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const line = event
          .split("\n")
          .find((item) => item.startsWith("data:"));

        if (!line) {
          continue;
        }

        const json = line.slice(5).trim();

        if (!json) {
          continue;
        }

        const payload = JSON.parse(json);

        if (payload.type === "conversation") {
          onConversationCreated?.(payload.conversation);
        }

        if (payload.type === "token") {
          onToken(payload.content);
        }

        if (payload.type === "done") {
          completed = true;
          onDone(payload.conversation_id);
        }

        if (payload.type === "error") {
          onError(payload.message);
        }
      }
    }

    if (!completed) {
      onDone(conversationId ?? undefined);
    }
  } catch (error) {
    onError(
      error instanceof Error
        ? error.message
        : "Something went wrong.",
    );
  }
}
