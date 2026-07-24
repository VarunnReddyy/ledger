interface ErrorCardProps {
  message: string;
  title?: string;
}

export function ErrorCard({ message, title = "Could not load this page" }: ErrorCardProps) {
  return (
    <div role="alert" className="border-l-2 border-flag py-1 pl-4">
      <h2 className="text-[15px] font-medium leading-relaxed text-flag">{title}</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-ink/80">{message}</p>
      <p className="mt-2 text-[13px] text-ink/55">
        Check that the API is running, then refresh the page.
      </p>
    </div>
  );
}