import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { IMessage } from "@app/types";
import { getMessages, streamChat } from "../api/client";

export function useChat(sessionId: string | null) {
  const queryClient = useQueryClient();
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<IMessage[]>([]);
  const abortRef = useRef(false);

  const { data: history = [] } = useQuery({
    queryKey: ["messages", sessionId],
    queryFn: () => getMessages(sessionId!),
    enabled: !!sessionId,
  });

  const messages = [...history, ...pendingMessages];

  const send = useCallback(
    async (content: string) => {
      if (!sessionId || streaming) return;
      setError(null);
      abortRef.current = false;

      const userMsg: IMessage = {
        id: crypto.randomUUID(),
        sessionId,
        role: "user",
        content,
        status: "pending",
        createdAt: new Date(),
      };
      const placeholderMsg: IMessage = {
        id: crypto.randomUUID(),
        sessionId,
        role: "llm",
        content: "",
        status: "pending",
        createdAt: new Date(),
      };

      setPendingMessages([userMsg, placeholderMsg]);
      setStreaming(true);

      try {
        for await (const chunk of streamChat(sessionId, content)) {
          if (abortRef.current) break;
          setPendingMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last?.content + chunk };
            return copy;
          });
        }
        await queryClient.invalidateQueries({
          queryKey: ["messages", sessionId],
        });
        await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setPendingMessages([]);
        setStreaming(false);
      }
    },
    [sessionId, streaming, queryClient],
  );

  return { messages, streaming, error, send };
}
