import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClientFilter } from "@/components/ClientFilter";
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
const ZEBRA_THRESHOLD = 10;

const filterControlClass =
  "rounded-sm border border-rule bg-paper px-3 py-2 text-[15px] text-ink";

export default function DocumentsRoute() {
  const { hrefFor, isFirmSide } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get("client");
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

  useEffect(() => {
    setPage(1);
  }, [clientId]);

  const documents = useDocuments({
    q: debouncedQ,
    type: docType,
    status,
    client: clientId ?? undefined,
    page,
    per_page: PER_PAGE,
  });

  const hasOtherFilters = Boolean(debouncedQ || docType || status);
  const hasClientFilter = Boolean(clientId);
  const total = documents.data?.total ?? 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(page * PER_PAGE, total);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const useZebra =
    documents.isSuccess && documents.data.items.length > ZEBRA_THRESHOLD;

  function clearClientFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete("client");
    setSearchParams(next, { replace: true });
    setPage(1);
  }

  function clearFilters() {
    setSearchInput("");
    setDebouncedQ("");
    setDocType("");
    setStatus("");
    setPage(1);
    if (clientId) {
      clearClientFilter();
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="type-page-title">Documents</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-ink/70">
          Uploads, extraction status, and items still outstanding from clients.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-y border-rule py-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
        {isFirmSide ? (
          <ClientFilter onChange={() => setPage(1)} />
        ) : null}
        <label className="type-meta flex min-w-[12rem] flex-1 flex-col gap-2">
          Search
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Title, issuer, or filename"
            className={filterControlClass}
          />
        </label>
        <label className="type-meta flex min-w-[10rem] flex-col gap-2">
          Type
          <select
            value={docType}
            onChange={(event) => {
              setDocType(event.target.value as DocType | "");
              setPage(1);
            }}
            className={filterControlClass}
          >
            <option value="">All types</option>
            {DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="type-meta flex min-w-[10rem] flex-col gap-2">
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as DocumentStatus | "");
              setPage(1);
            }}
            className={filterControlClass}
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

      {documents.isLoading ? (
        <LoadingSkeleton rows={8} label="Loading documents" variant="table" />
      ) : null}

      {documents.isError ? (
        <ErrorCard
          message={queryErrorMessage(documents.error, "Documents could not be loaded.")}
        />
      ) : null}

      {documents.isSuccess && documents.data.items.length === 0 ? (
        <EmptyState
          title={
            hasClientFilter
              ? "No documents match"
              : hasOtherFilters
                ? "No documents match these filters"
                : "No documents yet"
          }
          body={
            hasClientFilter
              ? "Try another client, or clear the client filter to see the full list."
              : hasOtherFilters
                ? "Clear the search and filters to see the full document list."
                : "Request documents from a client return, or upload files to begin extraction."
          }
          actionLabel={
            hasClientFilter
              ? "Clear client filter"
              : hasOtherFilters
                ? "Clear filters"
                : undefined
          }
          onAction={
            hasClientFilter
              ? clearClientFilter
              : hasOtherFilters
                ? clearFilters
                : undefined
          }
        />
      ) : null}

      {documents.isSuccess && documents.data.items.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 type-meta">
            <p className="font-tabular tabular-nums">
              {rangeStart}–{rangeEnd} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="btn-secondary px-2 py-1 text-[13px]"
              >
                Previous
              </button>
              <span className="font-tabular tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="btn-secondary px-2 py-1 text-[13px]"
              >
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-rule">
                <tr className="type-section">
                  <th className="py-2 pr-4 font-semibold">Document</th>
                  <th className="px-4 py-2 font-semibold">Type</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="py-2 pl-4 text-right font-semibold">Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {documents.data.items.map((doc, index) => (
                  <tr
                    key={doc.id}
                    className={`hover:bg-ledger ${
                      useZebra && index % 2 === 1 ? "bg-ledger" : undefined
                    }`}
                  >
                    <td className="py-3 pr-4">
                      <Link
                        to={hrefFor(`/documents/${doc.id}`)}
                        className="text-[15px] font-medium leading-relaxed text-ink underline-offset-2 hover:underline"
                      >
                        {doc.title}
                      </Link>
                      <div className="type-meta mt-0.5">
                        {doc.issuer ?? "Unknown issuer"} ·{" "}
                        <span className="font-tabular tabular-nums">{doc.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[15px] capitalize leading-relaxed text-ink/80">
                      {doc.doc_type.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <DocStatus status={doc.status} />
                    </td>
                    <td className="py-3 pl-4 text-right font-tabular text-[15px] tabular-nums">
                      {doc.tax_year}
                    </td>
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
      : status === "requested" || status === "processing" || status === "uploaded"
        ? "text-pending"
        : status === "accepted"
          ? "text-seal"
          : "text-ink/55";

  const label = status.replaceAll("_", " ");
  return <span className={`text-[13px] capitalize ${tone}`}>{label}</span>;
}
