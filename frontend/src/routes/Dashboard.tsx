import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { formatDueness } from "@/lib/formatters";
import { queryErrorMessage } from "@/lib/queryErrors";
import { useTasks } from "@/lib/queries";
import { useRole } from "@/lib/role-context";
import type { TaskListItem, TaskPriority } from "@/lib/types";

const TODAY_LIMIT = 5;

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
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [weekExpanded, setWeekExpanded] = useState(false);

  const role = activeMembership?.role;
  const userId = activeUser?.id;
  const tasks = useTasks(
    role && userId ? { role, user: userId } : null,
  );

  const isReviewer = role === "reviewer";

  const visibleTasks = useMemo(() => {
    if (!tasks.data) {
      return [];
    }
    const ranked = [...tasks.data].sort(
      (a, b) => b.priority_score - a.priority_score || a.id.localeCompare(b.id),
    );
    if (isReviewer && needsReviewOnly) {
      return ranked.filter((task) => task.owner_role === "reviewer");
    }
    return ranked;
  }, [isReviewer, needsReviewOnly, tasks.data]);

  const todayTasks = visibleTasks.slice(0, TODAY_LIMIT);
  const weekTasks = visibleTasks.slice(TODAY_LIMIT);
  const moreCount = weekTasks.length;

  if (roleError) {
    return (
      <ErrorCard message={queryErrorMessage(roleErr, "Dashboard could not be loaded.")} />
    );
  }

  if (roleLoading || !activeMembership || !activeUser) {
    return <LoadingSkeleton rows={6} label="Loading dashboard" />;
  }

  if (!isFirmSide) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="mt-1 text-sm text-ink/70">
            Ranked by urgency — deadlines, blockers, and review load.
          </p>
        </div>
        {isReviewer ? (
          <button
            type="button"
            aria-pressed={needsReviewOnly}
            onClick={() => setNeedsReviewOnly((current) => !current)}
            className={`self-start rounded-sm border px-3 py-1.5 text-sm ${
              needsReviewOnly
                ? "border-pending bg-ledger text-pending"
                : "border-rule text-ink/70 hover:bg-ledger/50"
            }`}
          >
            Needs review
          </button>
        ) : null}
      </div>

      {tasks.isLoading ? <LoadingSkeleton rows={6} label="Loading tasks" /> : null}

      {tasks.isError ? (
        <ErrorCard message={queryErrorMessage(tasks.error, "Tasks could not be loaded.")} />
      ) : null}

      {tasks.isSuccess && visibleTasks.length === 0 ? (
        <EmptyState
          title={needsReviewOnly ? "Nothing needs review" : "No open tasks"}
          body={
            needsReviewOnly
              ? "Reviewer-owned tasks will show up here when returns are ready for sign-off."
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
              className="mt-3 text-sm text-ink/55 underline-offset-2 hover:text-ink hover:underline"
            >
              {weekExpanded ? "Show less" : `${moreCount} more this week ›`}
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
    <ul className="divide-y divide-rule border border-rule">
      {tasks.map((task, index) => {
        const dueness = formatDueness(task.due_date);
        return (
          <li key={task.id} className={index % 2 === 1 ? "bg-ledger/50" : "bg-paper"}>
            <Link
              to={hrefFor(`/returns/${task.return_id}`)}
              className="flex cursor-pointer flex-col gap-1 px-4 py-3 hover:bg-ledger sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="text-sm font-medium text-ink">{task.title}</div>
                <div className="mt-0.5 text-xs text-ink/60">{task.client_name}</div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <PriorityMark priority={task.priority} />
                <span className={`font-tabular ${dueness.className}`}>{dueness.label}</span>
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
        ? "text-pending"
        : "text-ink/50";
  return <span className={`capitalize ${tone}`}>{priority}</span>;
}
