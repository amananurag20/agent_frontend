import type {
  FormHandler,
  KnowledgeCategory,
  KnowledgeFolder,
  KnowledgeSource,
} from "@/lib/types";
import { Card, CardHeader, Field, StatusPill } from "./ui";

export function KnowledgeView({
  sources,
  categories,
  folders,
  onCreate,
  onCreateUrl,
  onUploadFile,
  onIngest,
  onReleaseQuarantine,
  onCreateCategory,
  onCreateFolder,
}: {
  sources: KnowledgeSource[];
  categories: KnowledgeCategory[];
  folders: KnowledgeFolder[];
  onCreate: FormHandler;
  onCreateUrl: FormHandler;
  onUploadFile: FormHandler;
  onIngest: (id: string) => void;
  onReleaseQuarantine: (id: string) => void;
  onCreateCategory: FormHandler;
  onCreateFolder: FormHandler;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[460px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader><h2 className="font-semibold">Knowledge structure</h2></CardHeader>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <form onSubmit={onCreateCategory}>
              <Field label="New category"><input name="name" className="input" required minLength={2} placeholder="Policies" /></Field>
              <button className="mt-3 h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]">Add category</button>
            </form>
            <form onSubmit={onCreateFolder}>
              <Field label="New folder"><input name="name" className="input" required minLength={2} placeholder="Customer support" /></Field>
              <div className="mt-2">
                <select name="parentId" className="input" defaultValue=""><option value="">Top level</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>
              </div>
              <button className="mt-3 h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]">Add folder</button>
            </form>
          </div>
          <div className="border-t border-[var(--border-subtle)] px-4 py-3 text-xs text-[var(--text-muted)]">
            {folders.length} folders · {categories.length} registered categories
          </div>
        </Card>
        <form
          onSubmit={onCreate}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
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
            <MemoryAccessFields categories={categories} folders={folders} />
            <button className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)]">
              Create source
            </button>
          </div>
        </form>

        <form
          onSubmit={onUploadFile}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
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
                accept=".txt,.md,.pdf,.docx,.xlsx,.csv,.tsv"
                required
              />
            </Field>
            <MemoryAccessFields categories={categories} folders={folders} />
            <button className="h-10 rounded-md bg-[var(--accent-secondary)] px-4 text-sm font-medium text-[var(--text-on-accent)]">
              Upload source
            </button>
          </div>
        </form>

        <form
          onSubmit={onCreateUrl}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
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
            <MemoryAccessFields categories={categories} folders={folders} />
            <button className="h-10 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)]">
              Add URL source
            </button>
          </div>
        </form>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Sources</h2>
        </CardHeader>
        <div className="divide-y divide-[var(--border-subtle)]">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{source.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {source.type} · level {source.sensitivityLevel ?? 0} · {source.productVisibility?.length ?? 4} products
                </p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  {source.levelSource ?? "manual"} level{source.categories?.length ? ` · ${source.categories.join(", ")}` : ""}{source.folderId ? ` · ${folders.find((folder) => folder.id === source.folderId)?.name ?? "folder"}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={source.status} />
                {source.isQuarantined ? <StatusPill status="quarantined" /> : null}
                {source.isQuarantined ? (
                  <button
                    onClick={() => onReleaseQuarantine(source.id)}
                    className="h-9 shrink-0 rounded-md border border-[var(--warning-text)]/40 px-3 text-sm text-[var(--warning-text)] hover:bg-[var(--warning-bg)]"
                  >
                    Approve
                  </button>
                ) : null}
                <button
                  onClick={() => onIngest(source.id)}
                  className="h-9 shrink-0 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]"
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

function MemoryAccessFields({
  categories,
  folders,
}: {
  categories: KnowledgeCategory[];
  folders: KnowledgeFolder[];
}) {
  const products = [
    ["customer_chat", "Chat"],
    ["appointment_booking", "Appointments"],
    ["whatsapp_assistant", "WhatsApp"],
    ["voice_receptionist", "Voice"],
  ] as const;

  return (
    <div className="border-t border-[var(--border-subtle)] pt-4">
      <Field label="Sensitivity level">
        <select name="sensitivityLevel" className="input" defaultValue="">
          <option value="">Auto classify</option>
          <option value="0">0 · Public</option>
          <option value="1">1 · Internal</option>
          <option value="2">2 · Restricted</option>
          <option value="3">3 · Confidential</option>
          <option value="4">4 · Owner only</option>
        </select>
      </Field>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Folder">
          <select name="folderId" className="input" defaultValue=""><option value="">No folder</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>
        </Field>
        <Field label="Categories">
          <input name="categories" className="input" list="knowledge-categories" placeholder="policies, support" />
        </Field>
        <datalist id="knowledge-categories">{categories.map((category) => <option key={category.id} value={category.name} />)}</datalist>
      </div>
      <fieldset className="mt-3">
        <legend className="text-sm font-medium text-[var(--text-base)]">Visible to products</legend>
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
