import type { ApiState, ChildrenProps, Health, User } from "@/lib/types";

export function Field({ label, children }: ChildrenProps & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[#344054]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function StateMessage({ state }: { state: ApiState }) {
  if (state.loading) {
    return <p className="text-sm text-[#667085]">Working...</p>;
  }

  if (state.error) {
    return <p className="text-sm text-[#b42318]">{state.error}</p>;
  }

  if (state.message) {
    return <p className="text-sm text-[#067647]">{state.message}</p>;
  }

  return <span className="min-h-5" />;
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "ok" ||
    status === "open" ||
    status === "enabled" ||
    status === "active"
      ? "bg-[#e7f7ef] text-[#067647]"
      : status === "closed" ||
          status === "disabled" ||
          status === "inactive"
        ? "bg-[#f2f4f7] text-[#475467]"
        : status === "degraded" || status === "waiting_for_agent"
          ? "bg-[#fff4df] text-[#b54708]"
          : "bg-[#fee4e2] text-[#b42318]";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-[#667085]">{label}</span>
      <StatusPill status={value} />
    </div>
  );
}

export function Toolbar({
  state,
  onRefresh,
}: {
  state: ApiState;
  onRefresh: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <StateMessage state={state} />
      <button
        onClick={onRefresh}
        className="h-9 rounded-md border border-[#cfd6e2] bg-white px-3 text-sm hover:bg-[#f2f4f7]"
        title="Refresh"
      >
        ↻
      </button>
    </div>
  );
}

export function HealthPanel({ health }: { health: Health | null }) {
  return (
    <div className="rounded-lg border border-[#d8dde6] bg-white p-4">
      <h2 className="font-semibold">System</h2>
      <div className="mt-4 space-y-3">
        <Metric label="Database" value={health?.database ?? "checking"} />
        <Metric label="Redis" value={health?.redis?.status ?? "checking"} />
        <Metric label="Queue" value={health?.queue?.status ?? "checking"} />
        <Metric label="Storage" value={health?.storage?.status ?? "checking"} />
      </div>
    </div>
  );
}

export function UserPanel({
  user,
  onLogoutAll,
}: {
  user: User;
  onLogoutAll?: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#d8dde6] bg-white p-4">
      <h2 className="font-semibold">Session</h2>
      <p className="mt-3 truncate text-sm">{user.email}</p>
      <p className="mt-1 text-xs text-[#667085]">{user.roles.join(", ")}</p>
      {onLogoutAll ? (
        <button
          onClick={onLogoutAll}
          className="mt-4 h-9 w-full rounded-md border border-[#cfd6e2] text-sm hover:bg-[#f2f4f7]"
        >
          Sign out all devices
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: ChildrenProps) {
  return <div className="p-8 text-sm text-[#667085]">{children}</div>;
}

export function Card({ children }: ChildrenProps) {
  return (
    <div className="rounded-lg border border-[#d8dde6] bg-white">{children}</div>
  );
}

export function CardHeader({ children }: ChildrenProps) {
  return <div className="border-b border-[#e4e7ec] p-4">{children}</div>;
}
