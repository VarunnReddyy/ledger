interface LoadingSkeletonProps {
  rows?: number;
  label?: string;
  /** Mirror the destination layout: page chrome, list rows, or dense table. */
  variant?: "page" | "list" | "table" | "letter";
}

export function LoadingSkeleton({
  rows = 5,
  label = "Loading",
  variant = "page",
}: LoadingSkeletonProps) {
  if (variant === "letter") {
    return (
      <div className="space-y-8" role="status" aria-live="polite" aria-label={label}>
        <div className="space-y-2">
          <div className="h-[13px] w-28 animate-pulse bg-ledger" />
          <div className="h-8 w-56 animate-pulse bg-ledger" />
          <div className="h-[13px] w-40 animate-pulse bg-ledger" />
        </div>
        <div className="space-y-3 border border-rule p-6">
          <div className="h-[13px] w-20 animate-pulse bg-ledger" />
          <div className="h-8 w-full max-w-md animate-pulse bg-ledger" />
          <div className="h-[15px] w-64 animate-pulse bg-ledger" />
          <div className="mt-2 h-10 w-36 animate-pulse bg-ledger" />
        </div>
        <div className="space-y-3">
          <div className="h-[13px] w-24 animate-pulse bg-ledger" />
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-ledger" />
              <div className="h-[15px] w-48 animate-pulse bg-ledger" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="space-y-8" role="status" aria-live="polite" aria-label={label}>
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse bg-ledger" />
          <div className="h-[15px] w-72 animate-pulse bg-ledger" />
        </div>
        <div>
          <div className="flex gap-6 border-b border-rule py-2">
            <div className="h-[13px] w-16 animate-pulse bg-ledger" />
            <div className="h-[13px] w-12 animate-pulse bg-ledger" />
            <div className="h-[13px] w-14 animate-pulse bg-ledger" />
            <div className="ml-auto h-[13px] w-10 animate-pulse bg-ledger" />
          </div>
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-6 border-b border-rule py-3"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="h-[15px] w-36 animate-pulse bg-ledger" />
              <div className="h-[15px] w-16 animate-pulse bg-ledger" />
              <div className="h-[15px] w-24 animate-pulse bg-ledger" />
              <div className="ml-auto h-[15px] w-20 animate-pulse bg-ledger" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div role="status" aria-live="polite" aria-label={label}>
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 border-b border-rule py-3"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="space-y-2">
              <div className="h-[15px] w-48 animate-pulse bg-ledger" />
              <div className="h-[13px] w-28 animate-pulse bg-ledger" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-[13px] w-14 animate-pulse bg-ledger" />
              <div className="h-[13px] w-20 animate-pulse bg-ledger" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8" role="status" aria-live="polite" aria-label={label}>
      <div className="space-y-2">
        <div className="h-8 w-36 animate-pulse bg-ledger" />
        <div className="h-[15px] w-64 animate-pulse bg-ledger" />
      </div>
      <div>
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 border-b border-rule py-3"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="space-y-2">
              <div className="h-[15px] w-52 animate-pulse bg-ledger" />
              <div className="h-[13px] w-32 animate-pulse bg-ledger" />
            </div>
            <div className="h-[13px] w-24 animate-pulse bg-ledger" />
          </div>
        ))}
      </div>
    </div>
  );
}
