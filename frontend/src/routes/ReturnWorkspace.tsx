import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ReturnFieldsList } from "@/components/ReturnFieldsList";
import { StatusPill } from "@/components/StatusPill";
import { queryErrorMessage } from "@/lib/queryErrors";
import { useReturnDetail } from "@/lib/queries";
import { useRole } from "@/lib/role-context";
import type { ReturnFieldOut } from "@/lib/types";

export default function ReturnWorkspaceRoute() {
  const { returnId } = useParams();
  const navigate = useNavigate();
  const { activeMembership, activeUser, audience, hrefFor } = useRole();
  const scope =
    activeMembership && activeUser
      ? { role: activeMembership.role, user: activeUser.id }
      : null;
  const detail = useReturnDetail(returnId, scope);

  function selectField(field: ReturnFieldOut) {
    if (!returnId) {
      return;
    }
    void navigate(hrefFor(`/returns/${returnId}/fields/${field.id}`));
  }

  const statusLabel =
    audience === "staff" ? detail.data?.staff_label : detail.data?.client_label;
  const hasSections =
    detail.isSuccess && detail.data.sections.length > 0;

  return (
    <div className="space-y-6">
      {detail.isLoading ? <LoadingSkeleton rows={8} label="Loading return" /> : null}

      {detail.isError ? (
        <ErrorCard message={queryErrorMessage(detail.error, "Return could not be loaded.")} />
      ) : null}

      {detail.isSuccess ? (
        <>
          <div className="flex flex-col gap-3 border-b border-rule pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-tabular text-xs text-ink/50">{detail.data.id}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {detail.data.client_name} · {detail.data.tax_year}
              </h1>
              <p className="mt-1 text-sm text-ink/70">
                Form {detail.data.form_type} · {statusLabel}
              </p>
            </div>
            <StatusPill status={detail.data.status} audience={audience} />
          </div>

          {hasSections ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <section aria-label="Return fields">
                <ReturnFieldsList sections={detail.data.sections} onSelectField={selectField} />
              </section>

              <section
                aria-label="Source document"
                className="min-h-[28rem] rounded-sm border border-rule bg-ledger/30 p-4"
              >
                <h2 className="text-sm font-medium text-ink/70">Source document</h2>
                <p className="mt-2 text-sm text-ink/60">
                  Select a field to open provenance in the detail pane. The source region
                  highlights once a field is chosen.
                </p>
                <div className="mt-6 rounded-sm border border-dashed border-rule bg-paper p-6">
                  <p className="text-sm text-ink/50">No field selected.</p>
                </div>
              </section>
            </div>
          ) : (
            <EmptyState
              title="This return hasn't been prepared yet"
              body="Fields appear here once document extraction runs. See Northwind Traders 2025 for a fully prepared return."
              actionLabel="Open Northwind Traders 2025"
              actionTo={hrefFor("/returns/ret_northwind_2025")}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
