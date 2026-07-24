import { useEffect, useState } from "react";
import type { TraceProvenanceOut } from "@/lib/types";

interface DocumentPaneProps {
  provenance: TraceProvenanceOut | null;
}

export function DocumentPane({ provenance }: DocumentPaneProps) {
  const [drawKey, setDrawKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function sync() {
      setReducedMotion(media.matches);
    }
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (provenance) {
      setDrawKey((value) => value + 1);
    }
  }, [provenance?.id]);

  if (!provenance) {
    return (
      <section
        className="flex min-h-[20rem] flex-col rounded-sm border border-rule bg-ledger/30 p-4 lg:min-h-full"
        aria-label="Document pane"
      >
        <h2 className="text-sm font-medium text-ink/70">Source document</h2>
        <p className="mt-2 text-sm text-ink/60">
          Select a provenance line to open its source page and highlight the extracted region.
        </p>
        <div className="mt-6 flex flex-1 items-center justify-center rounded-sm border border-dashed border-rule bg-paper p-6">
          <p className="text-sm text-ink/50">No provenance selected.</p>
        </div>
      </section>
    );
  }

  const { bbox, document, page } = provenance;
  const midY = bbox.y + bbox.h / 2;

  return (
    <section
      className="flex min-h-[20rem] flex-col rounded-sm border border-rule bg-ledger/30 p-4 lg:min-h-full"
      aria-label="Document pane"
    >
      <div className="border-b border-rule pb-3">
        <h2 className="text-sm font-medium text-ink">{document.title}</h2>
        <p className="mt-1 font-tabular text-xs text-ink/60">
          {document.issuer ? `${document.issuer} · ` : null}
          Page {page.page_no}
        </p>
      </div>

      <div className="relative mt-4 min-h-[24rem] flex-1 overflow-hidden rounded-sm border border-rule bg-paper">
        <iframe
          title={`${document.title}, page ${page.page_no}`}
          src={`/api/pages/${page.id}/html`}
          sandbox=""
          className="absolute inset-0 h-full w-full border-0 bg-paper"
        />

        <div
          key={`box-${drawKey}`}
          className="pointer-events-none absolute border-2 border-machine bg-machine/10"
          style={{
            left: `${bbox.x}%`,
            top: `${bbox.y}%`,
            width: `${bbox.w}%`,
            height: `${bbox.h}%`,
          }}
          aria-hidden
        />

        <svg
          key={`svg-${drawKey}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <line
            x1={0}
            y1={midY}
            x2={bbox.x}
            y2={midY}
            className={`stroke-machine ${reducedMotion ? "opacity-55" : "animate-provenance-connector"}`}
            strokeWidth={0.35}
            vectorEffect="non-scaling-stroke"
          />

          {reducedMotion ? null : (
            <rect
              x={bbox.x}
              y={bbox.y}
              width={bbox.w}
              height={bbox.h}
              fill="none"
              className="stroke-machine animate-provenance-draw"
              strokeWidth={2}
              pathLength={1}
              strokeDasharray={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>

      <p className="mt-3 font-tabular text-xs text-machine">
        {provenance.box_label}
        {provenance.raw_value ? ` · ${provenance.raw_value}` : null}
      </p>
    </section>
  );
}
