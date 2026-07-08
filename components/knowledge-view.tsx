import type { FormHandler, KnowledgeSource } from "@/lib/types";
import { Card, CardHeader, Field, StatusPill } from "./ui";

export function KnowledgeView({
  sources,
  onCreate,
  onIngest,
}: {
  sources: KnowledgeSource[];
  onCreate: FormHandler;
  onIngest: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={onCreate} className="rounded-lg border border-[#d8dde6] bg-white p-4">
        <h2 className="font-semibold">Add Knowledge</h2>
        <div className="mt-4 space-y-4">
          <Field label="Name">
            <input name="name" className="input" required />
          </Field>
          <Field label="Text">
            <textarea name="rawText" rows={9} className="input resize-y" required />
          </Field>
          <button className="h-10 rounded-md bg-[#101828] px-4 text-sm font-medium text-white">
            Create source
          </button>
        </div>
      </form>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Sources</h2>
        </CardHeader>
        <div className="divide-y divide-[#eef2f6]">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{source.name}</p>
                <p className="text-xs text-[#667085]">{source.type}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={source.status} />
                <button
                  onClick={() => onIngest(source.id)}
                  className="h-9 shrink-0 rounded-md border border-[#cfd6e2] px-3 text-sm hover:bg-[#f2f4f7]"
                >
                  Ingest
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
