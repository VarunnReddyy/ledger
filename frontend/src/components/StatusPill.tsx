import type { ReturnStatus } from "@/lib/types";
import { clientStatusLabel, staffStatusLabel } from "@/lib/formatters";

interface StatusPillProps {
  status: ReturnStatus;
  audience: "staff" | "client";
}

export function StatusPill({ status, audience }: StatusPillProps) {
  const label = audience === "staff" ? staffStatusLabel(status) : clientStatusLabel(status);
  const tone =
    status === "filed" || status === "accepted"
      ? "bg-seal/10 text-seal"
      : "bg-ink/10 text-ink/80";

  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[13px] font-medium ${tone}`}>
      {label}
    </span>
  );
}
