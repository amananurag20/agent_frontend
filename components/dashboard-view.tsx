import type {
  AIProvider,
  Health,
  ObservabilitySummary,
  Organization,
  ProductEntitlement,
  User,
} from "@/lib/types";
import { Card, CardHeader, Metric, StatusPill } from "./ui";

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
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard label="Users" value={users.length} />
        <SummaryCard
          label="Enabled products"
          value={products.filter((item) => item.status === "enabled").length}
        />
        <SummaryCard label="AI providers" value={aiProviders.length} />
        <SummaryCard label="Org plan" value={organization?.plan ?? "none"} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard
          label="Chat waiting"
          value={observability?.customerChat.waitingForAgent ?? 0}
        />
        <SummaryCard
          label="WhatsApp waiting"
          value={observability?.whatsappAssistant.waitingForAgent ?? 0}
        />
        <SummaryCard
          label="Voice live"
          value={observability?.voiceReceptionist.inProgress ?? 0}
        />
        <SummaryCard
          label="Upcoming bookings"
          value={observability?.appointmentBooking.upcoming ?? 0}
        />
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Organization</h2>
        </CardHeader>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          <Metric label="Name" value={organization?.name ?? "loading"} />
          <Metric label="Status" value={organization?.status ?? "loading"} />
          <Metric label="Deployment" value={organization?.deploymentMode ?? "loading"} />
          <Metric label="API" value={health?.status ?? "checking"} />
        </div>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Operations</h2>
        </CardHeader>
        <div className="grid gap-4 p-4 md:grid-cols-3">
          <NumberMetric
            label="Audit events 24h"
            value={observability?.audit.events24h ?? 0}
          />
          <NumberMetric
            label="Knowledge ready"
            value={observability?.knowledge.readySources ?? 0}
          />
          <NumberMetric
            label="Knowledge failed"
            value={observability?.knowledge.failedSources ?? 0}
          />
          <NumberMetric
            label="Memory RSS"
            value={`${observability?.process.memoryRssMb ?? 0} MB`}
          />
          <NumberMetric
            label="Heap used"
            value={`${observability?.process.memoryHeapUsedMb ?? 0} MB`}
          />
          <NumberMetric
            label="Uptime"
            value={`${observability?.process.uptimeSeconds ?? 0}s`}
          />
        </div>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Product Entitlements</h2>
        </CardHeader>
        <div className="divide-y divide-[#eef2f6]">
          {products.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="text-sm font-medium">{item.product.name}</p>
                <p className="text-xs text-[#667085]">{item.product.key}</p>
              </div>
              <StatusPill status={item.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[#d8dde6] bg-white p-4">
      <p className="text-xs font-medium uppercase text-[#667085]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function NumberMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-[#eef2f6] p-3">
      <p className="text-xs font-medium uppercase text-[#667085]">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
