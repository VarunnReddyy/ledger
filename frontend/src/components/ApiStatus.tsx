import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api";

export function ApiStatus() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: 1,
  });

  if (health.isLoading) {
    return <span className="text-xs text-ink/50">Checking API…</span>;
  }

  if (health.isError) {
    return (
      <span className="text-xs text-flag" title="Start Flask on port 8000">
        API offline
      </span>
    );
  }

  return <span className="text-xs text-seal">API connected</span>;
}
