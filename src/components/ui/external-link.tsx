import { ReactNode } from "react";

// Clickable external links for user-entered URLs (B-069). Founders paste
// websites/LinkedIn as bare domains ("acme.ng") as often as full URLs, so
// normalize to https:// — otherwise the browser treats it as a relative path.
export function toHref(raw: string): string {
  const s = raw.trim();
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export function ExternalLink({ href, children, className = "" }: { href: string; children?: ReactNode; className?: string }) {
  return (
    <a
      href={toHref(href)}
      target="_blank"
      rel="noreferrer"
      className={`font-medium text-ignition-ink underline ${className}`}
    >
      {children ?? href}
    </a>
  );
}

// URLs inside free text (deal descriptions/terms, update bodies) become
// clickable. Matches http(s):// and www.-prefixed links; trailing sentence
// punctuation stays outside the link.
const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;!?)"'\]])/gi;

export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <ExternalLink key={i} href={part} className="break-all" />
        ) : (
          part
        )
      )}
    </>
  );
}
