import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ErrorCard } from "@/components/ErrorCard";
import { queryErrorMessage } from "@/lib/queryErrors";
import { isFirmSideRole, useRole } from "@/lib/role-context";
import type { Role } from "@/lib/types";

const DEFAULT_FIRM_MEMBERSHIP_ID = "mem_dana_preparer";
const DEFAULT_CLIENT_MEMBERSHIP_ID = "mem_alex_owner";

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
          <RoleSwitcher
            activeLabel={activeMembership?.label ?? null}
            activeName={activeUser?.name ?? null}
            disabled={isLoading || isError || options.length === 0}
            isFirmSide={isFirmSide}
            options={options.map((option) => ({
              id: option.membership.id,
              name: option.user.name,
              label: option.membership.label,
              role: option.membership.role,
            }))}
            selectedId={activeMembership?.id ?? null}
            onSelect={setActiveMembership}
          />
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
  isFirmSide: boolean;
  onSelect: (membershipId: string) => void;
}

type AudienceSide = "firm" | "client";

function RoleSwitcher({
  activeName,
  activeLabel,
  selectedId,
  options,
  disabled,
  isFirmSide,
  onSelect,
}: RoleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const chevronRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeSide: AudienceSide = isFirmSide ? "firm" : "client";

  const sideOptions = useMemo(
    () =>
      options.filter((option) =>
        activeSide === "firm"
          ? isFirmSideRole(option.role)
          : !isFirmSideRole(option.role),
      ),
    [activeSide, options],
  );

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
        chevronRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const selectedIndex = sideOptions.findIndex((option) => option.id === selectedId);
    const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;
    itemRefs.current[focusIndex]?.focus();
  }, [open, selectedId, sideOptions]);

  const identityName = activeName ?? "Choose role";
  const identityLabel = activeLabel ?? "Loading membership";

  function selectSide(side: AudienceSide) {
    const targetId =
      side === "firm" ? DEFAULT_FIRM_MEMBERSHIP_ID : DEFAULT_CLIENT_MEMBERSHIP_ID;
    onSelect(targetId);
  }

  function onRadiogroupKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      selectSide(activeSide === "firm" ? "client" : "firm");
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      selectSide(activeSide === "firm" ? "client" : "firm");
    }
  }

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (sideOptions.length === 0) {
      return;
    }
    const currentIndex = itemRefs.current.findIndex(
      (node) => node === document.activeElement,
    );
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = currentIndex < 0 ? 0 : (currentIndex + 1) % sideOptions.length;
      itemRefs.current[next]?.focus();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        currentIndex < 0
          ? sideOptions.length - 1
          : (currentIndex - 1 + sideOptions.length) % sideOptions.length;
      itemRefs.current[next]?.focus();
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      itemRefs.current[0]?.focus();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      itemRefs.current[sideOptions.length - 1]?.focus();
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3" ref={rootRef}>
      <div
        role="radiogroup"
        aria-label="Audience"
        className="inline-flex rounded-full border border-rule p-0.5"
        onKeyDown={onRadiogroupKeyDown}
      >
        <SideSegment
          label="Firm"
          checked={activeSide === "firm"}
          disabled={disabled}
          onSelect={() => selectSide("firm")}
        />
        <SideSegment
          label="Client"
          checked={activeSide === "client"}
          disabled={disabled}
          onSelect={() => selectSide("client")}
        />
      </div>

      <p className="min-w-0 max-w-[9rem] truncate text-xs text-ink/70 sm:max-w-[12rem]">
        <span className="font-medium text-ink">{identityName}</span>
        <span className="text-ink/40"> · </span>
        <span>{identityLabel}</span>
      </p>

      <div className="relative">
        <button
          ref={chevronRef}
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rule text-ink/60 hover:bg-ledger/50 disabled:opacity-50"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={listId}
          aria-label="Memberships for this side"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
        {open ? (
          <div
            id={listId}
            role="menu"
            aria-label={activeSide === "firm" ? "Firm memberships" : "Client memberships"}
            className="absolute right-0 z-20 mt-1 max-h-72 w-64 overflow-auto border border-rule bg-paper py-1 shadow-sm"
            onKeyDown={onMenuKeyDown}
          >
            {sideOptions.map((option, index) => {
              const selected = option.id === selectedId;
              return (
                <button
                  key={option.id}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={`flex w-full flex-col px-3 py-2 text-left text-sm outline-none focus-visible:bg-ledger ${
                    selected ? "bg-ledger" : "hover:bg-ledger/50"
                  }`}
                  onClick={() => {
                    onSelect(option.id);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-ink">{option.name}</span>
                  <span className="text-xs text-ink/60">{option.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface SideSegmentProps {
  label: string;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function SideSegment({ label, checked, disabled, onSelect }: SideSegmentProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={checked ? 0 : -1}
      disabled={disabled}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        checked ? "bg-seal text-paper" : "bg-transparent text-ink/70 hover:text-ink"
      }`}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}
