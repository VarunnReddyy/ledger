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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Returns</h1>
          <p className="mt-1 text-sm text-ink/70">Open engagements for the current season.</p>
        </div>
        {isFirmSide ? <ClientFilter /> : null}
      </div>

      {returns.isLoading ? <LoadingSkeleton rows={8} label="Loading returns" /> : null}

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
        <div className="overflow-x-auto border border-rule">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-rule bg-ledger/60 text-xs uppercase tracking-wide text-ink/60">
              <tr>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Year</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Due</th>
                <th className="px-4 py-2 text-right font-medium">Open tasks</th>
              </tr>
            </thead>
            <tbody>
              {returns.data.map((ret, index) => {
                const dueness = formatDueness(ret.due_date);
                return (
                <tr key={ret.id} className={index % 2 === 1 ? "bg-ledger/40" : undefined}>
                  <td className="px-4 py-3">
                    <div className="flex items-baseline gap-2">
                      <Link
                        to={hrefFor(`/returns/${ret.id}`)}
                        className="font-medium text-ink hover:text-seal"
                      >
                        {ret.client_name}
                      </Link>
                      {ret.has_fields ? (
                        <span className="text-xs text-seal/70">Prepared</span>
                      ) : null}
                    </div>
                    <div className="font-tabular text-xs text-ink/50">{ret.id}</div>
                  </td>
                  <td className="px-4 py-3 font-tabular text-ink/80">{ret.tax_year}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={ret.status} audience={audience} />
                  </td>
                  <td className={`px-4 py-3 text-right font-tabular ${dueness.className}`}>
                    {dueness.label}
                  </td>
                  <td className="px-4 py-3 text-right font-tabular">{ret.open_task_count}</td>
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
