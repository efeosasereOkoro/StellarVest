"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KYC_DOCS, ID_TYPES, type Residency } from "@/lib/kyc";

type Doc = { id: string; kind: string | null; filename: string; uploadedAt: string };

const KYC_TONE: Record<string, "venture" | "pitch" | "ignition" | "neutral"> = {
  verified: "venture",
  submitted: "pitch",
  registered: "neutral",
  rejected: "ignition",
};

const selectCls =
  "w-full rounded-lg border bg-pioneer px-3 py-2 text-sm text-cosmic outline-none transition-colors focus:ring-2 focus:border-venture focus:ring-venture/30";

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [loaded, setLoaded] = useState(false);
  const [fullName, setFullName] = useState("");
  const [kyc, setKyc] = useState("registered");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // KYC intake
  const [residency, setResidency] = useState<Residency | "">("");
  const [nin, setNin] = useState("");
  const [address, setAddress] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [picked, setPicked] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const headers = await authHeaders();
        const [p, k] = await Promise.all([fetch("/api/profile", { headers }), fetch("/api/kyc", { headers })]);
        if (p.ok) {
          const { profile } = await p.json().catch(() => ({}));
          if (profile?.fullName) setFullName(profile.fullName);
        }
        if (k.ok) {
          const data = await k.json().catch(() => ({}));
          setDocs(data.documents ?? []);
          setKyc(data.kycStatus ?? "registered");
          setRejectionReason(data.rejectionReason ?? null);
          if (data.residency) setResidency(data.residency);
          setNin(data.nin ?? "");
          setAddress(data.residentialAddress ?? "");
          setIdType(data.idType ?? "");
          setIdNumber(data.idNumber ?? "");
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, [isPending, session, router]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNameError(null);
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ fullName }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setNameError(d.error ?? "Couldn't save. Please try again.");
      return;
    }
    setSaved(true);
  }

  const uploadedKinds = new Set(docs.map((d) => d.kind).filter(Boolean) as string[]);

  function clearErr(key: string) {
    setErrors((e) => {
      if (!e[key]) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  }

  async function submitKyc() {
    if (!residency) {
      setErrors({ residency: "Choose where you're based." });
      setSubmitError("Please provide the highlighted item(s).");
      return;
    }
    const errs: Record<string, string> = {};
    if (residency === "nigeria") {
      if (!nin.trim()) errs.nin = "Your NIN number is required.";
      if (!address.trim()) errs.residentialAddress = "Your residential address is required.";
    } else {
      if (!idType) errs.idType = "Choose your ID type.";
      if (!idNumber.trim()) errs.idNumber = "Your ID number is required.";
    }
    // Each required document needs either an existing upload or a newly picked file.
    for (const d of KYC_DOCS[residency]) {
      const hasFile = !!fileRefs.current[d.kind]?.files?.[0];
      if (!hasFile && !uploadedKinds.has(d.kind)) errs[d.kind] = `${d.label} is required.`;
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      setSubmitError("Please provide the highlighted item(s).");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Upload any newly picked files first (one request each — body limit).
      for (const d of KYC_DOCS[residency]) {
        const file = fileRefs.current[d.kind]?.files?.[0];
        if (!file) continue;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", d.kind);
        const up = await fetch("/api/kyc/document", { method: "POST", headers: await authHeaders(), body: fd });
        if (!up.ok) {
          const e = await up.json().catch(() => ({}));
          setSubmitError(`${d.label}: ${e.error ?? "upload failed"}`);
          setSubmitting(false);
          return;
        }
      }
      // Then submit the details for review.
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ residency, nin, residentialAddress: address, idType, idNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error ?? "Couldn't submit. Please try again.");
        setSubmitting(false);
        return;
      }
      // Refresh state from the server.
      const k = await fetch("/api/kyc", { headers: await authHeaders() });
      if (k.ok) {
        const d = await k.json().catch(() => ({}));
        setDocs(d.documents ?? []);
        setKyc(d.kycStatus ?? "submitted");
        setRejectionReason(null);
      } else {
        setKyc("submitted");
      }
      setPicked({});
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending || !session || !loaded) {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }

  const editable = kyc === "registered" || kyc === "rejected";

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <Link href="/dashboard" className="text-cosmic/60 underline">&larr; Dashboard</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Your profile</h1>
      <p className="mt-1 text-sm text-cosmic/60">
        Signed in as <span className="font-medium text-cosmic">{session.user.email}</span>
      </p>

      <Card className="mt-6">
        <form onSubmit={saveName} className="space-y-4">
          <Field label="Full name" type="text" value={fullName} required onChange={(e) => setFullName(e.target.value)} />
          {nameError && <p className="text-sm text-danger">{nameError}</p>}
          {saved && <p className="text-sm text-deep-frontier">Saved.</p>}
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
        </form>
      </Card>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-cosmic">Identity verification (KYC)</span>
          <Badge tone={KYC_TONE[kyc] ?? "neutral"}>{kyc}</Badge>
        </div>

        {kyc === "verified" && (
          <p className="text-sm text-cosmic/70">Your identity is verified — you&rsquo;re all set to invest.</p>
        )}
        {kyc === "submitted" && (
          <p className="text-sm text-cosmic/70">Your documents are under review. Your status updates here once the StarSector8 team completes it.</p>
        )}
        {kyc === "rejected" && rejectionReason && (
          <div className="mb-4 rounded-lg bg-ignition/10 p-3 text-sm text-ignition-ink">
            Your verification was rejected. Reason: {rejectionReason}. Please review the details below and resubmit.
          </div>
        )}

        {editable && (
          <div className="space-y-5">
            <p className="text-sm text-cosmic/70">
              Your documents are stored privately and used only to verify your identity. Files: JPG, PNG, WebP, or PDF, max 4MB each.
            </p>

            {/* Residency */}
            <div>
              <span className="mb-1 block text-sm font-medium text-cosmic/80">Where are you based?</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Where are you based?">
                {[
                  { v: "nigeria", l: "I live in Nigeria" },
                  { v: "diaspora", l: "I live outside Nigeria" },
                ].map((r) => {
                  const active = residency === r.v;
                  return (
                    <button
                      key={r.v}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => { setResidency(r.v as Residency); clearErr("residency"); }}
                      className={`rounded-xl border p-3 text-left text-sm font-medium transition-colors ${
                        active ? "border-cosmic bg-cosmic/[0.04] text-cosmic" : "border-cosmic/15 text-cosmic/80 hover:bg-cosmic/5"
                      }`}
                    >
                      {r.l}
                    </button>
                  );
                })}
              </div>
              {errors.residency && <p className="mt-1 text-sm text-danger">{errors.residency}</p>}
            </div>

            {residency && (
              <>
                {/* Text fields */}
                {residency === "nigeria" ? (
                  <>
                    <Field label="NIN number" value={nin} error={errors.nin}
                      onChange={(e) => { setNin(e.target.value); clearErr("nin"); }} />
                    <Field label="Residential address" value={address} error={errors.residentialAddress}
                      onChange={(e) => { setAddress(e.target.value); clearErr("residentialAddress"); }} />
                  </>
                ) : (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-cosmic/80">ID type</span>
                      <select
                        value={idType}
                        onChange={(e) => { setIdType(e.target.value); clearErr("idType"); }}
                        aria-invalid={errors.idType ? true : undefined}
                        className={`${selectCls} ${errors.idType ? "border-danger focus:border-danger focus:ring-danger/30" : "border-cosmic/15"}`}
                      >
                        <option value="">Select…</option>
                        {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      {errors.idType && <span className="mt-1 block text-sm text-danger">{errors.idType}</span>}
                    </label>
                    <Field label="ID number" value={idNumber} error={errors.idNumber}
                      onChange={(e) => { setIdNumber(e.target.value); clearErr("idNumber"); }} />
                  </>
                )}

                {/* Document slots */}
                <div className="space-y-4">
                  {KYC_DOCS[residency].map((d) => {
                    const already = docs.find((x) => x.kind === d.kind);
                    return (
                      <div key={d.kind}>
                        <span className="mb-1 block text-sm font-medium text-cosmic/80">{d.label}</span>
                        <input
                          ref={(el) => { fileRefs.current[d.kind] = el; }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={(e) => { setPicked((p) => ({ ...p, [d.kind]: e.target.files?.[0]?.name ?? "" })); clearErr(d.kind); }}
                          className={`block w-full rounded-lg border text-sm text-cosmic/70 file:mr-3 file:rounded-lg file:border-0 file:bg-cosmic file:px-3 file:py-2 file:text-sm file:font-medium file:text-pioneer hover:file:bg-cosmic/90 ${
                            errors[d.kind] ? "border-danger" : "border-cosmic/15"
                          }`}
                        />
                        {picked[d.kind]
                          ? <p className="mt-1 truncate text-sm text-cosmic/70">Selected: {picked[d.kind]}</p>
                          : already && <p className="mt-1 truncate text-sm text-deep-frontier">Uploaded: {already.filename}</p>}
                        {errors[d.kind] && <p className="mt-1 text-sm text-danger">{errors[d.kind]}</p>}
                      </div>
                    );
                  })}
                </div>

                {submitError && <p className="text-sm text-danger">{submitError}</p>}
                <Button variant="accent" disabled={submitting} onClick={submitKyc}>
                  {submitting ? "Submitting…" : "Submit for verification"}
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </main>
  );
}
