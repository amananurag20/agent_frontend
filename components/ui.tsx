import type { ApiState, ChildrenProps, Health, User } from "@/lib/types";

export function Field({ label, children }: ChildrenProps & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--text-base)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function StateMessage({ state }: { state: ApiState }) {
  if (state.loading) {
    return <p className="text-sm text-[var(--text-muted)]">Working...</p>;
  }

  if (state.error) {
    return <p className="text-sm text-[var(--danger-text)]">{state.error}</p>;
  }

  if (state.message) {
    return (
      <p className="text-sm text-[var(--success-text)]">{state.message}</p>
    );
  }

  return null;
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "ok" ||
    status === "open" ||
    status === "enabled" ||
    status === "active" ||
    status === "ready" ||
    status === "completed" ||
    status === "sent" ||
    status === "delivered" ||
    status === "read" ||
    status === "token" ||
    status === "verify" ||
    status === "secret"
      ? "bg-[var(--success-bg)] text-[var(--success-text)]"
      : status === "closed" || status === "disabled" || status === "inactive"
        ? "bg-[var(--neutral-bg)] text-[var(--neutral-text)]"
        : status === "degraded" ||
            status === "waiting_for_agent" ||
            status === "pending" ||
            status === "queued" ||
            status === "processing" ||
            status === "quarantined" ||
            status === "stale"
          ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
          : "bg-[var(--danger-bg)] text-[var(--danger-text)]";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
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
  const hasMessage =
    state.loading || Boolean(state.error) || Boolean(state.message);

  return (
    <div
      className={`flex items-center gap-3 ${
        hasMessage ? "mb-3 justify-between" : "mb-2 justify-end"
      }`}
    >
      {hasMessage ? <StateMessage state={state} /> : null}
      <button
        onClick={onRefresh}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-card)] text-sm text-[var(--text-muted)] hover:border-[var(--accent-primary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
        title="Refresh"
      >
        ↻
      </button>
    </div>
  );
}

export function HealthPanel({ health }: { health: Health | null }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]">
      <h2 className="font-semibold text-[var(--text-strong)]">System</h2>
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
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]">
      <h2 className="font-semibold text-[var(--text-strong)]">Session</h2>
      <p className="mt-3 truncate text-sm text-[var(--text-strong)]">
        {user.email}
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {user.roles.join(", ")}
      </p>
      {onLogoutAll ? (
        <button
          onClick={onLogoutAll}
          className="mt-4 h-9 w-full rounded-xl border border-[var(--border-strong)] text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
        >
          Sign out all devices
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: ChildrenProps) {
  return <div className="p-8 text-sm text-[var(--text-muted)]">{children}</div>;
}

export function Card({ children }: ChildrenProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      {children}
    </div>
  );
}

export function CardHeader({ children }: ChildrenProps) {
  return (
    <div className="border-b border-[var(--border-subtle)] px-5 py-4">
      {children}
    </div>
  );
}
