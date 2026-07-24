import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { ErrorCard } from "@/components/ErrorCard";
import { queryErrorMessage } from "@/lib/queryErrors";
import { isFirmSideRole, useRole, WELCOME_PATH } from "@/lib/role-context";
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

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return [
    "relative px-2.5 py-1.5 text-[15px]",
    isActive
      ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-seal"
      : "text-ink/70 hover:bg-ledger hover:text-ink",
  ].join(" ");
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
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-8 py-3">
          <div className="flex min-w-0 items-center gap-8">
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
                  className={navLinkClass}
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
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-8 pb-3 sm:hidden"
          aria-label="Primary mobile"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              className={navLinkClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-8 py-8">
        {notice ? (
          <p
            className="mb-8 border-b border-rule pb-4 text-[15px] leading-relaxed text-ink/70"
            role="status"
          >
            {notice}
            <button
              type="button"
              className="ml-3 text-[13px] text-ink/55 underline-offset-2 hover:text-ink hover:underline active:translate-y-px"
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
  const switchRef = useRef<HTMLAnchorElement>(null);

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

  const focusableCount = sideOptions.length + 1;

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

  function focusMenuIndex(index: number) {
    if (index < sideOptions.length) {
      itemRefs.current[index]?.focus();
      return;
    }
    switchRef.current?.focus();
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
    if (focusableCount === 0) {
      return;
    }
    const radioIndex = itemRefs.current.findIndex(
      (node) => node === document.activeElement,
    );
    const currentIndex =
      radioIndex >= 0
        ? radioIndex
        : document.activeElement === switchRef.current
          ? sideOptions.length
          : -1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = currentIndex < 0 ? 0 : (currentIndex + 1) % focusableCount;
      focusMenuIndex(next);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        currentIndex < 0
          ? focusableCount - 1
          : (currentIndex - 1 + focusableCount) % focusableCount;
      focusMenuIndex(next);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusMenuIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusMenuIndex(focusableCount - 1);
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

      <p className="type-meta min-w-0 max-w-[9rem] truncate sm:max-w-[12rem]">
        <span className="font-medium text-ink">{identityName}</span>
        <span className="text-ink/40"> · </span>
        <span>{identityLabel}</span>
      </p>

      <div className="relative">
        <button
          ref={chevronRef}
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rule text-ink/60 hover:bg-ledger active:translate-y-px disabled:opacity-50"
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
                  className={`flex w-full flex-col px-3 py-2 text-left outline-none ${
                    selected ? "bg-ledger" : "hover:bg-ledger"
                  }`}
                  onClick={() => {
                    onSelect(option.id);
                    setOpen(false);
                  }}
                >
                  <span className="text-[15px] font-medium leading-relaxed text-ink">
                    {option.name}
                  </span>
                  <span className="type-meta">{option.label}</span>
                </button>
              );
            })}
            <div className="mt-1 border-t border-rule pt-1">
              <Link
                ref={switchRef}
                to={WELCOME_PATH}
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-[15px] leading-relaxed text-ink outline-none hover:bg-ledger"
                onClick={() => setOpen(false)}
              >
                Switch perspective
              </Link>
            </div>
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
      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium active:translate-y-px disabled:opacity-50 ${
        checked ? "bg-seal text-paper" : "bg-transparent text-ink/70 hover:bg-ledger hover:text-ink"
      }`}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}
