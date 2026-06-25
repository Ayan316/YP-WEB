"use client";

import { useState } from "react";
import { formatTimeOnly } from "@/helpers/dateFormatter";
import styles from "../../moduleCss/messages.module.css";
import { X } from "lucide-react";

type Props = {
  type: "sent" | "received";
  text?: string;
  media_urls?: string | null;
  created_at?: string;
  sending?: boolean;
};

export default function MessageBubble({
  type,
  text,
  media_urls,
  created_at,
  sending,
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  return (
    <>
      <div
        className={`max-w-[65%] w-fit ${
          type === "sent"
            ? `${styles.message_bubble_sent} ml-auto`
            : `${styles.message_bubble_received} mr-auto`
        }`}
      >
        {/* Image sits on top, text below — both inside the same bubble */}
        {media_urls && !text && (
          <img
            src={media_urls}
            alt="Message media"
            className="rounded-lg max-w-full cursor-pointer w-[200px] h-[200px] object-cover"
            onClick={() => setLightboxOpen(true)}
          />
        )}

        {(text || created_at) && (
          <div className="space-y-2 p-1">
            {text && (
              <div className={styles.message_bubble_text}>
                {media_urls && (
                  <img
                    src={media_urls}
                    alt="Message media"
                    className="rounded-lg max-w-full"
                    onClick={() => setLightboxOpen(true)}
                  />
                )}
                <p className={media_urls ? "mt-3" : undefined} style={{ whiteSpace: "pre-wrap" }}>{text}</p>
              </div>
            )}
            {sending ? (
              <p className={styles.message_bubble_time}>
                <span className="inline-flex items-center gap-1 text-[10px] opacity-70">
                  <svg
                    className="animate-spin h-3 w-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Sending...
                </span>
              </p>
            ) : created_at ? (
              <p className={styles.message_bubble_time}>
                {formatTimeOnly(created_at)}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && media_urls && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
            onClick={() => setLightboxOpen(false)}
          >
            <X size={22} className="cursor-pointer"/>
          </button>

          {/* Image — click on image itself won't close */}
          <img
            src={media_urls}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}