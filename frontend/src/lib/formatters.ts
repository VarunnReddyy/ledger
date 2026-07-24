import type { FieldState, ReturnStatus, Role } from "./types";

const ROLE_LABELS: Record<Role, string> = {
  individual_taxpayer: "Individual taxpayer",
  business_owner: "Business owner",
  preparer: "Preparer",
  reviewer: "Reviewer",
  firm_admin: "Firm admin",
  seasonal_staff: "Seasonal staff",
};

const CLIENT_STATUS_LABELS: Record<ReturnStatus, string> = {
  intake: "Getting started",
  docs_requested: "We need some documents",
  docs_received: "We have what we need",
  in_preparation: "Your return is being prepared",
  pending_review: "Your return is being prepared",
  client_approval: "Ready for your approval",
  filed: "Filed with the IRS",
  accepted: "Accepted by the IRS",
};

const STAFF_STATUS_LABELS: Record<ReturnStatus, string> = {
  intake: "Intake",
  docs_requested: "Docs requested",
  docs_received: "Docs received",
  in_preparation: "In preparation",
  pending_review: "Pending reviewer sign-off",
  client_approval: "Awaiting client approval",
  filed: "Filed",
  accepted: "Accepted",
};

export function clientStatusLabel(status: ReturnStatus): string {
  return CLIENT_STATUS_LABELS[status];
}

export function staffStatusLabel(status: ReturnStatus): string {
  return STAFF_STATUS_LABELS[status];
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) {
    return String(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  const first = parts[0];
  if (!first) {
    return "?";
  }
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }
  const last = parts[parts.length - 1];
  if (!last) {
    return first.slice(0, 2).toUpperCase();
  }
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function isAiFieldState(state: FieldState): boolean {
  return state === "ai_extracted" || state === "ai_calculated";
}
