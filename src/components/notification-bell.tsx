"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth-client";

type Note = { id: string; type: string; title: string; body: string | null; href: string | null; createdAt: string; read: boolean };

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { headers: await authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 90000);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAll() {
    setItems((xs) => xs.map((x) => ({ ...x, read: true })));
    setUnread(0);
    await fetch("/api/notifications/read", { method: "POST", headers: await authHeaders({ "Content-Type": "application/json" }), body: "{}" }).catch(() => {});
  }

  async function openNote(n: Note) {
    setOpen(false);
    if (!n.read) {
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      fetch("/api/notifications/read", { method: "POST", headers: await authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ id: n.id }) }).catch(() => {});
    }
    if (n.href) router.push(n.href);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        className="relative rounded-lg p-2 text-cosmic/70 hover:bg-cosmic/5"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[17px] items-center justify-center rounded-full bg-ignition px-1 text-[10px] font-bold leading-[16px] text-pioneer">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-cosmic/10 bg-pioneer shadow-xl">
          <div className="flex items-center justify-between border-b border-cosmic/10 px-3 py-2">
            <p className="text-sm font-semibold text-cosmic">Notifications</p>
            {unread > 0 && <button onClick={markAll} className="text-xs font-medium text-ignition-ink hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-cosmic/60">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-cosmic/10">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => openNote(n)}
                      className={`block w-full px-3 py-2.5 text-left hover:bg-cosmic/[0.03] ${n.read ? "" : "bg-frontier/30"}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ignition" aria-hidden />}
                        <div className={`min-w-0 ${n.read ? "pl-4" : ""}`}>
                          <p className="text-sm font-medium text-cosmic">{n.title}</p>
                          {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-cosmic/70">{n.body}</p>}
                          <p className="mt-0.5 text-[11px] text-cosmic/50">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
