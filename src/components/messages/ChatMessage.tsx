"use client";

import MessageBubble from "./MessageBubble";
import styles from "../../moduleCss/messages.module.css";
import { useEffect, useRef } from "react";
import InitialMessages from "./InitialMessage";
import { useTheme } from "@/context/ThemeContext";

type Props = {
  messages: any[];
  chatUserId: string;
};

export default function ChatMessages({ messages, chatUserId }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Auto scroll when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className={`${styles.message_main_section_content} flex-1 overflow-y-auto my-2.5 mr-2 pr-2 pl-4 space-y-6`}
      style={{
        background: isLight ? "#FFFFF" : "",
      }}
    >
      {messages.length === 0 ? (
        <>
          {/* Friendly fallback messages */}
          <InitialMessages />
        </>
      ) : (
        messages.map((msg: any) => (
          <MessageBubble
            key={msg.id}
            type={msg.users?.id === chatUserId ? "received" : "sent"}
            text={msg.text_body}
            media_urls={msg.media_urls}
            created_at={msg.created_at}
            sending={msg._sending}
          />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}