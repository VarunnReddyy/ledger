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
    <div className="space-y-8">
      {detail.isLoading ? (
        <LoadingSkeleton rows={8} label="Loading return" variant="page" />
      ) : null}

      {detail.isError ? (
        <ErrorCard message={queryErrorMessage(detail.error, "Return could not be loaded.")} />
      ) : null}

      {detail.isSuccess ? (
        <>
          <div className="flex flex-col gap-3 border-b border-rule pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-tabular text-[13px] tabular-nums text-ink/55">
                {detail.data.id}
              </p>
              <h1 className="type-page-title mt-1">
                {detail.data.client_name} ·{" "}
                <span className="font-tabular tabular-nums">{detail.data.tax_year}</span>
              </h1>
              <p className="mt-1 text-[15px] leading-relaxed text-ink/70">
                Form {detail.data.form_type} · {statusLabel}
              </p>
            </div>
            <StatusPill status={detail.data.status} audience={audience} />
          </div>

          {hasSections ? (
            <div className="grid gap-8 lg:grid-cols-2">
              <section aria-label="Return fields">
                <ReturnFieldsList sections={detail.data.sections} onSelectField={selectField} />
              </section>

              <section
                aria-label="Source document"
                className="min-h-[28rem] border-l border-rule pl-0 lg:pl-8"
              >
                <h2 className="type-section">Source document</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/60">
                  Select a field to open provenance in the detail pane. The source region
                  highlights once a field is chosen.
                </p>
                <div className="mt-8 flex min-h-[12rem] items-center justify-center">
                  <p className="text-[15px] leading-relaxed text-ink/60">No field selected.</p>
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
