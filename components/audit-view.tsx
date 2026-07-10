import type { AuditLog } from "@/lib/types";
import { Card, CardHeader } from "./ui";

export function AuditView({ logs }: { logs: AuditLog[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Audit Logs</h2>
      </CardHeader>
      <div className="divide-y divide-[var(--border-subtle)]">
        {logs.map((log) => (
          <div key={log.id} className="grid gap-1 p-4 md:grid-cols-[1fr_180px]">
            <div>
              <p className="text-sm font-medium">{log.action}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {log.entityType} · {log.actorEmail ?? "system"}
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)] md:text-right">
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
