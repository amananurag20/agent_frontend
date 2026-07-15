import {
  BrainCircuit,
  CheckCircle2,
  FileSearch,
  KeyRound,
  Pencil,
  Plus,
  ScanText,
  ServerCog,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type {
  AIProvider,
  KnowledgeExtractionSettings,
  KnowledgeExtractionSettingsInput,
  KnowledgeOcrProvider,
  KnowledgeOcrProviderInput,
} from "@/lib/types";
import { Field, StatusPill } from "./ui";

const providerLabels: Record<KnowledgeOcrProvider["provider"], string> = {
  local_tesseract: "Local Tesseract",
  aws_textract: "AWS Textract adapter",
  google_document_ai: "Google Document AI adapter",
  azure_document_intelligence: "Azure Document Intelligence adapter",
  custom: "Custom OCR adapter",
};

export function KnowledgeSettingsModal({
  workspaceName,
  settings,
  error,
  ocrProviders,
  aiProviders,
  onClose,
  onRetry,
  onSaveSettings,
  onSaveProvider,
  onDeleteProvider,
}: {
  workspaceName: string;
  settings: KnowledgeExtractionSettings | null;
  error: string | null;
  ocrProviders: KnowledgeOcrProvider[];
  aiProviders: AIProvider[];
  onClose: () => void;
  onRetry: () => void;
  onSaveSettings: (input: KnowledgeExtractionSettingsInput) => Promise<boolean>;
  onSaveProvider: (input: KnowledgeOcrProviderInput, id?: string) => Promise<boolean>;
  onDeleteProvider: (id: string) => Promise<boolean>;
}) {
  const [tab, setTab] = useState<"pipeline" | "providers">("pipeline");
  const [editingProvider, setEditingProvider] = useState<KnowledgeOcrProvider | null>(null);
  const activeOcrProviders = useMemo(
    () => ocrProviders.filter((provider) => provider.status === "active"),
    [ocrProviders],
  );
  const embeddingProviders = useMemo(
    () => aiProviders.filter((provider) => provider.status === "active" && provider.embeddingModel),
    [aiProviders],
  );

  if (!settings) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Knowledge pipeline settings"
        onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      >
        <div className="w-full max-w-lg rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_32px_80px_rgba(15,23,42,0.24)]">
          <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <ServerCog className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--text-strong)]">Knowledge processing</h2>
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Effective workspace: {workspaceName}</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]" aria-label="Close settings"><X className="h-4 w-4" /></button>
          </header>
          <div className="p-6 text-center">
            {error ? (
              <>
                <p className="text-sm font-medium text-[var(--danger-text)]">Could not load processing settings</p>
                <p className="mt-2 break-words text-sm text-[var(--text-muted)]">{error}</p>
                <button type="button" onClick={onRetry} className="mt-5 h-10 rounded-md bg-[var(--accent-primary)] px-5 text-sm font-medium text-[var(--text-on-accent)]">Retry</button>
              </>
            ) : (
              <div className="flex items-center justify-center gap-3 text-sm text-[var(--text-muted)]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent-primary)]" />
                Loading workspace policy...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const loadedSettings = settings;

  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await onSaveSettings({
      ocrMode: String(form.get("ocrMode")) as KnowledgeExtractionSettings["ocrMode"],
      primaryOcrProviderId: String(form.get("primaryOcrProviderId") || "") || null,
      fallbackOcrProviderId: String(form.get("fallbackOcrProviderId") || "") || null,
      embeddingProviderId: String(form.get("embeddingProviderId") || "") || null,
      nativeTextMinCharacters: Number(form.get("nativeTextMinCharacters")),
      nativeTextMinAlphanumericRatio: Number(form.get("nativeTextMinAlphanumericRatio")),
      ocrMinConfidence: Number(form.get("ocrMinConfidence")),
      ocrTimeoutMs: Number(form.get("ocrTimeoutMs")),
      ocrMaxRetries: Number(form.get("ocrMaxRetries")),
      ocrPageConcurrency: Number(form.get("ocrPageConcurrency")),
      ocrRenderWidth: Number(form.get("ocrRenderWidth")),
      maxPdfPages: Number(form.get("maxPdfPages")),
      maxExtractedCharacters: Number(form.get("maxExtractedCharacters")),
      settings: loadedSettings.settings,
    });
    if (saved) onClose();
  }

  async function submitProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const language = String(form.get("language") || "").trim();
    const saved = await onSaveProvider(
      {
        name: String(form.get("name")),
        provider: String(form.get("provider")) as KnowledgeOcrProvider["provider"],
        status: String(form.get("status")) as KnowledgeOcrProvider["status"],
        endpoint: String(form.get("endpoint")),
        apiKey: String(form.get("apiKey") || "") || undefined,
        settings: language ? { language } : {},
      },
      editingProvider?.id,
    );
    if (saved) {
      formElement.reset();
      setEditingProvider(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Knowledge pipeline settings"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_32px_80px_rgba(15,23,42,0.24)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <ServerCog className="h-5 w-5 text-[var(--accent-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-strong)]">Knowledge processing</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Effective workspace: <span className="font-medium text-[var(--text-base)]">{workspaceName}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]" aria-label="Close settings">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex border-b border-[var(--border-subtle)] px-5">
          <TabButton active={tab === "pipeline"} onClick={() => setTab("pipeline")}>Pipeline policy</TabButton>
          <TabButton active={tab === "providers"} onClick={() => setTab("providers")}>OCR providers ({ocrProviders.length})</TabButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "pipeline" ? (
            <form onSubmit={submitSettings} className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <PipelineStage icon={FileSearch} step="1" title="Native extraction" detail="Use selectable PDF text first. No OCR charge." />
                <PipelineStage icon={ScanText} step="2" title="OCR fallback" detail="OCR only weak or image-only pages, then use the fallback on low confidence." />
                <PipelineStage icon={BrainCircuit} step="3" title="Embedding" detail="Chunk clean text and index it with the selected workspace model." />
              </div>

              <section className="rounded-lg border border-[var(--border-subtle)]">
                <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                  <h3 className="text-sm font-semibold text-[var(--text-strong)]">Provider routing</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Selections apply only to this workspace.</p>
                </div>
                <div className="grid gap-4 p-4 md:grid-cols-2">
                  <Field label="OCR strategy">
                    <select name="ocrMode" className="input" defaultValue={settings.ocrMode}>
                      <option value="fallback">Hybrid: native text, then OCR</option>
                      <option value="always">OCR every PDF page</option>
                      <option value="disabled">Native text only</option>
                    </select>
                  </Field>
                  <Field label="Embedding provider">
                    <select name="embeddingProviderId" className="input" defaultValue={settings.embeddingProviderId ?? ""}>
                      <option value="">Automatic active provider</option>
                      {embeddingProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name} · {provider.embeddingModel}</option>)}
                    </select>
                  </Field>
                  <Field label="Primary OCR provider">
                    <select name="primaryOcrProviderId" className="input" defaultValue={settings.primaryOcrProviderId ?? ""}>
                      <option value="">Use deployment default</option>
                      {activeOcrProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Low-confidence fallback">
                    <select name="fallbackOcrProviderId" className="input" defaultValue={settings.fallbackOcrProviderId ?? ""}>
                      <option value="">Use deployment default / none</option>
                      {activeOcrProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                    </select>
                  </Field>
                </div>
              </section>

              <details className="rounded-lg border border-[var(--border-subtle)]" open>
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--text-strong)]">Quality, limits and throughput</summary>
                <div className="grid gap-4 border-t border-[var(--border-subtle)] p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <NumberField name="nativeTextMinCharacters" label="Native text minimum" value={settings.nativeTextMinCharacters} min={0} max={10000} />
                  <NumberField name="nativeTextMinAlphanumericRatio" label="Native quality ratio" value={settings.nativeTextMinAlphanumericRatio} min={0} max={1} step={0.05} />
                  <NumberField name="ocrMinConfidence" label="OCR confidence fallback" value={settings.ocrMinConfidence} min={0} max={1} step={0.05} />
                  <NumberField name="ocrPageConcurrency" label="Concurrent OCR pages" value={settings.ocrPageConcurrency} min={1} max={settings.deploymentLimits.maxOcrPageConcurrency} />
                  <NumberField name="ocrRenderWidth" label="OCR render width" value={settings.ocrRenderWidth} min={800} max={settings.deploymentLimits.maxOcrRenderWidth} step={100} />
                  <NumberField name="ocrTimeoutMs" label="Provider timeout (ms)" value={settings.ocrTimeoutMs} min={1000} max={settings.deploymentLimits.maxOcrTimeoutMs} step={1000} />
                  <NumberField name="ocrMaxRetries" label="Provider retries" value={settings.ocrMaxRetries} min={0} max={settings.deploymentLimits.maxOcrRetries} />
                  <NumberField name="maxPdfPages" label="Maximum PDF pages" value={settings.maxPdfPages} min={1} max={settings.deploymentLimits.maxPdfPages} />
                  <NumberField name="maxExtractedCharacters" label="Maximum extracted characters" value={settings.maxExtractedCharacters} min={1000} max={settings.deploymentLimits.maxExtractedCharacters} step={1000} />
                </div>
              </details>

              <div className="flex items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-4">
                <p className="text-xs text-[var(--text-muted)]">Changing the embedding provider schedules existing ready sources for re-indexing.</p>
                <button className="h-10 shrink-0 rounded-md bg-[var(--accent-primary)] px-5 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">Save pipeline</button>
              </div>
            </form>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="overflow-hidden rounded-lg border border-[var(--border-subtle)]">
                <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                  <h3 className="text-sm font-semibold text-[var(--text-strong)]">Workspace providers</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Each endpoint must implement the AgentCore OCR adapter contract.</p>
                </div>
                {ocrProviders.length ? (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {ocrProviders.map((provider) => (
                      <div key={provider.id} className="flex items-start justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-[var(--text-strong)]">{provider.name}</p><StatusPill status={provider.status} /></div>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">{providerLabels[provider.provider]}</p>
                          <p className="mt-1 truncate text-xs text-[var(--text-soft)]">{provider.endpoint}</p>
                          <p className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--text-muted)]"><KeyRound className="h-3.5 w-3.5" /> Credential {provider.hasApiKey ? "configured" : "not required / missing"}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => setEditingProvider(provider)} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-hover)]" aria-label={`Edit ${provider.name}`}><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={async () => { if (window.confirm(`Delete ${provider.name}?`) && await onDeleteProvider(provider.id)) setEditingProvider(null); }} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--danger-text)] hover:bg-[var(--danger-bg)]" aria-label={`Delete ${provider.name}`}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="p-8 text-center text-sm text-[var(--text-muted)]">No workspace OCR providers configured.</div>}
              </section>

              <form key={editingProvider?.id ?? "new"} onSubmit={submitProvider} className="h-fit rounded-lg border border-[var(--border-subtle)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-strong)]">{editingProvider ? "Edit provider" : "Add OCR provider"}</h3>
                  {editingProvider ? <button type="button" onClick={() => setEditingProvider(null)} className="text-xs text-[var(--accent-primary)]">Add new instead</button> : <Plus className="h-4 w-4 text-[var(--accent-primary)]" />}
                </div>
                <div className="mt-4 space-y-3">
                  <Field label="Name"><input name="name" className="input" defaultValue={editingProvider?.name ?? ""} required minLength={2} /></Field>
                  <Field label="Service"><select name="provider" className="input" defaultValue={editingProvider?.provider ?? "local_tesseract"}>{Object.entries(providerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                  <Field label="Status"><select name="status" className="input" defaultValue={editingProvider?.status ?? "active"}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
                  <Field label="Adapter endpoint"><input name="endpoint" type="url" className="input" defaultValue={editingProvider?.endpoint ?? ""} placeholder="http://ocr-tesseract:8080/v1/ocr" required /></Field>
                  <Field label="API key"><input name="apiKey" type="password" className="input" placeholder={editingProvider?.hasApiKey ? "Leave blank to keep current key" : "Optional"} /></Field>
                  <Field label="OCR language"><input name="language" className="input" defaultValue={String(editingProvider?.settings.language ?? "eng")} placeholder="eng" /></Field>
                  <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)]"><CheckCircle2 className="h-4 w-4" /> {editingProvider ? "Update provider" : "Save provider"}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`border-b-2 px-4 py-3 text-sm font-medium ${active ? "border-[var(--accent-primary)] text-[var(--accent-primary)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]"}`}>{children}</button>;
}

function PipelineStage({ icon: Icon, step, title, detail }: { icon: typeof FileSearch; step: string; title: string; detail: string }) {
  return <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-tint)] text-[var(--accent-primary)]"><Icon className="h-4 w-4" /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Stage {step}</p><h3 className="text-sm font-semibold text-[var(--text-strong)]">{title}</h3></div></div><p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{detail}</p></div>;
}

function NumberField({ name, label, value, min, max, step = 1 }: { name: string; label: string; value: number; min: number; max: number; step?: number }) {
  return <Field label={label}><input name={name} type="number" className="input" defaultValue={value} min={min} max={max} step={step} required /></Field>;
}
