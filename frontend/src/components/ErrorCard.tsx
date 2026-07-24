interface ErrorCardProps {
  message: string;
  title?: string;
}

export function ErrorCard({ message, title = "Could not load this page" }: ErrorCardProps) {
  return (
    <div
      role="alert"
      className="rounded-sm border border-flag/40 bg-flag/5 px-4 py-5 text-sm text-ink"
    >
      <h2 className="font-medium text-flag">{title}</h2>
      <p className="mt-1 text-ink/80">{message}</p>
      <p className="mt-3 text-xs text-ink/60">
        Check that the API is running, then refresh the page.
      </p>
    </div>
  );
}
