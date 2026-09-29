import { useState } from "react";
import {
  streamChat,
  type ChatMessage,
} from "../api/chat.api";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  async function sendMessage(
    content: string,
    mode: string,
  ) {
    const trimmed = content.trim();

    if (!trimmed || isStreaming) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages([
      ...nextMessages,
      {
        role: "assistant",
        content: "",
      },
    ]);

    setIsStreaming(true);

    await streamChat({
      messages: nextMessages,
      mode,

      onToken: (token) => {
        setMessages((current) => {
          const updated = [...current];

          const last = updated.length - 1;

          updated[last] = {
            ...updated[last],
            content: updated[last].content + token,
          };

          return updated;
        });
      },

      onDone: () => {
        setIsStreaming(false);
      },

      onError: (message) => {
        setMessages((current) => {
          const updated = [...current];

          const last = updated.length - 1;

          updated[last] = {
            role: "assistant",
            content: `⚠️ ${message}`,
          };

          return updated;
        });

        setIsStreaming(false);
      },
    });
  }

  return {
    messages,
    isStreaming,
    sendMessage,
  };
}
