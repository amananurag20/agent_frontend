import type { FormHandler, KnowledgeSource } from "@/lib/types";
import { Card, CardHeader, Field, StatusPill } from "./ui";

export function KnowledgeView({
  sources,
  onCreate,
  onCreateUrl,
  onUploadFile,
  onIngest,
}: {
  sources: KnowledgeSource[];
  onCreate: FormHandler;
  onCreateUrl: FormHandler;
  onUploadFile: FormHandler;
  onIngest: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[460px_minmax(0,1fr)]">
      <div className="space-y-4">
        <form
          onSubmit={onCreate}
          className="rounded-lg border border-[#d8dde6] bg-white p-4"
        >
          <h2 className="font-semibold">Paste Text</h2>
          <div className="mt-4 space-y-4">
            <Field label="Name">
              <input name="name" className="input" required />
            </Field>
            <Field label="Text">
              <textarea
                name="rawText"
                rows={7}
                className="input resize-y"
                required
              />
            </Field>
            <MemoryAccessFields />
            <button className="h-10 rounded-md bg-[#101828] px-4 text-sm font-medium text-white">
              Create source
            </button>
          </div>
        </form>

        <form
          onSubmit={onUploadFile}
          className="rounded-lg border border-[#d8dde6] bg-white p-4"
        >
          <h2 className="font-semibold">Upload File</h2>
          <div className="mt-4 space-y-4">
            <Field label="Name">
              <input name="name" className="input" required />
            </Field>
            <Field label="File">
              <input
                name="file"
                type="file"
                className="input"
                accept=".txt,.md,.pdf,.doc,.docx,.csv,.json"
                required
              />
            </Field>
            <MemoryAccessFields />
            <button className="h-10 rounded-md bg-[#116466] px-4 text-sm font-medium text-white">
              Upload source
            </button>
          </div>
        </form>

        <form
          onSubmit={onCreateUrl}
          className="rounded-lg border border-[#d8dde6] bg-white p-4"
        >
          <h2 className="font-semibold">Website URL</h2>
          <div className="mt-4 space-y-4">
            <Field label="Name">
              <input name="name" className="input" required />
            </Field>
            <Field label="URL">
              <input
                name="url"
                type="url"
                className="input"
                placeholder="https://example.com/help"
                required
              />
            </Field>
            <MemoryAccessFields />
            <button className="h-10 rounded-md border border-[#cfd6e2] px-4 text-sm font-medium hover:bg-[#f2f4f7]">
              Add URL source
            </button>
          </div>
        </form>
      </div>
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
                <p className="text-xs text-[#667085]">
                  {source.type} · level {source.sensitivityLevel ?? 0} · {source.productVisibility?.length ?? 4} products
                </p>
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

function MemoryAccessFields() {
  const products = [
    ["customer_chat", "Chat"],
    ["appointment_booking", "Appointments"],
    ["whatsapp_assistant", "WhatsApp"],
    ["voice_receptionist", "Voice"],
  ] as const;

  return (
    <div className="border-t border-[#e4e7ec] pt-4">
      <Field label="Sensitivity level">
        <select name="sensitivityLevel" className="input" defaultValue="0">
          <option value="0">0 · Public</option>
          <option value="1">1 · Internal</option>
          <option value="2">2 · Restricted</option>
          <option value="3">3 · Confidential</option>
          <option value="4">4 · Owner only</option>
        </select>
      </Field>
      <fieldset className="mt-3">
        <legend className="text-sm font-medium text-[#344054]">Visible to products</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {products.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="productVisibility" value={key} defaultChecked /> {label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
