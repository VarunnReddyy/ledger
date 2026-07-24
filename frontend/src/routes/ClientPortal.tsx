import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusPill } from "@/components/StatusPill";
import { clientStatusLabel } from "@/lib/formatters";
import { queryErrorMessage } from "@/lib/queryErrors";
import { useReturnDetail, useReturns } from "@/lib/queries";
import { useRole } from "@/lib/role-context";
import type {
  ClientNextStepOut,
  ReturnListItem,
  ReturnStatus,
} from "@/lib/types";

/** Client-facing timeline steps in lifecycle order (unique labels only). */
const CLIENT_TIMELINE: ReturnStatus[] = [
  "intake",
  "docs_requested",
  "docs_received",
  "in_preparation",
  "client_approval",
  "filed",
  "accepted",
];

const FIRST_RUN_STATUSES: ReadonlySet<ReturnStatus> = new Set([
  "intake",
  "docs_requested",
]);

export default function ClientPortalRoute() {
  const { clientId } = useParams();
  const {
    activeMembership,
    activeUser,
    isLoading: roleLoading,
    isError: roleError,
    error: roleErr,
  } = useRole();
  const returns = useReturns();

  const scopedClientId = activeMembership?.client_id ?? clientId;
  const clientReturns =
    returns.isSuccess && scopedClientId
      ? returns.data.filter((item) => item.client_id === scopedClientId)
      : [];
  const primary = pickPrimaryReturn(clientReturns);

  const roleScope =
    activeMembership && activeUser
      ? { role: activeMembership.role, user: activeUser.id }
      : null;
  const detail = useReturnDetail(primary?.id, roleScope);

  const loading = roleLoading || returns.isLoading || (Boolean(primary) && detail.isLoading);
  const error = roleErr ?? returns.error ?? detail.error;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <LoadingSkeleton rows={6} label="Loading client portal" />
      </div>
    );
  }

  if (roleError || returns.isError || (primary && detail.isError)) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorCard message={queryErrorMessage(error, "Client portal could not be loaded.")} />
      </div>
    );
  }

  if (!returns.isSuccess) {
    return null;
  }

  const displayName =
    primary?.client_name ??
    activeMembership?.client_name ??
    activeMembership?.label ??
    activeUser?.name ??
    "Your return";

  if (!primary) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <p className="text-sm text-ink/60">Your tax return</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{displayName}</h1>
          <p className="mt-1 font-tabular text-sm text-ink/50">
            {scopedClientId ?? "unknown client"}
          </p>
        </div>
        <EmptyState
          title="No return on file"
          body="When your firm opens an engagement for this account, its progress will show up here."
        />
      </div>
    );
  }

  const isFirstRun = FIRST_RUN_STATUSES.has(primary.status);
  const nextStep = detail.isSuccess ? detail.data.client_next_step : null;
  const activeStepIndex = timelineIndexForStatus(primary.status);

  if (isFirstRun) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <p className="text-sm text-ink/60">Your tax return</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{displayName}</h1>
          <p className="mt-1 font-tabular text-sm text-ink/50">
            {primary.client_id} · tax year {primary.tax_year}
          </p>
        </div>

        <NextStepCard nextStep={nextStep} />

        <ProgressTimeline activeStepIndex={activeStepIndex} />

        {clientReturns.length > 1 ? (
          <details className="group border-t border-rule pt-4">
            <summary className="cursor-pointer text-sm text-ink/60 outline-none hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal">
              Your other returns
            </summary>
            <ul className="mt-4 divide-y divide-rule border border-rule">
              {clientReturns.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-tabular text-ink">Tax year {item.tax_year}</div>
                    <div className="mt-0.5 text-xs text-ink/60">{item.client_label}</div>
                  </div>
                  <StatusPill status={item.status} audience="client" />
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-sm text-ink/60">Your tax return</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{displayName}</h1>
        <p className="mt-1 font-tabular text-sm text-ink/50">
          {primary.client_id} · tax year {primary.tax_year}
        </p>
      </div>

      <section className="rounded-sm border border-rule bg-paper p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Where things stand</h2>
            <p className="mt-2 text-sm text-ink/70">{primary.client_label}</p>
          </div>
          <StatusPill status={primary.status} audience="client" />
        </div>
        <ol className="mt-6 space-y-3">
          {CLIENT_TIMELINE.map((status, index) => {
            const label = clientStatusLabel(status);
            const active = index === activeStepIndex;
            const complete = index < activeStepIndex;
            return (
              <li key={status} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full font-tabular text-xs ${
                    active
                      ? "bg-seal text-paper"
                      : complete
                        ? "bg-ledger text-seal"
                        : "bg-ledger text-ink/40"
                  }`}
                >
                  {index + 1}
                </span>
                <span className={active ? "font-medium text-ink" : "text-ink/60"}>{label}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {clientReturns.length > 1 ? (
        <section className="rounded-sm border border-rule p-6">
          <h2 className="text-lg font-medium">Your returns</h2>
          <ul className="mt-4 divide-y divide-rule border border-rule">
            {clientReturns.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <div className="font-tabular text-ink">Tax year {item.tax_year}</div>
                  <div className="mt-0.5 text-xs text-ink/60">{item.client_label}</div>
                </div>
                <StatusPill status={item.status} audience="client" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

interface NextStepCardProps {
  nextStep: ClientNextStepOut | null;
}

function NextStepCard({ nextStep }: NextStepCardProps) {
  if (!nextStep) {
    return (
      <p className="border-l-2 border-seal pl-4 text-base text-ink">
        You&apos;re all set — we&apos;re preparing your return.
      </p>
    );
  }

  const minutesLabel =
    nextStep.estimate_minutes === 1
      ? "1 minute"
      : `${nextStep.estimate_minutes} minutes`;

  return (
    <section className="rounded-sm border-2 border-seal bg-ledger/40 px-6 py-8">
      <p className="text-sm font-medium uppercase tracking-wide text-seal">Next step</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {nextStep.headline} — {minutesLabel}
      </h2>
      <p className="mt-3 max-w-md text-sm text-ink/70">
        Finish this and we can keep moving on your return.
      </p>
    </section>
  );
}

interface ProgressTimelineProps {
  activeStepIndex: number;
}

function ProgressTimeline({ activeStepIndex }: ProgressTimelineProps) {
  return (
    <section aria-label="Progress">
      <h2 className="text-sm font-medium text-ink/60">Progress</h2>
      <ol className="mt-4 space-y-3">
        {CLIENT_TIMELINE.map((status, index) => {
          const label = clientStatusLabel(status);
          const active = index === activeStepIndex;
          const complete = index < activeStepIndex;
          return (
            <li key={status} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full font-tabular text-xs ${
                  active
                    ? "bg-seal text-paper"
                    : complete
                      ? "bg-ledger text-seal"
                      : "bg-ledger text-ink/40"
                }`}
              >
                {index + 1}
              </span>
              <span className={active ? "font-medium text-ink" : "text-ink/60"}>{label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function pickPrimaryReturn(items: ReturnListItem[]): ReturnListItem | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return [...items].sort((a, b) => b.tax_year - a.tax_year)[0];
}

function timelineIndexForStatus(status: ReturnStatus): number {
  if (status === "pending_review") {
    return CLIENT_TIMELINE.indexOf("in_preparation");
  }
  const index = CLIENT_TIMELINE.indexOf(status);
  return index >= 0 ? index : 0;
}
