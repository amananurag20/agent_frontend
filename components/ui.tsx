import type { ApiState, ChildrenProps, Health, User } from "@/lib/types";

export function Field({ label, children }: ChildrenProps & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[#c9d4e5]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function StateMessage({ state }: { state: ApiState }) {
  if (state.loading) {
    return <p className="text-sm text-[#8797b0]">Working...</p>;
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
      ? "bg-[#15352f] text-[#5ee2c3]"
      : status === "closed" ||
          status === "disabled" ||
          status === "inactive"
        ? "bg-[#1a283b] text-[#9aabc2]"
        : status === "degraded" || status === "waiting_for_agent"
          ? "bg-[#3a2b18] text-[#f6b95f]"
          : "bg-[#3b2029] text-[#fb7185]";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-[#8797b0]">{label}</span>
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
    <div className="mb-4 flex min-h-9 items-center justify-between gap-3">
      <StateMessage state={state} />
      <button
        onClick={onRefresh}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-[#314158] bg-[#4f7cff] text-sm text-[#9fb4d3] hover:border-[#4f7cff] hover:bg-[#18263b] hover:text-white"
        title="Refresh"
      >
        ↻
      </button>
    </div>
  );
}

export function HealthPanel({ health }: { health: Health | null }) {
  return (
    <div className="rounded-lg border border-[#263449] bg-[#111c2e] p-4">
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
    <div className="rounded-lg border border-[#263449] bg-[#111c2e] p-4">
      <h2 className="font-semibold">Session</h2>
      <p className="mt-3 truncate text-sm">{user.email}</p>
      <p className="mt-1 text-xs text-[#8797b0]">{user.roles.join(", ")}</p>
      {onLogoutAll ? (
        <button
          onClick={onLogoutAll}
          className="mt-4 h-9 w-full rounded-md border border-[#314158] text-sm hover:bg-[#18263b]"
        >
          Sign out all devices
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: ChildrenProps) {
  return <div className="p-8 text-sm text-[#8797b0]">{children}</div>;
}

export function Card({ children }: ChildrenProps) {
  return (
    <div className="rounded-lg border border-[#263449] bg-[#111c2e] shadow-[0_12px_34px_rgba(0,0,0,0.12)]">{children}</div>
  );
}

export function CardHeader({ children }: ChildrenProps) {
  return <div className="border-b border-[#263449] px-5 py-4">{children}</div>;
}
