import type { ProductEntitlement } from "@/lib/types";
import { Card, CardHeader, StatusPill } from "./ui";

export function ProductsView({
  products,
  onUpdateStatus,
}: {
  products: ProductEntitlement[];
  onUpdateStatus: (productKey: string, status: "enabled" | "disabled") => void;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Products</h2>
      </CardHeader>
      <div className="divide-y divide-[var(--border-subtle)]">
        {products.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.product.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{item.product.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={item.status} />
              <button
                onClick={() =>
                  onUpdateStatus(
                    item.product.key,
                    item.status === "enabled" ? "disabled" : "enabled",
                  )
                }
                className="h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]"
              >
                {item.status === "enabled" ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
