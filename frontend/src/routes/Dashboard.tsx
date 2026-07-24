import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { formatDate } from "@/lib/formatters";
import { queryErrorMessage } from "@/lib/queryErrors";
import { useTasks } from "@/lib/queries";
import { useRole } from "@/lib/role-context";
import type { TaskListItem, TaskPriority } from "@/lib/types";

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
    if (isReviewer && needsReviewOnly) {
      return tasks.data.filter((task) => task.owner_role === "reviewer");
    }
    return tasks.data;
  }, [isReviewer, needsReviewOnly, tasks.data]);

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
          <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s work</h1>
          <p className="mt-1 text-sm text-ink/70">
            Ranked tasks across open returns for {activeUser.name}.
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

      {tasks.isSuccess && visibleTasks.length > 0 ? (
        <TaskList tasks={visibleTasks} hrefFor={hrefFor} />
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
      {tasks.map((task, index) => (
        <li key={task.id} className={index % 2 === 1 ? "bg-ledger/50" : "bg-paper"}>
          <Link
            to={hrefFor(`/returns/${task.return_id}`)}
            className="flex flex-col gap-1 px-4 py-3 hover:bg-ledger/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="text-sm font-medium text-ink">{task.title}</div>
              <div className="mt-0.5 text-xs text-ink/60">
                {task.client_name} · <span className="font-tabular">{task.id}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <PriorityMark priority={task.priority} />
              <span className="font-tabular text-ink/60">Due {formatDate(task.due_date)}</span>
            </div>
          </Link>
        </li>
      ))}
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
