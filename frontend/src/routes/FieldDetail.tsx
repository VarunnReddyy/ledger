import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DocumentPane } from "@/components/DocumentPane";
import { ErrorCard } from "@/components/ErrorCard";
import { FieldValue } from "@/components/FieldValue";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ThreadDrawer } from "@/components/ThreadDrawer";
import { TraceNode } from "@/components/TraceNode";
import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/formatters";
import { queryErrorMessage } from "@/lib/queryErrors";
import {
  useCorrectField,
  useReturnDetail,
  useTrace,
  useVerifyField,
} from "@/lib/queries";
import { useRole } from "@/lib/role-context";
import type {
  ConfidenceBand,
  FieldTrace,
  ReturnFieldOut,
  TraceProvenanceOut,
} from "@/lib/types";

export default function FieldDetailRoute() {
  const { returnId, fieldId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeMembership, activeUser, hrefFor, isFirmSide } = useRole();
  const scope =
    activeMembership && activeUser
      ? { role: activeMembership.role, user: activeUser.id }
      : null;
  const detail = useReturnDetail(returnId, scope);
  const trace = useTrace(fieldId);
  const verify = useVerifyField(fieldId, returnId);
  const correct = useCorrectField(fieldId, returnId);

  const [selectedProvenance, setSelectedProvenance] = useState<TraceProvenanceOut | null>(
    null,
  );
  const [showCorrectForm, setShowCorrectForm] = useState(false);
  const [correctValue, setCorrectValue] = useState("");
  const [correctReason, setCorrectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const chainIds = useMemo(
    () => parseChain(searchParams.get("chain")),
    [searchParams],
  );

  const fieldsById = useMemo(() => {
    const map = new Map<string, ReturnFieldOut>();
    if (!detail.data) {
      return map;
    }
    for (const section of detail.data.sections) {
      for (const field of section.fields) {
        map.set(field.id, field);
      }
    }
    return map;
  }, [detail.data]);

  const fieldThreads = useMemo(() => {
    if (!detail.data || !fieldId) {
      return [];
    }
    return detail.data.threads.filter((thread) =>
      thread.links.some(
        (link) => link.target_type === "field" && link.target_id === fieldId,
      ),
    );
  }, [detail.data, fieldId]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setShowCorrectForm(false);
    setCorrectValue("");
    setCorrectReason("");
    setActionError(null);
    setSelectedProvenance(null);
  }, [fieldId]);

  useEffect(() => {
    if (!trace.isSuccess) {
      return;
    }
    const first = firstProvenance(trace.data);
    setSelectedProvenance(first);
  }, [trace.data, trace.isSuccess, fieldId]);

  function navigateToField(nextFieldId: string, nextChain: string[]) {
    if (!returnId) {
      return;
    }
    void navigate(
      hrefFor(`/returns/${returnId}/fields/${nextFieldId}`, {
        chain: nextChain.length > 0 ? nextChain.join(",") : null,
      }),
    );
  }

  function onNavigateField(nextFieldId: string) {
    if (!fieldId) {
      return;
    }
    navigateToField(nextFieldId, [...chainIds, fieldId]);
  }

  function onVerify() {
    setActionError(null);
    verify.mutate(undefined, {
      onSuccess: () => setToast("Verified"),
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          setActionError(error.message);
          return;
        }
        setActionError(queryErrorMessage(error, "Could not mark this field verified."));
      },
    });
  }

  function onCorrectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    const trimmed = correctValue.trim();
    if (!trimmed) {
      setActionError("Enter a corrected value.");
      return;
    }
    correct.mutate(
      { value: trimmed, reason: correctReason.trim() },
      {
        onSuccess: () => {
          setShowCorrectForm(false);
          setCorrectValue("");
          setCorrectReason("");
          setToast("Corrected");
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setActionError(error.message);
            return;
          }
          setActionError(queryErrorMessage(error, "Could not correct this field."));
        },
      },
    );
  }

  if (detail.isLoading || (Boolean(fieldId) && trace.isLoading)) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton rows={8} label="Loading field provenance" variant="page" />
      </div>
    );
  }

  if (detail.isError) {
    return (
      <ErrorCard message={queryErrorMessage(detail.error, "Return could not be loaded.")} />
    );
  }

  if (!detail.isSuccess || !fieldId || !returnId) {
    return null;
  }

  if (trace.isError) {
    return (
      <ErrorCard
        message={queryErrorMessage(trace.error, "Field provenance could not be loaded.")}
      />
    );
  }

  if (!trace.isSuccess) {
    return null;
  }

  const field = trace.data.field;
  const annotation = trace.data.annotation;
  const transform = trace.data.transform;
  const correction = trace.data.correction;
  const locked = field.state === "locked";
  const canMutate = !locked;

  return (
    <div className="space-y-8">
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 border border-rule bg-paper px-4 py-2 text-[15px] leading-relaxed text-seal shadow-sm"
        >
          {toast}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-b border-rule pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-tabular text-[13px] tabular-nums text-ink/55">{detail.data.id}</p>
          <h1 className="type-page-title mt-1">
            <span className="font-tabular tabular-nums">{field.line_ref}</span> · {field.label}
          </h1>
          <p className="mt-1 text-[15px] leading-relaxed text-ink/70">
            {detail.data.client_name} ·{" "}
            <span className="font-tabular tabular-nums">{detail.data.tax_year}</span> · Form{" "}
            {detail.data.form_type}
          </p>
          {chainIds.length > 0 ? (
            <nav className="mt-3 flex flex-wrap items-center gap-2 text-[15px]" aria-label="Field trail">
              {chainIds.map((id, index) => {
                const crumb = fieldsById.get(id);
                const label = crumb?.line_ref ?? id;
                const crumbChain = chainIds.slice(0, index);
                return (
                  <span key={id} className="flex items-center gap-2">
                    <Link
                      to={hrefFor(`/returns/${returnId}/fields/${id}`, {
                        chain: crumbChain.length > 0 ? crumbChain.join(",") : null,
                      })}
                      className="font-tabular tabular-nums text-ink underline-offset-2 hover:underline"
                    >
                      {label}
                    </Link>
                    <span className="text-ink/40" aria-hidden>
                      →
                    </span>
                  </span>
                );
              })}
              <span className="font-tabular tabular-nums text-ink">{field.line_ref}</span>
            </nav>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            Discussion
            {fieldThreads.length > 0 ? (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-sm bg-ink/10 px-1.5 py-0.5 font-tabular text-[13px] tabular-nums text-ink">
                {fieldThreads.length}
              </span>
            ) : null}
          </button>
          <Link
            to={hrefFor(`/returns/${returnId}`)}
            className="type-meta underline-offset-2 hover:text-ink hover:underline"
          >
            Back to return
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <section aria-label="Field explanation" className="space-y-6">
          <FieldValue
            label={field.label}
            lineRef={field.line_ref}
            value={field.value}
            state={field.state}
            lockedReason={fieldsById.get(field.id)?.locked_reason}
            selected
          />

          {correction ? (
            <div
              className="border-l-2 border-rule py-1 pl-4 text-[15px] leading-relaxed text-ink/80"
              role="status"
            >
              AI read {formatMoney(correction.old_value)} — corrected to{" "}
              <span className="font-tabular tabular-nums">{formatMoney(correction.new_value)}</span>{" "}
              by you
              {correction.reason ? (
                <>
                  {" "}
                  · <span className="text-ink/55">{correction.reason}</span>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="border border-rule bg-paper p-6">
            <h2 className="type-section">How Ledger got this</h2>
            {transform ? (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-ink/70">
                  {transform.human_explanation}
                </p>
                <div className="mt-4">
                  <TraceNode
                    trace={trace.data}
                    selectedProvenanceId={selectedProvenance?.id ?? null}
                    onSelectProvenance={setSelectedProvenance}
                    onNavigateField={onNavigateField}
                  />
                </div>
              </>
            ) : (
              <p className="mt-3 text-[15px] leading-relaxed text-ink/70">
                No calculation trail is attached to this field yet.
              </p>
            )}
          </div>

          {annotation ? (
            <div className="space-y-2 border-t border-rule pt-6 text-[15px] leading-relaxed">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="type-section">Annotation</h2>
                <ConfidenceChip band={annotation.band} />
              </div>
              <p className="text-ink/70">{annotation.rationale}</p>
              {annotation.uncertainty_note ? (
                <p className="text-[13px] text-pending">{annotation.uncertainty_note}</p>
              ) : null}
              <details className="mt-2">
                <summary className="type-meta cursor-pointer hover:text-ink">
                  Details
                </summary>
                <p className="mt-2 font-tabular text-[13px] tabular-nums text-ink/55">
                  Raw confidence {annotation.confidence.toFixed(2)}
                </p>
              </details>
            </div>
          ) : null}

          {actionError ? (
            <p className="text-[15px] leading-relaxed text-flag" role="alert">
              {actionError}
            </p>
          ) : null}

          {locked ? (
            <p className="text-[15px] leading-relaxed text-ink/55">
              {fieldsById.get(field.id)?.locked_reason ?? "This field is locked."}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {field.state !== "verified" ? (
              <button
                type="button"
                onClick={onVerify}
                disabled={verify.isPending}
                className="btn-primary"
              >
                {verify.isPending ? "Marking verified…" : "Mark verified"}
              </button>
            ) : null}
            {canMutate ? (
              <button
                type="button"
                onClick={() => {
                  setShowCorrectForm((open) => !open);
                  setActionError(null);
                }}
                className="btn-secondary"
              >
                Correct this
              </button>
            ) : null}
          </div>

          {showCorrectForm ? (
            <form
              onSubmit={onCorrectSubmit}
              className="space-y-3 border-t border-rule pt-6"
            >
              <div>
                <label htmlFor="correct-value" className="type-meta block">
                  New value
                </label>
                <input
                  id="correct-value"
                  name="value"
                  value={correctValue}
                  onChange={(event) => setCorrectValue(event.target.value)}
                  className="mt-2 w-full rounded-sm border border-rule bg-paper px-3 py-2 font-tabular text-[15px] tabular-nums"
                  inputMode="decimal"
                  required
                />
              </div>
              <div>
                <label htmlFor="correct-reason" className="type-meta block">
                  Reason <span className="font-normal">(optional)</span>
                </label>
                <input
                  id="correct-reason"
                  name="reason"
                  value={correctReason}
                  onChange={(event) => setCorrectReason(event.target.value)}
                  className="mt-2 w-full rounded-sm border border-rule bg-paper px-3 py-2 text-[15px]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={correct.isPending}
                  className="btn-primary"
                >
                  {correct.isPending ? "Saving correction…" : "Save correction"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCorrectForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <DocumentPane provenance={selectedProvenance} />
      </div>

      <ThreadDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        threads={fieldThreads}
        scope={scope}
        isFirmSide={isFirmSide}
      />
    </div>
  );
}

interface ConfidenceChipProps {
  band: ConfidenceBand;
}

function ConfidenceChip({ band }: ConfidenceChipProps) {
  return (
    <span className="rounded-sm bg-machine/10 px-2 py-0.5 text-[13px] capitalize text-machine">
      {band}
    </span>
  );
}

function parseChain(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function firstProvenance(trace: FieldTrace): TraceProvenanceOut | null {
  const transform = trace.transform;
  if (!transform) {
    return null;
  }
  for (const input of transform.inputs) {
    if (input.type === "provenance") {
      return input.provenance;
    }
  }
  return null;
}
