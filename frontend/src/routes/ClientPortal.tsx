import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusPill } from "@/components/StatusPill";
import { ApiError } from "@/lib/api";
import { clientStatusLabel } from "@/lib/formatters";
import { queryErrorMessage } from "@/lib/queryErrors";
import { useFulfillRequest, useReturnDetail, useReturns } from "@/lib/queries";
import { useRole } from "@/lib/role-context";
import type {
  ClientNextStepOut,
  ReturnListItem,
  ReturnStatus,
} from "@/lib/types";
import type { RoleScopedParams } from "@/lib/queries";

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
  "docs_received",
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
      <div className="mx-auto max-w-3xl">
        <LoadingSkeleton rows={6} label="Loading client portal" variant="letter" />
      </div>
    );
  }

  if (roleError || returns.isError || (primary && detail.isError)) {
    return (
      <div className="mx-auto max-w-3xl">
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
      <div className="mx-auto max-w-3xl space-y-8">
        <PortalHeader
          displayName={displayName}
          meta={scopedClientId ?? "unknown client"}
        />
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
      <div className="mx-auto max-w-3xl space-y-8">
        <PortalHeader
          displayName={displayName}
          meta={`${primary.client_id} · tax year ${primary.tax_year}`}
        />

        <NextStepCard nextStep={nextStep} scope={roleScope} />

        <ProgressTimeline activeStepIndex={activeStepIndex} />

        {clientReturns.length > 1 ? (
          <OtherReturnsList items={clientReturns} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PortalHeader
        displayName={displayName}
        meta={`${primary.client_id} · tax year ${primary.tax_year}`}
      />

      <section className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="type-section">Where things stand</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{primary.client_label}</p>
          </div>
          <StatusPill status={primary.status} audience="client" />
        </div>
        <ProgressTimelineList activeStepIndex={activeStepIndex} />
      </section>

      {clientReturns.length > 1 ? (
        <OtherReturnsList items={clientReturns} titled />
      ) : null}
    </div>
  );
}

interface PortalHeaderProps {
  displayName: string;
  meta: string;
}

function PortalHeader({ displayName, meta }: PortalHeaderProps) {
  return (
    <div>
      <p className="type-meta">Your tax return</p>
      <h1 className="type-page-title mt-1">{displayName}</h1>
      <p className="type-meta mt-1 font-tabular tabular-nums">{meta}</p>
    </div>
  );
}

interface OtherReturnsListProps {
  items: ReturnListItem[];
  titled?: boolean;
}

function OtherReturnsList({ items, titled = false }: OtherReturnsListProps) {
  if (titled) {
    return (
      <section className="space-y-4 border-t border-rule pt-8">
        <h2 className="type-section">Your returns</h2>
        <ul className="divide-y divide-rule">
          {items.map((item) => (
            <OtherReturnRow key={item.id} item={item} />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <details className="group border-t border-rule pt-4">
      <summary className="type-meta cursor-pointer hover:text-ink">
        Your other returns
      </summary>
      <ul className="mt-4 divide-y divide-rule">
        {items.map((item) => (
          <OtherReturnRow key={item.id} item={item} />
        ))}
      </ul>
    </details>
  );
}

interface OtherReturnRowProps {
  item: ReturnListItem;
}

function OtherReturnRow({ item }: OtherReturnRowProps) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 text-[15px] leading-relaxed">
      <div>
        <div className="font-tabular tabular-nums text-ink">Tax year {item.tax_year}</div>
        <div className="type-meta mt-0.5">{item.client_label}</div>
      </div>
      <StatusPill status={item.status} audience="client" />
    </li>
  );
}

interface NextStepCardProps {
  nextStep: ClientNextStepOut | null;
  scope: RoleScopedParams | null;
}

function NextStepCard({ nextStep, scope }: NextStepCardProps) {
  const fulfill = useFulfillRequest(scope);
  const [receivedLabel, setReceivedLabel] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!receivedLabel) {
      return;
    }
    if (!nextStep || nextStep.id !== pendingRequestId) {
      setReceivedLabel(null);
      setPendingRequestId(null);
    }
  }, [nextStep, pendingRequestId, receivedLabel]);

  const canUpload = nextStep?.source === "request" && Boolean(scope);
  const showReceived =
    Boolean(receivedLabel) &&
    (!nextStep || nextStep.id === pendingRequestId);

  // Quiet one-liner when there is nothing actionable — never an empty card.
  if (!showReceived && !canUpload) {
    return (
      <p className="border-l-2 border-seal pl-4 text-[15px] leading-relaxed text-ink">
        You&apos;re all set — we&apos;re preparing your return.
      </p>
    );
  }

  const activeStep = nextStep;
  const docName = activeStep
    ? docNameFromHeadline(activeStep.headline)
    : (receivedLabel ?? "");
  const minutesLabel =
    activeStep && activeStep.estimate_minutes === 1
      ? "1 minute"
      : activeStep
        ? `${activeStep.estimate_minutes} minutes`
        : null;

  async function onUpload() {
    if (!activeStep || activeStep.source !== "request" || !scope) {
      return;
    }
    const name = docNameFromHeadline(activeStep.headline);
    setActionError(null);
    setPendingRequestId(activeStep.id);
    setReceivedLabel(name);
    try {
      await fulfill.mutateAsync(activeStep.id);
    } catch (err: unknown) {
      setReceivedLabel(null);
      setPendingRequestId(null);
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError("Upload could not be completed. Try again.");
      }
    }
  }

  return (
    <section className="border border-rule bg-paper p-6">
      <p className="type-section">Next step</p>
      {activeStep && !showReceived ? (
        <>
          <h2 className="type-page-title mt-3">
            {activeStep.headline}
            {minutesLabel ? (
              <>
                {" "}
                — <span className="font-tabular tabular-nums">{minutesLabel}</span>
              </>
            ) : null}
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink/70">
            Finish this and we can keep moving on your return.
          </p>
        </>
      ) : null}

      {showReceived && receivedLabel ? (
        <p className="mt-4 text-[15px] font-medium leading-relaxed text-seal">
          {receivedLabel} received ✓
        </p>
      ) : (
        <button
          type="button"
          disabled={fulfill.isPending}
          onClick={() => {
            void onUpload();
          }}
          className="btn-primary mt-5"
        >
          Upload {docName}
        </button>
      )}

      {actionError ? (
        <div className="mt-4">
          <ErrorCard message={actionError} />
        </div>
      ) : null}

      <p className="type-meta mt-5">
        Demo: upload is simulated, no file leaves your device.
      </p>
    </section>
  );
}

function docNameFromHeadline(headline: string): string {
  const match = /^upload\s+/i.exec(headline);
  if (match) {
    return headline.slice(match[0].length);
  }
  return headline;
}

interface ProgressTimelineProps {
  activeStepIndex: number;
}

function ProgressTimeline({ activeStepIndex }: ProgressTimelineProps) {
  return (
    <section aria-label="Progress" className="space-y-4">
      <h2 className="type-section">Progress</h2>
      <ProgressTimelineList activeStepIndex={activeStepIndex} />
    </section>
  );
}

function ProgressTimelineList({ activeStepIndex }: ProgressTimelineProps) {
  return (
    <ol className="space-y-3">
      {CLIENT_TIMELINE.map((status, index) => {
        const label = clientStatusLabel(status);
        const active = index === activeStepIndex;
        const complete = index < activeStepIndex;
        return (
          <li key={status} className="flex items-center gap-3 text-[15px] leading-relaxed">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full font-tabular text-[13px] tabular-nums ${
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
