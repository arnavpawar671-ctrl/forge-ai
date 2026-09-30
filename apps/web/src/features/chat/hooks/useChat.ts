import { useState } from "react";
import {
  streamChat,
  type ChatMessage,
  type ConversationCreatedPayload,
} from "../api/chat.api";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  function replaceMessages(nextMessages: ChatMessage[]) {
    setMessages(nextMessages);
  }

  function clearMessages() {
    setMessages([]);
  }

  async function sendMessage(
    content: string,
    mode: string,
    conversationId: string | null,
    onConversationCreated?: (
      conversation: ConversationCreatedPayload,
    ) => void,
    onDone?: (conversationId?: string) => void,
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
      conversationId,
      onConversationCreated,

      onToken: (token) => {
        setMessages((current) => {
          const updated = [...current];
          const last = updated.length - 1;

          if (last < 0) {
            return current;
          }

          updated[last] = {
            ...updated[last],
            content: updated[last].content + token,
          };

          return updated;
        });
      },

      onDone: (id) => {
        setIsStreaming(false);
        onDone?.(id);
      },

      onError: (errorMessage) => {
        setMessages((current) => {
          const updated = [...current];
          const last = updated.length - 1;

          if (last < 0) {
            return [
              {
                role: "assistant",
                content: "⚠️ " + errorMessage,
              },
            ];
          }

          updated[last] = {
            role: "assistant",
            content: "⚠️ " + errorMessage,
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
    replaceMessages,
    clearMessages,
  };
}
