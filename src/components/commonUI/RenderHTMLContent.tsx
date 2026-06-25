import { useMemo } from "react";
import DOMPurify from "dompurify";
import styles from "../../moduleCss/Renderhtmlcontent.module.css";

interface Props {
  html?: string;
  className?: string;
}

export function RenderHtmlContent({ html, className = "" }: Props) {
  const sanitizedHtml = useMemo(() => {
    if (!html?.trim()) return ""
    if (typeof window === "undefined") return ""

    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node instanceof HTMLElement && node.style) {
        node.style.removeProperty("color")
        node.style.removeProperty("background-color")
        node.style.removeProperty("background")
        if (!node.getAttribute("style")?.trim()) {
          node.removeAttribute("style")
        }
      }
    })

    const clean = DOMPurify.sanitize(html)
    DOMPurify.removeHook("afterSanitizeAttributes")
    return clean
  }, [html])

  if (!sanitizedHtml) return null;

  return (
    <div
      className={`${styles.htmlContent} ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}