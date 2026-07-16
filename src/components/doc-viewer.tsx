"use client";

import { useEffect, useRef, useState } from "react";

// In-app, view-only document viewer for reviewers (B-062). Renders the doc
// inline (image or PDF), overlays a repeating watermark of the reviewer's
// identity + timestamp, disables download/right-click. Note: screenshots /
// determined extraction can't be blocked on the web — the watermark makes any
// leak traceable.
//
// PDFs render through pdf.js onto canvases (B-068): mobile browsers (iOS
// Safari, Android Chrome) don't display PDFs inside iframes at all, and
// canvases also drop the native PDF toolbar (print/download) everywhere.

// Draw every page of a PDF blob onto stacked canvases, fitted to the
// container width and sharpened for high-DPI screens.
function PdfPages({ blob, onError }: { blob: Blob; onError: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        const doc = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
        const host = hostRef.current;
        if (cancelled || !host) return;
        host.innerHTML = "";
        const width = Math.max((host.clientWidth || 640) - 16, 280);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const scale = width / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = "mx-auto mb-3 block max-w-full bg-white shadow-sm";
          await page.render({
            canvas,
            viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          }).promise;
          if (cancelled) return;
          host.appendChild(canvas);
        }
        if (!cancelled) setRendering(false);
      } catch {
        if (!cancelled) onError();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  return (
    <div className="p-2">
      {rendering && <p className="p-8 text-center text-sm text-cosmic/60">Preparing pages…</p>}
      <div ref={hostRef} />
    </div>
  );
}

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
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(loadBlob);
  loadRef.current = loadBlob;

  useEffect(() => {
    if (!open || !docKey) return;
    let objUrl: string | null = null;
    let cancelled = false;
    setError(null);
    setBlob(null);
    setUrl(null);
    (async () => {
      const b = await loadRef.current().catch(() => null);
      if (cancelled) return;
      if (!b) return setError("Couldn't load the document.");
      setBlob(b);
      // Images render via an object URL; PDFs consume the blob directly.
      if (b.type.startsWith("image/")) {
        objUrl = URL.createObjectURL(b);
        setUrl(objUrl);
      }
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
  const isImage = blob?.type.startsWith("image/") ?? false;
  const noContext = (e: React.MouseEvent) => e.preventDefault();

  // Tiled watermark cells — enough to cover a long multi-page PDF stack.
  const cells = Array.from({ length: 240 });

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

        <div className="flex-1 overflow-auto bg-cosmic/[0.03]" onContextMenu={noContext} style={{ userSelect: "none" }}>
          {/* relative wrapper grows with the content so the watermark tiles
              cover the full scroll height, not just the first screenful */}
          <div className="relative min-h-full w-full">
            {error ? (
              <p className="p-8 text-center text-sm text-danger">{error}</p>
            ) : !blob ? (
              <p className="p-8 text-center text-sm text-cosmic/60">Loading…</p>
            ) : isImage ? (
              url && <img src={url} alt={title} draggable={false} className="mx-auto block max-w-full select-none" />
            ) : (
              <PdfPages blob={blob} onError={() => setError("Couldn't display this PDF.")} />
            )}

            {/* Watermark overlay — reviewer identity + time, tiled + rotated. */}
            {blob && !error && (
              <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-wrap content-start gap-x-16 gap-y-14 overflow-hidden p-6" style={{ transform: "rotate(-24deg) scale(1.4)", transformOrigin: "center" }}>
                {cells.map((_, i) => (
                  <span key={i} className="whitespace-nowrap text-[11px] font-semibold text-cosmic" style={{ opacity: 0.1 }}>
                    {watermark}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-cosmic/10 px-4 py-2 text-center text-xs text-cosmic/60">
          View-only — please don’t download or share. Watermarked with your identity for traceability.
        </footer>
      </div>
    </div>
  );
}
