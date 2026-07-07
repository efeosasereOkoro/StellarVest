"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Doc = { id: string; filename: string; uploadedAt: string };

const KYC_TONE: Record<string, "venture" | "pitch" | "ignition" | "neutral"> = {
  verified: "venture",
  submitted: "pitch",
  registered: "neutral",
  rejected: "ignition",
};

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loaded, setLoaded] = useState(false);
  const [fullName, setFullName] = useState("");
  const [kyc, setKyc] = useState("registered");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const headers = await authHeaders();
        const [p, k] = await Promise.all([
          fetch("/api/profile", { headers }),
          fetch("/api/kyc", { headers }),
        ]);
        if (p.ok) {
          const { profile } = await p.json().catch(() => ({}));
          if (profile?.fullName) setFullName(profile.fullName);
        }
        if (k.ok) {
          const data = await k.json().catch(() => ({}));
          setDocs(data.documents ?? []);
          setKyc(data.kycStatus ?? "registered");
          setRejectionReason(data.rejectionReason ?? null);
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

  async function uploadDoc(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/kyc", { method: "POST", headers: await authHeaders(), body });
    setUploading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setUploadError(d.error ?? "Upload failed. Please try again.");
      return;
    }
    const { document, kycStatus } = await res.json();
    setDocs((prev) => [document, ...prev]);
    setKyc(kycStatus ?? "submitted");
    setRejectionReason(null);
    if (fileRef.current) fileRef.current.value = "";
    setFileName("");
  }

  if (isPending || !session || !loaded) {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <Link href="/dashboard" className="text-cosmic/60 underline">&larr; Dashboard</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Your profile</h1>
      <p className="mt-1 text-sm text-cosmic/60">
        Signed in as <span className="font-medium text-cosmic">{session.user.email}</span>
      </p>

      <Card className="mt-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-medium text-cosmic">KYC status</span>
          <Badge tone={KYC_TONE[kyc] ?? "neutral"}>{kyc}</Badge>
        </div>
        {kyc === "rejected" && (
          <div className="mb-5 rounded-lg bg-ignition/10 p-3 text-sm text-ignition-ink">
            Your verification was rejected.
            {rejectionReason ? ` Reason: ${rejectionReason}.` : ""} Please upload updated documents below.
          </div>
        )}
        <form onSubmit={saveName} className="space-y-4">
          <Field label="Full name" type="text" value={fullName} required onChange={(e) => setFullName(e.target.value)} />
          {nameError && <p className="text-sm text-danger">{nameError}</p>}
          {saved && <p className="text-sm text-deep-frontier">Saved.</p>}
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
        </form>
      </Card>

      <Card className="mt-6">
        <p className="text-sm font-medium text-cosmic">Identity documents</p>
        <p className="mt-1 text-sm text-cosmic/60">
          Upload your ID for verification (JPG, PNG, WebP, or PDF — max 4MB). Uploading submits your account for review.
        </p>
        <p className="mt-1 text-sm text-cosmic/70">
          Your documents are stored privately and used only to verify your identity.
        </p>

        <div className="mt-3 rounded-lg border border-cosmic/10 bg-frontier/30 p-3 text-sm text-cosmic/80">
          <p className="font-medium text-cosmic">What to provide</p>
          <p className="mt-1">
            <span className="font-medium">In Nigeria:</span> a clear photograph, your NIN, your residential
            address, and a utility bill as proof of that address.
          </p>
          <p className="mt-1">
            <span className="font-medium">In the diaspora:</span> your NIN and an international passport
            (or your country&rsquo;s highest-assurance ID).
          </p>
        </div>

        <form onSubmit={uploadDoc} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            className="block w-full text-sm text-cosmic/70 file:mr-3 file:rounded-lg file:border-0 file:bg-cosmic file:px-3 file:py-2 file:text-sm file:font-medium file:text-pioneer hover:file:bg-cosmic/90"
          />
          <Button type="submit" variant="accent" disabled={uploading} className="w-full sm:w-auto">
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </form>
        {fileName && <p className="mt-2 truncate text-sm text-cosmic/70">Selected: {fileName}</p>}
        {uploadError && <p className="mt-2 text-sm text-danger">{uploadError}</p>}

        {docs.length > 0 && (
          <ul className="mt-5 divide-y divide-cosmic/10 border-t border-cosmic/10">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-cosmic">{d.filename}</span>
                <span className="text-cosmic/70">{new Date(d.uploadedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
