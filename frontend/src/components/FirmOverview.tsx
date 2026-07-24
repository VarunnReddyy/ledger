import type { FirmOverview as FirmOverviewData, StaffLoadItem } from "@/lib/types";

interface FirmOverviewProps {
  overview: FirmOverviewData;
  selectedOwnerId: string | null;
  onSelectOwner: (userId: string | null) => void;
}

export function FirmOverview({
  overview,
  selectedOwnerId,
  onSelectOwner,
}: FirmOverviewProps) {
  const nonzeroStatuses = overview.returns_by_status.filter((item) => item.count > 0);

  return (
    <section aria-label="Firm overview" className="space-y-5">
      <h2 className="type-section">Firm overview</h2>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:gap-8">
        {nonzeroStatuses.length > 0 ? (
          <div className="flex min-w-0 flex-1 gap-1">
            {nonzeroStatuses.map((item) => (
              <div
                key={item.status}
                className="min-w-0"
                style={{ flexGrow: item.count, flexBasis: 0 }}
              >
                <div className="font-tabular text-[13px] tabular-nums text-ink">
                  {item.count}
                </div>
                <div className="mt-1 h-2 w-full bg-ink/8" aria-hidden="true" />
                <div className="type-meta mt-1 truncate" title={item.staff_label}>
                  {item.staff_label}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="type-meta flex-1">No returns in the firm yet.</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          <span
            className={
              overview.overdue_tasks > 0 ? "text-flag" : "text-ink/55"
            }
          >
            <span className="font-tabular tabular-nums">{overview.overdue_tasks}</span>{" "}
            overdue
          </span>
          <span className="text-ink/55">
            <span className="font-tabular tabular-nums">{overview.blocked_tasks}</span>{" "}
            blocked
          </span>
          <span
            className={
              overview.awaiting_client > 0 ? "text-pending" : "text-ink/55"
            }
          >
            <span className="font-tabular tabular-nums">
              {overview.awaiting_client}
            </span>{" "}
            awaiting client
          </span>
        </div>
      </div>

      {overview.staff_load.length > 0 ? (
        <ul className="divide-y divide-rule border-y border-rule">
          {overview.staff_load.map((staffer) => (
            <StaffLoadRow
              key={staffer.user_id}
              staffer={staffer}
              selected={selectedOwnerId === staffer.user_id}
              onSelect={() =>
                onSelectOwner(
                  selectedOwnerId === staffer.user_id ? null : staffer.user_id,
                )
              }
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

interface StaffLoadRowProps {
  staffer: StaffLoadItem;
  selected: boolean;
  onSelect: () => void;
}

function StaffLoadRow({ staffer, selected, onSelect }: StaffLoadRowProps) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`flex w-full items-baseline justify-between gap-4 px-0 py-2.5 text-left hover:bg-ledger ${
          selected ? "bg-ledger" : ""
        }`}
      >
        <span className="text-[15px] leading-relaxed text-ink">{staffer.name}</span>
        <span className="flex shrink-0 items-baseline gap-3 text-[13px]">
          <span className="font-tabular tabular-nums text-ink">
            {staffer.open_tasks}
          </span>
          {staffer.overdue > 0 ? (
            <span className="font-tabular tabular-nums text-flag">
              {staffer.overdue}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
