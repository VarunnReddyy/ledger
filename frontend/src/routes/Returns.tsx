import { Link, useSearchParams } from "react-router-dom";
import { ClientFilter } from "@/components/ClientFilter";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusPill } from "@/components/StatusPill";
import { formatDueness } from "@/lib/formatters";
import { queryErrorMessage } from "@/lib/queryErrors";
import { useReturns } from "@/lib/queries";
import { useRole } from "@/lib/role-context";

export default function ReturnsRoute() {
  const { audience, hrefFor, isFirmSide } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get("client");
  const returns = useReturns({ client: clientId ?? undefined });

  function clearClientFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete("client");
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="type-page-title">Returns</h1>
          <p className="mt-1 text-[15px] leading-relaxed text-ink/70">
            Open engagements for the current season.
          </p>
        </div>
        {isFirmSide ? <ClientFilter /> : null}
      </div>

      {returns.isLoading ? (
        <LoadingSkeleton rows={8} label="Loading returns" variant="table" />
      ) : null}

      {returns.isError ? (
        <ErrorCard message={queryErrorMessage(returns.error, "Returns could not be loaded.")} />
      ) : null}

      {returns.isSuccess && returns.data.length === 0 ? (
        <EmptyState
          title={
            clientId ? "No returns for this client yet" : "No returns yet"
          }
          body={
            clientId
              ? "This client has no open engagements matching the current season."
              : "Seeded engagements will appear here once the firm opens a tax year."
          }
          actionLabel={clientId ? "Clear client filter" : undefined}
          onAction={clientId ? clearClientFilter : undefined}
        />
      ) : null}

      {returns.isSuccess && returns.data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-rule">
              <tr className="type-section">
                <th className="py-2 pr-4 font-semibold">Client</th>
                <th className="px-4 py-2 font-semibold">Year</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 text-right font-semibold">Due</th>
                <th className="py-2 pl-4 text-right font-semibold">Open tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {returns.data.map((ret) => {
                const dueness = formatDueness(ret.due_date);
                return (
                  <tr key={ret.id} className="hover:bg-ledger">
                    <td className="py-3 pr-4">
                      <div className="flex items-baseline gap-2">
                        <Link
                          to={hrefFor(`/returns/${ret.id}`)}
                          className="text-[15px] font-medium leading-relaxed text-ink hover:text-seal"
                        >
                          {ret.client_name}
                        </Link>
                        {ret.has_fields ? (
                          <span className="type-meta">Prepared</span>
                        ) : null}
                      </div>
                      <div className="font-tabular text-[13px] tabular-nums text-ink/55">
                        {ret.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-tabular text-[15px] tabular-nums text-ink/80">
                      {ret.tax_year}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={ret.status} audience={audience} />
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-tabular text-[13px] tabular-nums ${dueness.className}`}
                    >
                      {dueness.label}
                    </td>
                    <td className="py-3 pl-4 text-right font-tabular text-[15px] tabular-nums">
                      {ret.open_task_count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
