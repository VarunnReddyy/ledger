import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { FirmOverview } from "@/components/FirmOverview";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { formatDueness } from "@/lib/formatters";
import { queryErrorMessage } from "@/lib/queryErrors";
import { useFirmOverview, useTasks } from "@/lib/queries";
import { useRole } from "@/lib/role-context";
import type { TaskListItem, TaskPriority } from "@/lib/types";

const TODAY_LIMIT = 5;
const OWNER_PARAM = "owner";

export default function DashboardRoute() {
  const {
    activeMembership,
    activeUser,
    error: roleErr,
    hrefFor,
    isError: roleError,
    isFirmSide,
    isLoading: roleLoading,
  } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [weekExpanded, setWeekExpanded] = useState(false);

  const role = activeMembership?.role;
  const userId = activeUser?.id;
  const isFirmAdmin = role === "firm_admin";
  const ownerFilter = searchParams.get(OWNER_PARAM);

  const scope = role && userId ? { role, user: userId } : null;
  const tasks = useTasks(scope);
  const overview = useFirmOverview(scope, { enabled: isFirmAdmin });

  const isReviewer = role === "reviewer";

  const visibleTasks = useMemo(() => {
    if (!tasks.data) {
      return [];
    }
    let ranked = [...tasks.data].sort(
      (a, b) => b.priority_score - a.priority_score || a.id.localeCompare(b.id),
    );
    if (isReviewer && needsReviewOnly) {
      ranked = ranked.filter((task) => task.owner_role === "reviewer");
    }
    if (isFirmAdmin && ownerFilter) {
      ranked = ranked.filter((task) => task.owner_user_id === ownerFilter);
    }
    return ranked;
  }, [isFirmAdmin, isReviewer, needsReviewOnly, ownerFilter, tasks.data]);

  const todayTasks = visibleTasks.slice(0, TODAY_LIMIT);
  const weekTasks = visibleTasks.slice(TODAY_LIMIT);
  const moreCount = weekTasks.length;

  function setOwnerFilter(next: string | null) {
    const nextParams = new URLSearchParams(searchParams);
    if (next) {
      nextParams.set(OWNER_PARAM, next);
    } else {
      nextParams.delete(OWNER_PARAM);
    }
    setSearchParams(nextParams, { replace: true });
    setWeekExpanded(false);
  }

  if (roleError) {
    return (
      <ErrorCard message={queryErrorMessage(roleErr, "Dashboard could not be loaded.")} />
    );
  }

  if (roleLoading || !activeMembership || !activeUser) {
    return <LoadingSkeleton rows={6} label="Loading dashboard" variant="page" />;
  }

  if (!isFirmSide) {
    return null;
  }

  return (
    <div className="space-y-8">
      {isFirmAdmin ? (
        overview.isLoading ? (
          <LoadingSkeleton rows={4} label="Loading firm overview" variant="list" />
        ) : overview.isError ? (
          <ErrorCard
            message={queryErrorMessage(
              overview.error,
              "Firm overview could not be loaded.",
            )}
          />
        ) : overview.data ? (
          <FirmOverview
            overview={overview.data}
            selectedOwnerId={ownerFilter}
            onSelectOwner={setOwnerFilter}
          />
        ) : null
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="type-page-title">Today</h1>
          <p className="mt-1 text-[15px] leading-relaxed text-ink/70">
            {isFirmAdmin
              ? "Across the firm — ranked by urgency."
              : "Ranked by urgency — deadlines, blockers, and review load."}
          </p>
        </div>
        {isReviewer ? (
          <button
            type="button"
            aria-pressed={needsReviewOnly}
            onClick={() => setNeedsReviewOnly((current) => !current)}
            className={`btn-secondary self-start ${
              needsReviewOnly ? "border-ink/30 bg-ledger text-ink" : ""
            }`}
          >
            Needs review
          </button>
        ) : null}
      </div>

      {tasks.isLoading ? <LoadingSkeleton rows={6} label="Loading tasks" variant="list" /> : null}

      {tasks.isError ? (
        <ErrorCard message={queryErrorMessage(tasks.error, "Tasks could not be loaded.")} />
      ) : null}

      {tasks.isSuccess && visibleTasks.length === 0 ? (
        <EmptyState
          title={
            needsReviewOnly
              ? "Nothing needs review"
              : ownerFilter
                ? "No open tasks for this staffer"
                : "No open tasks"
          }
          body={
            needsReviewOnly
              ? "Reviewer-owned tasks will show up here when returns are ready for sign-off."
              : ownerFilter
                ? "Clear the staff filter above to see the firm-wide queue again."
                : "When returns need attention, they will show up here ranked by priority."
          }
        />
      ) : null}

      {tasks.isSuccess && todayTasks.length > 0 ? (
        <section aria-label="Today">
          <TaskList
            tasks={weekExpanded ? [...todayTasks, ...weekTasks] : todayTasks}
            hrefFor={hrefFor}
          />
          {moreCount > 0 ? (
            <button
              type="button"
              aria-expanded={weekExpanded}
              onClick={() => setWeekExpanded((current) => !current)}
              className="mt-3 text-[13px] text-ink/55 underline-offset-2 hover:text-ink hover:underline active:translate-y-px"
            >
              {weekExpanded ? "Show less" : (
                <>
                  <span className="font-tabular">{moreCount}</span> more this week ›
                </>
              )}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

interface TaskListProps {
  tasks: TaskListItem[];
  hrefFor: (pathname: string) => string;
}

function TaskList({ tasks, hrefFor }: TaskListProps) {
  return (
    <ul className="divide-y divide-rule">
      {tasks.map((task) => {
        const dueness = formatDueness(task.due_date);
        return (
          <li key={task.id}>
            <Link
              to={hrefFor(`/returns/${task.return_id}`)}
              className="flex cursor-pointer flex-col gap-2 px-0 py-3 hover:bg-ledger sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div>
                <div className="text-[15px] font-medium leading-relaxed text-ink">
                  {task.title}
                </div>
                <div className="type-meta mt-0.5">{task.client_name}</div>
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                <PriorityMark priority={task.priority} />
                <span className={`font-tabular tabular-nums ${dueness.className}`}>
                  {dueness.label}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

interface PriorityMarkProps {
  priority: TaskPriority;
}

function PriorityMark({ priority }: PriorityMarkProps) {
  const tone =
    priority === "critical"
      ? "text-flag"
      : priority === "high"
        ? "text-ink/70"
        : "text-ink/55";
  return <span className={`capitalize ${tone}`}>{priority}</span>;
}
