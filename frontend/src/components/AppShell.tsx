import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ApiStatus } from "@/components/ApiStatus";
import { ErrorCard } from "@/components/ErrorCard";
import { queryErrorMessage } from "@/lib/queryErrors";
import { isFirmSideRole, useRole } from "@/lib/role-context";
import type { Role } from "@/lib/types";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

function firmNav(hrefFor: (path: string) => string): NavItem[] {
  return [
    { to: hrefFor("/"), label: "Dashboard", end: true },
    { to: hrefFor("/returns"), label: "Returns" },
    { to: hrefFor("/documents"), label: "Documents" },
  ];
}

function clientNav(hrefFor: (path: string) => string, clientId: string): NavItem[] {
  return [{ to: hrefFor(`/portal/${clientId}`), label: "My return", end: true }];
}

export function AppShell() {
  const {
    activeMembership,
    activeUser,
    clearNotice,
    error: roleError,
    hrefFor,
    homePath,
    isError,
    isFirmSide,
    isLoading,
    notice,
    options,
    setActiveMembership,
  } = useRole();

  const navItems: NavItem[] =
    isFirmSide || !activeMembership?.client_id
      ? firmNav(hrefFor)
      : clientNav(hrefFor, activeMembership.client_id);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <NavLink
              to={hrefFor(homePath)}
              className="shrink-0 text-lg font-semibold tracking-tight text-ink"
            >
              Ledger
            </NavLink>
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end ?? false}
                  className={({ isActive }) =>
                    `rounded-sm px-2.5 py-1.5 text-sm ${
                      isActive ? "bg-ledger text-ink" : "text-ink/70 hover:bg-ledger/60 hover:text-ink"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <RoleSwitcher
              activeLabel={activeMembership?.label ?? null}
              activeName={activeUser?.name ?? null}
              disabled={isLoading || isError || options.length === 0}
              options={options.map((option) => ({
                id: option.membership.id,
                name: option.user.name,
                label: option.membership.label,
                role: option.membership.role,
              }))}
              selectedId={activeMembership?.id ?? null}
              onSelect={setActiveMembership}
            />
            <ApiStatus />
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:hidden sm:px-6"
          aria-label="Primary mobile"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) =>
                `shrink-0 rounded-sm px-2.5 py-1.5 text-sm ${
                  isActive ? "bg-ledger text-ink" : "text-ink/70 hover:bg-ledger/60 hover:text-ink"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {notice ? (
          <p
            className="mb-4 border border-rule bg-ledger/40 px-3 py-2 text-sm text-ink/70"
            role="status"
          >
            {notice}
            <button
              type="button"
              className="ml-3 text-ink/50 underline-offset-2 hover:text-ink hover:underline"
              onClick={clearNotice}
            >
              Dismiss
            </button>
          </p>
        ) : null}
        {isError ? (
          <ErrorCard
            message={queryErrorMessage(roleError, "Memberships could not be loaded.")}
          />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}

interface RoleSwitcherOption {
  id: string;
  name: string;
  label: string;
  role: Role;
}

interface RoleSwitcherProps {
  activeName: string | null;
  activeLabel: string | null;
  selectedId: string | null;
  options: RoleSwitcherOption[];
  disabled: boolean;
  onSelect: (membershipId: string) => void;
}

function RoleSwitcher({
  activeName,
  activeLabel,
  selectedId,
  options,
  disabled,
  onSelect,
}: RoleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root) {
        return;
      }
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const title = activeName ?? "Choose role";
  const subtitle = activeLabel ?? "Loading membership";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="flex max-w-[14rem] items-center gap-1.5 rounded-sm border border-rule bg-paper px-2.5 py-1.5 text-left text-sm hover:bg-ledger/50 disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{title}</span>
          <span className="block truncate text-xs text-ink/60">{subtitle}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink/50" aria-hidden />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Switch role"
          className="absolute right-0 z-20 mt-1 max-h-72 w-64 overflow-auto border border-rule bg-paper py-1 shadow-sm"
        >
          {options.map((option) => {
            const selected = option.id === selectedId;
            const side = isFirmSideRole(option.role) ? "Firm" : "Client";
            return (
              <li key={option.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`flex w-full flex-col px-3 py-2 text-left text-sm ${
                    selected ? "bg-ledger" : "hover:bg-ledger/50"
                  }`}
                  onClick={() => {
                    onSelect(option.id);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-ink">{option.name}</span>
                  <span className="text-xs text-ink/60">
                    {option.label}
                    <span className="text-ink/40"> · {side}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
