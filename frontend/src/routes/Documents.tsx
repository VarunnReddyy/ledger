import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { queryErrorMessage } from "@/lib/queryErrors";
import { useDocuments } from "@/lib/queries";
import { useRole } from "@/lib/role-context";
import type { DocumentStatus, DocType } from "@/lib/types";

const DOC_TYPES: DocType[] = [
  "w2",
  "1099_nec",
  "1099_int",
  "1099_div",
  "1098",
  "k1",
  "receipt",
  "bank_statement",
  "prior_return",
  "other",
];

const DOC_STATUSES: DocumentStatus[] = [
  "requested",
  "uploaded",
  "processing",
  "extracted",
  "needs_attention",
  "accepted",
];

const PER_PAGE = 50;

export default function DocumentsRoute() {
  const { hrefFor } = useRole();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [docType, setDocType] = useState<DocType | "">("");
  const [status, setStatus] = useState<DocumentStatus | "">("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const documents = useDocuments({
    q: debouncedQ,
    type: docType,
    status,
    page,
    per_page: PER_PAGE,
  });

  const hasFilters = Boolean(debouncedQ || docType || status);
  const total = documents.data?.total ?? 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(page * PER_PAGE, total);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function clearFilters() {
    setSearchInput("");
    setDebouncedQ("");
    setDocType("");
    setStatus("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-ink/70">
          Uploads, extraction status, and items still outstanding from clients.
        </p>
      </div>

      <div className="flex flex-col gap-3 border border-rule bg-paper p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-ink/60">
          Search
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Title, issuer, or filename"
            className="rounded-sm border border-rule bg-paper px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
          />
        </label>
        <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-ink/60">
          Type
          <select
            value={docType}
            onChange={(event) => {
              setDocType(event.target.value as DocType | "");
              setPage(1);
            }}
            className="rounded-sm border border-rule bg-paper px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
          >
            <option value="">All types</option>
            {DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-ink/60">
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as DocumentStatus | "");
              setPage(1);
            }}
            className="rounded-sm border border-rule bg-paper px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
          >
            <option value="">All statuses</option>
            {DOC_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      {documents.isLoading ? <LoadingSkeleton rows={8} label="Loading documents" /> : null}

      {documents.isError ? (
        <ErrorCard
          message={queryErrorMessage(documents.error, "Documents could not be loaded.")}
        />
      ) : null}

      {documents.isSuccess && documents.data.items.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No documents match these filters" : "No documents yet"}
          body={
            hasFilters
              ? "Clear the search and filters to see the full document list."
              : "Request documents from a client return, or upload files to begin extraction."
          }
          actionLabel={hasFilters ? "Clear filters" : undefined}
          onAction={hasFilters ? clearFilters : undefined}
        />
      ) : null}

      {documents.isSuccess && documents.data.items.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs text-ink/60">
            <p className="font-tabular">
              {rangeStart}–{rangeEnd} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-sm border border-rule px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-ledger/50"
              >
                Previous
              </button>
              <span className="font-tabular">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="rounded-sm border border-rule px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-ledger/50"
              >
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-rule">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-rule bg-ledger/60 text-xs uppercase tracking-wide text-ink/60">
                <tr>
                  <th className="px-4 py-2 font-medium">Document</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Year</th>
                </tr>
              </thead>
              <tbody>
                {documents.data.items.map((doc, index) => (
                  <tr key={doc.id} className={index % 2 === 1 ? "bg-ledger/40" : undefined}>
                    <td className="px-4 py-3">
                      <Link
                        to={hrefFor(`/documents/${doc.id}`)}
                        className="font-medium text-ink underline-offset-2 hover:underline"
                      >
                        {doc.title}
                      </Link>
                      <div className="mt-0.5 text-xs text-ink/60">
                        {doc.issuer ?? "Unknown issuer"} ·{" "}
                        <span className="font-tabular">{doc.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-ink/80">
                      {doc.doc_type.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <DocStatus status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-tabular">{doc.tax_year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface DocStatusProps {
  status: DocumentStatus;
}

function DocStatus({ status }: DocStatusProps) {
  const tone =
    status === "needs_attention"
      ? "text-flag"
      : status === "requested"
        ? "text-pending"
        : status === "extracted" || status === "accepted"
          ? "text-seal"
          : "text-ink/60";

  const label = status.replaceAll("_", " ");
  return <span className={`text-xs capitalize ${tone}`}>{label}</span>;
}
