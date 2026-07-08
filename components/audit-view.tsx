import type { AuditLog } from "@/lib/types";
import { Card, CardHeader } from "./ui";

export function AuditView({ logs }: { logs: AuditLog[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Audit Logs</h2>
      </CardHeader>
      <div className="divide-y divide-[#eef2f6]">
        {logs.map((log) => (
          <div key={log.id} className="grid gap-1 p-4 md:grid-cols-[1fr_180px]">
            <div>
              <p className="text-sm font-medium">{log.action}</p>
              <p className="text-xs text-[#667085]">
                {log.entityType} · {log.actorEmail ?? "system"}
              </p>
            </div>
            <p className="text-xs text-[#667085] md:text-right">
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
