import { Link } from "react-router-dom";

interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  body,
  actionLabel,
  actionTo,
  onAction,
}: EmptyStateProps) {
  const line = body || title;

  return (
    <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center">
      <p className="max-w-md text-[15px] leading-relaxed text-ink/60">{line}</p>
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="btn-primary">
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onAction && !actionTo ? (
        <button type="button" onClick={onAction} className="btn-primary">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
