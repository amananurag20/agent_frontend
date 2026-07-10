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
    { label: "Customer chat", value: observability?.customerChat.open ?? 0, color: "#4f7cff" },
    { label: "WhatsApp", value: observability?.whatsappAssistant.open ?? 0, color: "#19b8c9" },
    { label: "Voice live", value: observability?.voiceReceptionist.inProgress ?? 0, color: "#a78bfa" },
    { label: "Bookings", value: observability?.appointmentBooking.upcoming ?? 0, color: "#f6b95f" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard mark="CX" label="Open conversations" value={openConversations} accent="#4f7cff" detail={`${observability?.customerChat.waitingForAgent ?? 0} waiting for agent`} />
        <SummaryCard mark="BK" label="Upcoming bookings" value={observability?.appointmentBooking.upcoming ?? 0} accent="#19b8c9" detail={`${observability?.appointmentBooking.cancelled24h ?? 0} cancelled today`} />
        <SummaryCard mark="KB" label="Knowledge ready" value={observability?.knowledge.readySources ?? 0} accent="#a78bfa" detail={`${observability?.knowledge.failedSources ?? 0} sources need attention`} />
        <SummaryCard mark="PR" label="Enabled products" value={`${enabledProducts}/${products.length || 4}`} accent="#f6b95f" detail={`${users.length} workspace users`} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Channel workload</h3>
                <p className="mt-1 text-xs text-[#8797b0]">Current activity across enabled customer channels</p>
              </div>
              <span className="rounded-md bg-[#17253a] px-2.5 py-1 text-[11px] text-[#93a7c5]">Live</span>
            </div>
          </CardHeader>
          <div className="p-5">
            <WorkloadChart items={workload} />
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#263449] pt-5 md:grid-cols-4">
              <SmallMetric label="Waiting chat" value={observability?.customerChat.waitingForAgent ?? 0} />
              <SmallMetric label="Waiting WhatsApp" value={observability?.whatsappAssistant.waitingForAgent ?? 0} />
              <SmallMetric label="Voice handoff" value={observability?.voiceReceptionist.waitingForAgent ?? 0} />
              <SmallMetric label="Audit events" value={observability?.audit.events24h ?? 0} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-white">Platform health</h3>
            <p className="mt-1 text-xs text-[#8797b0]">Runtime and infrastructure status</p>
          </CardHeader>
          <div className="space-y-4 p-5">
            <HealthRow label="API" value={health?.status ?? "checking"} />
            <HealthRow label="Database" value={health?.database ?? "checking"} />
            <HealthRow label="Redis" value={health?.redis?.status ?? "checking"} />
            <HealthRow label="Queue" value={health?.queue?.status ?? "checking"} />
            <HealthRow label="Storage" value={health?.storage?.status ?? "checking"} />
            <div className="border-t border-[#263449] pt-4">
              <ResourceBar label="Memory RSS" value={observability?.process.memoryRssMb ?? 0} max={512} suffix="MB" />
              <div className="mt-4">
                <ResourceBar label="Heap used" value={observability?.process.memoryHeapUsedMb ?? 0} max={256} suffix="MB" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Product entitlements</h3>
                <p className="mt-1 text-xs text-[#8797b0]">Availability for {organization?.name ?? "this organization"}</p>
              </div>
              <StatusPill status={organization?.status ?? "checking"} />
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0e1929] text-[11px] uppercase tracking-wider text-[#6f819d]">
                <tr><th className="px-5 py-3 font-medium">Product</th><th className="px-5 py-3 font-medium">Key</th><th className="px-5 py-3 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-[#263449]">
                {products.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-medium text-[#dce6f5]">{item.product.name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#7487a5]">{item.product.key}</td>
                    <td className="px-5 py-4"><StatusPill status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-white">Operations snapshot</h3>
            <p className="mt-1 text-xs text-[#8797b0]">Identity, AI and ingestion activity</p>
          </CardHeader>
          <div className="grid grid-cols-2 gap-px bg-[#263449]">
            <SnapshotMetric label="Active sessions" value={observability?.auth?.activeSessions ?? 0} />
            <SnapshotMetric label="Pending invites" value={observability?.auth?.pendingInvites ?? 0} />
            <SnapshotMetric label="AI providers" value={aiProviders.length} />
            <SnapshotMetric label="AI fallbacks" value={observability?.ai?.fallbacks24h ?? 0} />
            <SnapshotMetric label="Provider errors" value={observability?.ai?.providerErrors24h ?? 0} />
            <SnapshotMetric label="Uptime" value={formatUptime(observability?.process.uptimeSeconds ?? 0)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ mark, label, value, accent, detail }: { mark: string; label: string; value: number | string; accent: string; detail: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-[#263449] bg-[#111c2e] p-5 shadow-[0_12px_34px_rgba(0,0,0,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#8797b0]">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-lg text-[11px] font-bold" style={{ backgroundColor: `${accent}22`, color: accent }}>{mark}</span>
      </div>
      <p className="mt-4 text-xs text-[#667b99]">{detail}</p>
      <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ backgroundColor: accent }} />
    </div>
  );
}

function WorkloadChart({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="space-y-5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between text-xs"><span className="text-[#9badc7]">{item.label}</span><span className="font-semibold text-white">{item.value}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#0a1422]">
            <div className="h-full rounded-full" style={{ width: `${Math.max(item.value ? 8 : 0, (item.value / max) * 100)}%`, backgroundColor: item.color, boxShadow: `0 0 14px ${item.color}55` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return <div><p className="text-xl font-semibold text-white">{value}</p><p className="mt-1 text-[11px] text-[#71839f]">{label}</p></div>;
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-sm text-[#98a9c1]">{label}</span><StatusPill status={value} /></div>;
}

function ResourceBar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix: string }) {
  return <div><div className="mb-2 flex justify-between text-xs"><span className="text-[#7f91ad]">{label}</span><span className="text-[#c7d3e5]">{value} {suffix}</span></div><div className="h-1.5 rounded-full bg-[#0a1422]"><div className="h-full rounded-full bg-[#4f7cff]" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div></div>;
}

function SnapshotMetric({ label, value }: { label: string; value: number | string }) {
  return <div className="bg-[#111c2e] p-5"><p className="text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-xs text-[#71839f]">{label}</p></div>;
}

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}
