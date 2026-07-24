import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMe } from "@/lib/queries";
import type { MembershipOut, Role, UserOut } from "@/lib/types";

export const AS_PARAM = "as";
export const WELCOME_PATH = "/welcome";

const FIRM_ROLES: ReadonlySet<Role> = new Set([
  "preparer",
  "reviewer",
  "firm_admin",
  "seasonal_staff",
]);

export function isFirmSideRole(role: Role): boolean {
  return FIRM_ROLES.has(role);
}

export function isFirmPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }
  // Document detail stays reachable for clients so role-filtered threads
  // (e.g. Beta W-2 internal hidden from Alex) can be demonstrated.
  return (
    pathname === "/returns" ||
    pathname.startsWith("/returns/") ||
    pathname === "/documents"
  );
}

export function homePathForMembership(membership: MembershipOut): string {
  if (isFirmSideRole(membership.role)) {
    return "/";
  }
  if (membership.client_id) {
    return `/portal/${membership.client_id}`;
  }
  return "/";
}

export interface RoleOption {
  membership: MembershipOut;
  user: UserOut;
}

interface RoleContextValue {
  membershipId: string | null;
  activeMembership: MembershipOut | null;
  activeUser: UserOut | null;
  options: RoleOption[];
  isFirmSide: boolean;
  audience: "staff" | "client";
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  notice: string | null;
  clearNotice: () => void;
  setActiveMembership: (membershipId: string) => void;
  hrefFor: (pathname: string, extra?: Record<string, string | undefined | null>) => string;
  homePath: string;
}

const RoleContext = createContext<RoleContextValue | null>(null);

interface RoleProviderProps {
  children: ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const membershipId = searchParams.get(AS_PARAM);
  const me = useMe(membershipId);
  const [notice, setNotice] = useState<string | null>(null);
  const needsWelcome = !membershipId && location.pathname !== WELCOME_PATH;

  const options = useMemo((): RoleOption[] => {
    if (!me.data) {
      return [];
    }
    const items: RoleOption[] = [];
    for (const user of me.data.users) {
      for (const membership of user.memberships) {
        items.push({ user, membership });
      }
    }
    return items;
  }, [me.data]);

  const activeMembership = me.data?.active_membership ?? null;
  const activeUser = me.data?.active_user ?? null;
  const isFirmSide = activeMembership ? isFirmSideRole(activeMembership.role) : true;
  const homePath = activeMembership ? homePathForMembership(activeMembership) : "/";

  const hrefFor = useCallback(
    (pathname: string, extra: Record<string, string | undefined | null> = {}) => {
      const params = new URLSearchParams();
      if (membershipId) {
        params.set(AS_PARAM, membershipId);
      }
      for (const [key, value] of Object.entries(extra)) {
        if (value === undefined || value === null || value === "") {
          continue;
        }
        params.set(key, value);
      }
      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [membershipId],
  );

  const setActiveMembership = useCallback(
    (nextId: string) => {
      const option = options.find((item) => item.membership.id === nextId);
      if (!option) {
        return;
      }
      setNotice(null);
      const home = homePathForMembership(option.membership);
      void navigate(`${home}?${AS_PARAM}=${encodeURIComponent(nextId)}`);
    },
    [navigate, options],
  );

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  useEffect(() => {
    if (!activeMembership || isFirmSide) {
      return;
    }
    if (!activeMembership.client_id) {
      return;
    }
    if (isFirmPath(location.pathname)) {
      setNotice("That page is for firm staff.");
      void navigate(hrefFor(`/portal/${activeMembership.client_id}`), { replace: true });
      return;
    }
    const portalPrefix = `/portal/`;
    if (location.pathname.startsWith(portalPrefix)) {
      const pathClientId = location.pathname.slice(portalPrefix.length).split("/")[0];
      if (pathClientId && pathClientId !== activeMembership.client_id) {
        void navigate(hrefFor(`/portal/${activeMembership.client_id}`), { replace: true });
      }
    }
  }, [activeMembership, hrefFor, isFirmSide, location.pathname, navigate]);

  const value = useMemo(
    (): RoleContextValue => ({
      membershipId,
      activeMembership,
      activeUser,
      options,
      isFirmSide,
      audience: isFirmSide ? "staff" : "client",
      isLoading: me.isLoading,
      isError: me.isError,
      error: me.error,
      notice,
      clearNotice,
      setActiveMembership,
      hrefFor,
      homePath,
    }),
    [
      membershipId,
      activeMembership,
      activeUser,
      options,
      isFirmSide,
      me.isLoading,
      me.isError,
      me.error,
      notice,
      clearNotice,
      setActiveMembership,
      hrefFor,
      homePath,
    ],
  );

  return (
    <RoleContext.Provider value={value}>
      {needsWelcome ? <Navigate to={WELCOME_PATH} replace /> : children}
    </RoleContext.Provider>
  );
}

/** Root layout: role context for every route, including /welcome. */
export function RootLayout() {
  return (
    <RoleProvider>
      <Outlet />
    </RoleProvider>
  );
}

export function useRole(): RoleContextValue {
  const value = useContext(RoleContext);
  if (!value) {
    throw new Error("useRole must be used within RoleProvider.");
  }
  return value;
}
