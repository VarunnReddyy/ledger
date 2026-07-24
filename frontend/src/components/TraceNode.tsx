import { formatMoney } from "@/lib/formatters";
import type { FieldTrace, TraceProvenanceOut } from "@/lib/types";

interface TraceNodeProps {
  trace: FieldTrace;
  depth?: number;
  selectedProvenanceId: string | null;
  onSelectProvenance: (provenance: TraceProvenanceOut) => void;
  onNavigateField: (fieldId: string) => void;
}

export function TraceNode({
  trace,
  depth = 0,
  selectedProvenanceId,
  onSelectProvenance,
  onNavigateField,
}: TraceNodeProps) {
  const transform = trace.transform;
  if (!transform || transform.inputs.length === 0) {
    return null;
  }

  return (
    <ul className={`space-y-1 font-tabular text-[15px] ${depth > 0 ? "mt-2" : ""}`}>
      {transform.inputs.map((input, index) => {
        const operator = index === 0 ? "=" : input.operator;

        if (input.type === "provenance") {
          const { provenance } = input;
          const selected = provenance.id === selectedProvenanceId;
          return (
            <li key={provenance.id}>
              <button
                type="button"
                onClick={() => onSelectProvenance(provenance)}
                aria-pressed={selected}
                className={`flex w-full items-baseline gap-2 px-2 py-1.5 text-left duration-150 ease-out ${
                  selected
                    ? "bg-machine/10 text-machine ring-1 ring-machine/40"
                    : "text-ink/80 hover:bg-ledger"
                }`}
              >
                <span className="w-4 shrink-0 text-ink/40">{operator}</span>
                <span className="min-w-0 flex-1 truncate">
                  {provenance.box_label} · {documentLabel(provenance)}
                </span>
                <span className="hidden min-w-[2rem] flex-1 border-b border-dotted border-rule sm:block" aria-hidden />
                <span className="shrink-0 text-right tabular-nums text-ink">
                  {formatMoney(provenance.raw_value)}
                </span>
              </button>
            </li>
          );
        }

        const nested = input.field;
        const summary = nested.field;
        return (
          <li key={summary.id}>
            <button
              type="button"
              onClick={() => onNavigateField(summary.id)}
              className="flex w-full items-baseline gap-2 px-2 py-1.5 text-left text-ink/80 duration-150 ease-out hover:bg-ledger"
            >
              <span className="w-4 shrink-0 text-ink/40">{operator}</span>
              <span className="min-w-0 flex-1 truncate">
                {summary.line_ref} · {summary.label}
              </span>
              <span className="hidden min-w-[2rem] flex-1 border-b border-dotted border-rule sm:block" aria-hidden />
              <span className="shrink-0 text-right tabular-nums text-ink">
                {formatMoney(summary.value)}
              </span>
            </button>
            <div className="ml-3 border-l border-rule pl-2">
              <TraceNode
                trace={nested}
                depth={depth + 1}
                selectedProvenanceId={selectedProvenanceId}
                onSelectProvenance={onSelectProvenance}
                onNavigateField={onNavigateField}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function documentLabel(provenance: TraceProvenanceOut): string {
  const title = provenance.document.title.replace(/\s+[—–-]\s+/g, " ");
  if (provenance.document.issuer && !title.includes(provenance.document.issuer)) {
    return `${title} ${provenance.document.issuer}`;
  }
  return title;
}
