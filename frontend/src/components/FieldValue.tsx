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
        ? "border border-rule bg-ledger/60 text-ink/50"
        : state === "verified"
          ? "border border-rule bg-paper"
          : ai
            ? "border border-transparent bg-paper"
            : "border border-rule bg-paper";

  const marker = ai ? "border-l-[3px] border-l-machine pl-2.5" : "pl-3";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      title={state === "locked" && lockedReason ? lockedReason : undefined}
      className={`group w-full rounded-sm px-3 py-2.5 text-left transition ${shell} ${marker} ${
        selected ? "ring-2 ring-seal ring-offset-2 ring-offset-paper" : ""
      } ${onSelect ? "cursor-pointer hover:bg-ledger/40" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-tabular text-xs text-ink/50">{lineRef}</span>
            <span className="truncate text-sm text-ink/80">{label}</span>
          </div>
          <div
            className={`mt-1 font-tabular text-base tabular-nums ${
              ai ? "text-machine underline decoration-dotted decoration-machine underline-offset-4" : "text-ink"
            } ${state === "empty" ? "text-ink/40" : ""}`}
          >
            {display}
          </div>
        </div>
        <FieldStateGlyph state={state} />
      </div>
      {ai ? (
        <div className="mt-2 flex gap-3 text-xs text-machine opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
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
      <span className="font-tabular text-sm text-machine" aria-label="AI calculated">
        ƒ
      </span>
    );
  }
  return <span className="sr-only">{state}</span>;
}
