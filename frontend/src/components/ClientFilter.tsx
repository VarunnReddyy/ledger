import { useSearchParams } from "react-router-dom";
import { useClients } from "@/lib/queries";

const CLIENT_PARAM = "client";

interface ClientFilterProps {
  onChange?: () => void;
}

export function ClientFilter({ onChange }: ClientFilterProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const clients = useClients();
  const value = searchParams.get(CLIENT_PARAM) ?? "";

  function setClient(next: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (next) {
      nextParams.set(CLIENT_PARAM, next);
    } else {
      nextParams.delete(CLIENT_PARAM);
    }
    setSearchParams(nextParams, { replace: true });
    onChange?.();
  }

  return (
    <label className="type-meta flex min-w-[12rem] flex-col gap-2">
      Client
      <select
        value={value}
        disabled={clients.isLoading || clients.isError}
        onChange={(event) => setClient(event.target.value)}
        className="rounded-sm border border-rule bg-paper px-3 py-2 text-[15px] text-ink disabled:opacity-50"
      >
        <option value="">All clients</option>
        {(clients.data ?? []).map((client) => (
          <option key={client.id} value={client.id}>
            {client.display_name}
          </option>
        ))}
      </select>
    </label>
  );
}
