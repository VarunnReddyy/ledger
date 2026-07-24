interface LoadingSkeletonProps {
  rows?: number;
  label?: string;
}

export function LoadingSkeleton({ rows = 5, label = "Loading" }: LoadingSkeletonProps) {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-12 animate-pulse rounded-sm bg-ledger"
          style={{ animationDelay: `${index * 40}ms` }}
        />
      ))}
    </div>
  );
}
