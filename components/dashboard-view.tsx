import type {
  AIProvider,
  Health,
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
}: {
  health: Health | null;
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
