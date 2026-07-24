import { Check, Lock, UserRound } from "lucide-react";
import type { FieldState } from "@/lib/types";
import { isAiFieldState } from "@/lib/formatters";

interface FieldValueProps {
  label: string;
  lineRef: string;
  value: string | null;
  state: FieldState;
  lockedReason?: string | null;
  selected?: boolean;
  onSelect?: () => void;
}

export function FieldValue({
  label,
  lineRef,
  value,
  state,
  lockedReason,
  selected = false,
  onSelect,
}: FieldValueProps) {
  const ai = isAiFieldState(state);
  const display = value ?? (state === "empty" ? "Enter value" : "—");

  const shell =
    state === "empty"
      ? "border border-dashed border-rule bg-paper"
      : state === "locked"
        ? "bg-ledger/60 text-ink/50"
        : state === "verified"
          ? "bg-paper"
          : ai
            ? "bg-paper"
            : "bg-paper";

  const marker = ai ? "border-l-[3px] border-l-machine pl-2.5" : "pl-3";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      title={state === "locked" && lockedReason ? lockedReason : undefined}
      className={`group w-full px-3 py-2.5 text-left duration-150 ease-out ${shell} ${marker} ${
        selected ? "ring-2 ring-seal ring-offset-2 ring-offset-paper" : ""
      } ${onSelect ? "cursor-pointer hover:bg-ledger" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-tabular text-[13px] tabular-nums text-ink/55">{lineRef}</span>
            <span className="truncate text-[15px] leading-relaxed text-ink/80">{label}</span>
          </div>
          <div
            className={`mt-1 font-tabular text-[15px] tabular-nums leading-relaxed ${
              ai ? "text-machine underline decoration-dotted decoration-machine underline-offset-4" : "text-ink"
            } ${state === "empty" ? "text-ink/40" : ""}`}
          >
            {display}
          </div>
        </div>
        <FieldStateGlyph state={state} />
      </div>
      {ai ? (
        <div className="mt-2 flex gap-3 text-[13px] text-machine opacity-0 duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
          <span>How did you get this?</span>
          <span>Correct this</span>
        </div>
      ) : null}
    </button>
  );
}

interface FieldStateGlyphProps {
  state: FieldState;
}

function FieldStateGlyph({ state }: FieldStateGlyphProps) {
  if (state === "verified") {
    return <Check className="h-4 w-4 shrink-0 text-seal" aria-label="Verified" />;
  }
  if (state === "locked") {
    return <Lock className="h-4 w-4 shrink-0 text-ink/40" aria-label="Locked" />;
  }
  if (state === "client_answered") {
    return <UserRound className="h-4 w-4 shrink-0 text-ink/50" aria-label="Client answered" />;
  }
  if (state === "ai_calculated") {
    return (
      <span className="font-tabular text-[15px] text-machine" aria-label="AI calculated">
        ƒ
      </span>
    );
  }
  return <span className="sr-only">{state}</span>;
}
