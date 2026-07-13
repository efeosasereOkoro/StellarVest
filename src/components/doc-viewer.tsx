"use client";

import { useEffect, useRef, useState } from "react";

// In-app, view-only document viewer for reviewers (B-062). Renders the doc
// inline (image or PDF), overlays a repeating watermark of the reviewer's
// identity + timestamp, disables download/right-click, and hides the PDF
// toolbar. Note: screenshots / determined extraction can't be blocked on the
// web — the watermark makes any leak traceable.
export function DocViewer({
  open,
  onClose,
  title,
  watermark,
  docKey,
  loadBlob,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  watermark: string;
  docKey: string | null;
  loadBlob: () => Promise<Blob | null>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(loadBlob);
  loadRef.current = loadBlob;

  useEffect(() => {
    if (!open || !docKey) return;
    let objUrl: string | null = null;
    let cancelled = false;
    setError(null);
    setUrl(null);
    (async () => {
      const blob = await loadRef.current().catch(() => null);
      if (cancelled) return;
      if (!blob) return setError("Couldn't load the document.");
      objUrl = URL.createObjectURL(blob);
      setType(blob.type || "");
      setUrl(objUrl);
    })();
    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [open, docKey]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const isImage = type.startsWith("image/");
  const noContext = (e: React.MouseEvent) => e.preventDefault();

  // Tiled watermark cells.
  const cells = Array.from({ length: 60 });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Document: ${title}`}
      className="fixed inset-0 z-50 flex flex-col bg-cosmic/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-pioneer shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-cosmic/10 px-4 py-3">
          <p className="min-w-0 truncate font-medium text-cosmic">{title}</p>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-cosmic/70 hover:bg-cosmic/5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="relative flex-1 overflow-auto bg-cosmic/[0.03]" onContextMenu={noContext} style={{ userSelect: "none" }}>
          {error ? (
            <p className="p-8 text-center text-sm text-danger">{error}</p>
          ) : !url ? (
            <p className="p-8 text-center text-sm text-cosmic/60">Loading…</p>
          ) : isImage ? (
            <img src={url} alt={title} draggable={false} className="mx-auto block max-w-full select-none" />
          ) : (
            <iframe src={`${url}#toolbar=0&navpanes=0`} title={title} className="h-full w-full" />
          )}

          {/* Watermark overlay — reviewer identity + time, tiled + rotated. */}
          {url && (
            <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-wrap content-start gap-x-16 gap-y-14 overflow-hidden p-6" style={{ transform: "rotate(-24deg) scale(1.4)", transformOrigin: "center" }}>
              {cells.map((_, i) => (
                <span key={i} className="whitespace-nowrap text-[11px] font-semibold text-cosmic" style={{ opacity: 0.1 }}>
                  {watermark}
                </span>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-cosmic/10 px-4 py-2 text-center text-xs text-cosmic/60">
          View-only — please don’t download or share. Watermarked with your identity for traceability.
        </footer>
      </div>
    </div>
  );
}
