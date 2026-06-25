"use client";

import { useState } from "react";
import { Button } from "./button";

type Variant = "primary" | "accent" | "outline";

type Props = {
  /** Runs when the user confirms. The dialog closes after it resolves. */
  onConfirm: () => void | Promise<void>;
  children: React.ReactNode; // trigger button label
  title: string;
  message: string;
  confirmLabel?: string;
  /** Visual style for both the trigger and the confirm button. */
  variant?: Variant;
  disabled?: boolean;
  className?: string;
};

/**
 * A button that opens a small confirmation dialog before running an
 * irreversible action (publish, decline, mark paid, confirm funds, cancel).
 * The dialog spells out the consequence so the action is deliberate.
 */
export function ConfirmButton({
  onConfirm,
  children,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "primary",
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant={variant} disabled={disabled} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => !busy && setOpen(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-pioneer p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-semibold text-cosmic">{title}</h2>
            <p className="mt-2 text-sm text-cosmic/70">{message}</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant={variant} disabled={busy} onClick={go} autoFocus>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
