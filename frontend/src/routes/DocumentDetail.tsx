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
    return <LoadingSkeleton rows={8} label="Loading document" />;
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-rule pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-tabular text-xs text-ink/50">{doc.id}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{doc.title}</h1>
          <p className="mt-1 text-sm text-ink/70">
            {doc.issuer ?? "Unknown issuer"} · {doc.tax_year} ·{" "}
            <span className="capitalize">{doc.doc_type.replaceAll("_", " ")}</span>
          </p>
          <p className="mt-1 text-xs text-ink/50">
            <DocStatusLabel status={doc.status} />
            {doc.uploaded_at ? (
              <>
                {" "}
                · Uploaded{" "}
                <span className="font-tabular">{formatDateTime(doc.uploaded_at)}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-sm border border-rule bg-paper px-3 py-2 text-sm text-ink hover:bg-ledger/50"
          >
            Discussion
            {threads.length > 0 ? (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-sm bg-seal px-1.5 py-0.5 font-tabular text-xs text-paper">
                {threads.length}
              </span>
            ) : null}
          </button>
          <Link
            to={hrefFor(isFirmSide ? "/documents" : homePath)}
            className="text-sm text-ink/60 underline-offset-2 hover:text-ink hover:underline"
          >
            {isFirmSide ? "Back to documents" : "Back"}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section aria-label="Document pages" className="space-y-4">
          <h2 className="text-sm font-medium">Pages</h2>
          {doc.pages.length === 0 ? (
            <p className="text-sm text-ink/60">No pages are attached to this document yet.</p>
          ) : (
            doc.pages.map((page) => (
              <div
                key={page.id}
                className="overflow-hidden rounded-sm border border-rule bg-paper"
              >
                <div className="border-b border-rule px-3 py-2 font-tabular text-xs text-ink/60">
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
          <h2 className="text-sm font-medium">Provenance on this document</h2>
          {doc.provenances.length === 0 ? (
            <p className="text-sm text-ink/60">
              No return fields are linked to this document yet.
            </p>
          ) : (
            <ul className="divide-y divide-rule border border-rule">
              {doc.provenances.map((item) => (
                <li key={item.id} className="px-3 py-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-ink">{item.box_label}</span>
                    <span className="font-tabular text-ink/80">
                      {item.raw_value ?? "—"}
                    </span>
                  </div>
                  <p className="mt-0.5 font-tabular text-xs text-ink/50">
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
      : status === "requested"
        ? "text-pending"
        : status === "extracted" || status === "accepted"
          ? "text-seal"
          : "text-ink/60";
  return <span className={`capitalize ${tone}`}>{status.replaceAll("_", " ")}</span>;
}
