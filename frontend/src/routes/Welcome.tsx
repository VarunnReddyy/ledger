import { ErrorCard } from "@/components/ErrorCard";
import { queryErrorMessage } from "@/lib/queryErrors";
import { useRole } from "@/lib/role-context";

type PersonaGroup = "firm" | "client";

interface PersonaCardDef {
  membershipId: string;
  name: string;
  roleLabel: string;
  hook: string;
  group: PersonaGroup;
  chip?: string;
}

const PERSONAS: readonly PersonaCardDef[] = [
  {
    membershipId: "mem_dana_preparer",
    name: "Dana Reyes",
    roleLabel: "Firm preparer",
    hook: "A ranked queue and returns to review",
    group: "firm",
  },
  {
    membershipId: "mem_marcus_reviewer",
    name: "Marcus Hale",
    roleLabel: "Firm reviewer",
    hook: "Sign-off work and the review filter",
    group: "firm",
  },
  {
    membershipId: "mem_priya_admin",
    name: "Priya Anand",
    roleLabel: "Firm admin",
    hook: "The whole firm at a glance",
    group: "firm",
    chip: "Also a client",
  },
  {
    membershipId: "mem_alex_owner",
    name: "Alex Northwind",
    roleLabel: "Business owner",
    hook: "A return in progress, quietly",
    group: "client",
  },
  {
    membershipId: "mem_morgan_taxpayer",
    name: "Morgan Meridian",
    roleLabel: "New client",
    hook: "A first login with one clear next step",
    group: "client",
  },
  {
    membershipId: "mem_priya_taxpayer",
    name: "Priya Anand",
    roleLabel: "Her personal return",
    hook: "The same admin, as a taxpayer",
    group: "client",
    chip: "Also firm admin",
  },
];

const FIRM_PERSONAS = PERSONAS.filter((persona) => persona.group === "firm");
const CLIENT_PERSONAS = PERSONAS.filter((persona) => persona.group === "client");

function readmeHref(): string | null {
  const repoUrl = import.meta.env.VITE_REPO_URL;
  if (typeof repoUrl !== "string" || repoUrl.trim() === "") {
    return null;
  }
  const base = repoUrl.replace(/\/$/, "").replace(/\.git$/, "");
  return `${base}/blob/main/README.md#whats-genuine-vs-simulated`;
}

export default function WelcomeRoute() {
  const { error, isError, isLoading, options, setActiveMembership } = useRole();
  const namesByMembershipId = new Map(
    options.map((option) => [option.membership.id, option.user.name] as const),
  );
  const availableIds = new Set(namesByMembershipId.keys());
  const readme = readmeHref();

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink lg:h-[100dvh] lg:overflow-hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-8 py-10 lg:py-12">
        <header className="shrink-0 space-y-3">
          <p className="text-lg font-semibold tracking-tight text-ink">Ledger</p>
          <p className="max-w-xl text-lg leading-snug text-ink">
            An AI-assisted tax platform where every number can explain itself.
          </p>
          <p className="type-meta max-w-xl">
            Case-study prototype — pick a perspective to explore. Same product, different
            permissions.
          </p>
        </header>

        <div className="mt-10 grid flex-1 grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 lg:mt-12 lg:items-start">
          <PersonaColumn
            heading="The firm"
            personas={FIRM_PERSONAS}
            namesByMembershipId={namesByMembershipId}
            availableIds={availableIds}
            isLoading={isLoading}
            disabled={isError || options.length === 0}
            onSelect={setActiveMembership}
          />
          <PersonaColumn
            heading="Their clients"
            personas={CLIENT_PERSONAS}
            namesByMembershipId={namesByMembershipId}
            availableIds={availableIds}
            isLoading={isLoading}
            disabled={isError || options.length === 0}
            onSelect={setActiveMembership}
          />
        </div>

        {isError ? (
          <div className="mt-8 shrink-0">
            <ErrorCard
              message={queryErrorMessage(error, "Memberships could not be loaded.")}
            />
          </div>
        ) : null}

        <footer className="mt-10 shrink-0 lg:mt-auto lg:pt-8">
          {readme ? (
            <a
              href={readme}
              className="type-meta underline-offset-2 hover:text-ink hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Simulated login — authorization is enforced server-side either way.
            </a>
          ) : (
            <p className="type-meta">
              Simulated login — authorization is enforced server-side either way.
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

interface PersonaColumnProps {
  heading: string;
  personas: readonly PersonaCardDef[];
  namesByMembershipId: Map<string, string>;
  availableIds: Set<string>;
  isLoading: boolean;
  disabled: boolean;
  onSelect: (membershipId: string) => void;
}

function PersonaColumn({
  heading,
  personas,
  namesByMembershipId,
  availableIds,
  isLoading,
  disabled,
  onSelect,
}: PersonaColumnProps) {
  return (
    <section className="space-y-3" aria-label={heading}>
      <h2 className="type-section">{heading}</h2>
      <ul className="space-y-3">
        {personas.map((persona) =>
          isLoading ? (
            <li key={persona.membershipId}>
              <PersonaCardSkeleton />
            </li>
          ) : (
            <li key={persona.membershipId}>
              <PersonaCard
                persona={persona}
                name={namesByMembershipId.get(persona.membershipId) ?? persona.name}
                enabled={!disabled && availableIds.has(persona.membershipId)}
                onSelect={onSelect}
              />
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

interface PersonaCardProps {
  persona: PersonaCardDef;
  name: string;
  enabled: boolean;
  onSelect: (membershipId: string) => void;
}

function PersonaCard({ persona, name, enabled, onSelect }: PersonaCardProps) {
  return (
    <button
      type="button"
      disabled={!enabled}
      className="w-full border border-rule bg-paper p-6 text-left hover:shadow-sm active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
      onClick={() => {
        if (!enabled) {
          return;
        }
        onSelect(persona.membershipId);
      }}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="type-body font-semibold">{name}</span>
        {persona.chip ? (
          <span className="rounded-sm bg-ink/8 px-1.5 py-0.5 text-[11px] leading-none text-ink/70">
            {persona.chip}
          </span>
        ) : null}
      </div>
      <p className="type-meta mt-1">{persona.roleLabel}</p>
      <p className="mt-2 text-[13px] text-ink/70">{persona.hook}</p>
    </button>
  );
}

function PersonaCardSkeleton() {
  return (
    <div
      className="border border-rule bg-paper p-6"
      role="status"
      aria-live="polite"
      aria-label="Loading persona"
    >
      <div className="h-[15px] w-36 animate-pulse bg-ledger" />
      <div className="mt-2 h-[13px] w-24 animate-pulse bg-ledger" />
      <div className="mt-3 h-[13px] w-48 animate-pulse bg-ledger" />
    </div>
  );
}
