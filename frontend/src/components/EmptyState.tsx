import { Link } from "react-router-dom";

interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

const actionClassName =
  "mt-5 inline-flex items-center rounded-sm bg-seal px-3 py-2 text-sm font-medium text-paper hover:bg-seal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal";

export function EmptyState({
  title,
  body,
  actionLabel,
  actionTo,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-sm border border-dashed border-rule bg-paper px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">{body}</p>
      {actionLabel && actionTo ? (
        <Link to={actionTo} className={actionClassName}>
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onAction && !actionTo ? (
        <button type="button" onClick={onAction} className={actionClassName}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
