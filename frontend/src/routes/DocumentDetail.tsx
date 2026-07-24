import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ThreadDrawer } from "@/components/ThreadDrawer";
import { formatDateTime } from "@/lib/formatters";
import { queryErrorMessage } from "@/lib/queryErrors";
import { useDocumentDetail } from "@/lib/queries";
import { useRole } from "@/lib/role-context";
import type { DocumentStatus } from "@/lib/types";

export default function DocumentDetailRoute() {
  const { documentId } = useParams();
  const { activeMembership, activeUser, hrefFor, isFirmSide, homePath } = useRole();
  const scope =
    activeMembership && activeUser
      ? { role: activeMembership.role, user: activeUser.id }
      : null;
  const detail = useDocumentDetail(documentId, scope);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const threads = useMemo(() => detail.data?.threads ?? [], [detail.data?.threads]);

  if (detail.isLoading) {
    return <LoadingSkeleton rows={8} label="Loading document" variant="page" />;
  }

  if (detail.isError) {
    return (
      <ErrorCard
        message={queryErrorMessage(detail.error, "Document could not be loaded.")}
      />
    );
  }

  if (!detail.isSuccess) {
    return null;
  }

  const doc = detail.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b border-rule pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-tabular text-[13px] tabular-nums text-ink/55">{doc.id}</p>
          <h1 className="type-page-title mt-1">{doc.title}</h1>
          <p className="mt-1 text-[15px] leading-relaxed text-ink/70">
            {doc.issuer ?? "Unknown issuer"} ·{" "}
            <span className="font-tabular tabular-nums">{doc.tax_year}</span> ·{" "}
            <span className="capitalize">{doc.doc_type.replaceAll("_", " ")}</span>
          </p>
          <p className="type-meta mt-1">
            <DocStatusLabel status={doc.status} />
            {doc.uploaded_at ? (
              <>
                {" "}
                · Uploaded{" "}
                <span className="font-tabular tabular-nums">{formatDateTime(doc.uploaded_at)}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            Discussion
            {threads.length > 0 ? (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-sm bg-ink/10 px-1.5 py-0.5 font-tabular text-[13px] tabular-nums text-ink">
                {threads.length}
              </span>
            ) : null}
          </button>
          <Link
            to={hrefFor(isFirmSide ? "/documents" : homePath)}
            className="type-meta underline-offset-2 hover:text-ink hover:underline"
          >
            {isFirmSide ? "Back to documents" : "Back"}
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <section aria-label="Document pages" className="space-y-4">
          <h2 className="type-section">Pages</h2>
          {doc.pages.length === 0 ? (
            <p className="text-[15px] leading-relaxed text-ink/60">
              No pages are attached to this document yet.
            </p>
          ) : (
            doc.pages.map((page) => (
              <div key={page.id} className="overflow-hidden border-t border-rule">
                <div className="border-b border-rule py-2 font-tabular text-[13px] tabular-nums text-ink/55">
                  Page {page.page_no}
                </div>
                <iframe
                  title={`${doc.title}, page ${page.page_no}`}
                  src={`/api/pages/${page.id}/html`}
                  sandbox=""
                  className="h-[28rem] w-full border-0 bg-paper"
                />
              </div>
            ))
          )}
        </section>

        <section aria-label="Extracted fields" className="space-y-3">
          <h2 className="type-section">Provenance on this document</h2>
          {doc.provenances.length === 0 ? (
            <p className="text-[15px] leading-relaxed text-ink/60">
              No return fields are linked to this document yet.
            </p>
          ) : (
            <ul className="divide-y divide-rule border-t border-rule">
              {doc.provenances.map((item) => (
                <li key={item.id} className="py-3 text-[15px] leading-relaxed">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-ink">{item.box_label}</span>
                    <span className="font-tabular text-right tabular-nums text-ink/80">
                      {item.raw_value ?? "—"}
                    </span>
                  </div>
                  <p className="type-meta mt-0.5 font-tabular tabular-nums">
                    {item.field_line_ref} · {item.field_label}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ThreadDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        threads={threads}
        scope={scope}
        isFirmSide={isFirmSide}
      />
    </div>
  );
}

interface DocStatusLabelProps {
  status: DocumentStatus;
}

function DocStatusLabel({ status }: DocStatusLabelProps) {
  const tone =
    status === "needs_attention"
      ? "text-flag"
      : status === "requested" || status === "processing" || status === "uploaded"
        ? "text-pending"
        : status === "accepted"
          ? "text-seal"
          : "text-ink/55";
  return <span className={`capitalize ${tone}`}>{status.replaceAll("_", " ")}</span>;
}
