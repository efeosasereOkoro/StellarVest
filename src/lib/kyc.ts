// KYC intake rules (B-050). Shared by the investor form (client) and the
// upload/submit routes (server) so the required set is defined once.

export type Residency = "nigeria" | "diaspora";

// The documents required for each residency, in display order.
export const KYC_DOCS: Record<Residency, { kind: string; label: string }[]> = {
  nigeria: [
    { kind: "photograph", label: "Photograph" },
    { kind: "nin_doc", label: "Photo of your NIN slip or card" },
    { kind: "utility_bill", label: "Utility bill (proof of address)" },
  ],
  diaspora: [
    { kind: "photograph", label: "Photograph" },
    { kind: "id_doc", label: "Photo of your ID document" },
  ],
};

// The text fields required for each residency.
export const KYC_FIELDS: Record<Residency, string[]> = {
  nigeria: ["nin", "residentialAddress"],
  diaspora: ["idType", "idNumber"],
};

export const ID_TYPES = [
  { value: "nin", label: "NIN" },
  { value: "passport", label: "International passport" },
  { value: "national_id", label: "National ID" },
];

export const DOC_KIND_LABEL: Record<string, string> = {
  photograph: "Photograph",
  nin_doc: "NIN slip/card",
  utility_bill: "Utility bill",
  id_doc: "ID document",
};

export function isResidency(v: unknown): v is Residency {
  return v === "nigeria" || v === "diaspora";
}

// Minimum contribution per residency, in naira (B3). Hard-enforced. Residency
// comes from KYC (B-050); unknown residency falls back to the Nigeria minimum.
export const MINIMUM_NGN: Record<Residency, number> = {
  nigeria: 100000,
  diaspora: 150000,
};

export function minimumFor(residency: string | null | undefined): number {
  return residency === "diaspora" ? MINIMUM_NGN.diaspora : MINIMUM_NGN.nigeria;
}
