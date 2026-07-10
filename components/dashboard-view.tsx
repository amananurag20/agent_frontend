import {
  Activity,
  BookOpenCheck,
  Bot,
  Boxes,
  CalendarClock,
  type LucideIcon,
  MessageSquareMore,
  PhoneCall,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AIProvider,
  Health,
  ObservabilitySummary,
  Organization,
  ProductEntitlement,
  User,
} from "@/lib/types";
import { Card, CardHeader, StatusPill } from "./ui";

export function DashboardView({
  health,
  organization,
  users,
  products,
  aiProviders,
  observability,
}: {
  health: Health | null;
  observability: ObservabilitySummary | null;
  organization: Organization | null;
  users: User[];
  products: ProductEntitlement[];
  aiProviders: AIProvider[];
}) {
  const enabledProducts = products.filter((item) => item.status === "enabled").length;
  const openConversations =
    (observability?.customerChat.open ?? 0) +
    (observability?.whatsappAssistant.open ?? 0);

  const workload = [
    {
      label: "Customer chat",
      value: observability?.customerChat.open ?? 0,
      color: "var(--accent-primary)",
    },
    {
      label: "WhatsApp",
      value: observability?.whatsappAssistant.open ?? 0,
      color: "var(--accent-secondary)",
    },
    {
      label: "Voice live",
      value: observability?.voiceReceptionist.inProgress ?? 0,
      color: "var(--accent-violet)",
    },
    {
      label: "Bookings",
      value: observability?.appointmentBooking.upcoming ?? 0,
      color: "var(--accent-amber)",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={MessageSquareMore}
          label="Open conversations"
          value={openConversations}
          accent="var(--accent-primary)"
          detail={`${observability?.customerChat.waitingForAgent ?? 0} waiting for agent`}
        />
        <SummaryCard
          icon={CalendarClock}
          label="Upcoming bookings"
          value={observability?.appointmentBooking.upcoming ?? 0}
          accent="var(--accent-secondary)"
          detail={`${observability?.appointmentBooking.cancelled24h ?? 0} cancelled today`}
        />
        <SummaryCard
          icon={BookOpenCheck}
          label="Knowledge ready"
          value={observability?.knowledge.readySources ?? 0}
          accent="var(--accent-violet)"
          detail={`${observability?.knowledge.failedSources ?? 0} sources need attention`}
        />
        <SummaryCard
          icon={Boxes}
          label="Enabled products"
          value={`${enabledProducts}/${products.length || 4}`}
          accent="var(--accent-amber)"
          detail={`${users.length} workspace users`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[var(--text-strong)]">Channel workload</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Current activity across enabled customer channels
                </p>
              </div>
              <span className="rounded-full bg-[var(--surface-tint)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-primary)]">
                Live
              </span>
            </div>
          </CardHeader>
          <div className="p-5">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workload} barCategoryGap={24}>
                  <CartesianGrid
                    stroke="var(--border-subtle)"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: "var(--text-soft)", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "color-mix(in srgb, var(--accent-primary) 8%, transparent)" }}
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid var(--border-subtle)",
                      background: "var(--surface-card)",
                      boxShadow: "var(--shadow-card)",
                      color: "var(--text-strong)",
                    }}
                  />
                  <Bar dataKey="value" radius={[12, 12, 4, 4]}>
                    {workload.map((item) => (
                      <Cell key={item.label} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-5 md:grid-cols-4">
              <SmallMetric
                label="Waiting chat"
                value={observability?.customerChat.waitingForAgent ?? 0}
              />
              <SmallMetric
                label="Waiting WhatsApp"
                value={observability?.whatsappAssistant.waitingForAgent ?? 0}
              />
              <SmallMetric
                label="Voice handoff"
                value={observability?.voiceReceptionist.waitingForAgent ?? 0}
              />
              <SmallMetric
                label="Audit events"
                value={observability?.audit.events24h ?? 0}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-[var(--text-strong)]">Platform health</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Runtime and infrastructure status
            </p>
          </CardHeader>
          <div className="space-y-4 p-5">
            <HealthRow label="API" value={health?.status ?? "checking"} />
            <HealthRow label="Database" value={health?.database ?? "checking"} />
            <HealthRow label="Redis" value={health?.redis?.status ?? "checking"} />
            <HealthRow label="Queue" value={health?.queue?.status ?? "checking"} />
            <HealthRow label="Storage" value={health?.storage?.status ?? "checking"} />
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <ResourceBar
                label="Memory RSS"
                value={observability?.process.memoryRssMb ?? 0}
                max={512}
                suffix="MB"
              />
              <div className="mt-4">
                <ResourceBar
                  label="Heap used"
                  value={observability?.process.memoryHeapUsedMb ?? 0}
                  max={256}
                  suffix="MB"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[var(--text-strong)]">Product entitlements</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Availability for {organization?.name ?? "this organization"}
                </p>
              </div>
              <StatusPill status={organization?.status ?? "checking"} />
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-card-muted)] text-[11px] uppercase tracking-wider text-[var(--text-soft)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Key</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {products.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--surface-hover)]">
                    <td className="px-5 py-4 font-medium text-[var(--text-strong)]">
                      {item.product.name}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-[var(--text-muted)]">
                      {item.product.key}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-[var(--text-strong)]">Operations snapshot</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Identity, AI and ingestion activity
            </p>
          </CardHeader>
          <div className="grid grid-cols-2 gap-px bg-[var(--border-subtle)]">
            <SnapshotMetric icon={Activity} label="Active sessions" value={observability?.auth?.activeSessions ?? 0} />
            <SnapshotMetric icon={Bot} label="Pending invites" value={observability?.auth?.pendingInvites ?? 0} />
            <SnapshotMetric icon={Boxes} label="AI providers" value={aiProviders.length} />
            <SnapshotMetric icon={PhoneCall} label="AI fallbacks" value={observability?.ai?.fallbacks24h ?? 0} />
            <SnapshotMetric icon={MessageSquareMore} label="Provider errors" value={observability?.ai?.providerErrors24h ?? 0} />
            <SnapshotMetric icon={CalendarClock} label="Uptime" value={formatUptime(observability?.process.uptimeSeconds ?? 0)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent: string;
  detail: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--text-strong)]">{value}</p>
        </div>
        <span
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
            color: accent,
          }}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs text-[var(--text-soft)]">{detail}</p>
      <span className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: accent }} />
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-semibold text-[var(--text-strong)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <StatusPill status={value} />
    </div>
  );
}

function ResourceBar({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  suffix: string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="text-[var(--text-base)]">
          {value} {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-hover)]">
        <div
          className="h-full rounded-full bg-[var(--accent-primary)]"
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function SnapshotMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-[var(--surface-card)] p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-tint)] text-[var(--accent-primary)]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-semibold text-[var(--text-strong)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}
