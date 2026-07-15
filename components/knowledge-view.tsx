import {
  AlertTriangle,
  BookOpenText,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Files,
  Folder,
  FolderPlus,
  Globe2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type {
  FormHandler,
  KnowledgeCategory,
  KnowledgeFolder,
  KnowledgeExtractionSettings,
  KnowledgeExtractionSettingsInput,
  KnowledgeOcrProvider,
  KnowledgeOcrProviderInput,
  KnowledgePageInfo,
  KnowledgeSource,
  KnowledgeSourceQuery,
  KnowledgeSourceVersion,
  AIProvider,
} from "@/lib/types";
import { Card, Field, StatusPill } from "./ui";
import { KnowledgeSettingsModal } from "./knowledge-settings-modal";

type SourceMode = "text" | "uploaded_file" | "website_url";

const products = [
  ["customer_chat", "Customer Chat"],
  ["appointment_booking", "Appointments"],
  ["whatsapp_assistant", "WhatsApp"],
  ["voice_receptionist", "Voice"],
] as const;

const sourceTypes: Array<{
  id: SourceMode;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  { id: "text", label: "Paste text", description: "Add notes, policies, or FAQs", icon: FileText },
  { id: "uploaded_file", label: "Upload file", description: "PDF, DOCX, XLSX, CSV, and text", icon: Upload },
  { id: "website_url", label: "Website", description: "Crawl public website content", icon: Globe2 },
];

export function KnowledgeView({
  sources,
  categories,
  folders,
  onCreate,
  onCreateUrl,
  onUploadFile,
  onIngest,
  onReleaseQuarantine,
  onDelete,
  onUpdate,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateFolder,
  onDeleteFolder,
  pageInfo,
  onQueryChange,
  onRefresh,
  onLoadVersions,
  onCreateCategory,
  onCreateFolder,
  canManageSettings,
  workspaceName,
  extractionSettings,
  settingsError,
  ocrProviders,
  aiProviders,
  onSaveExtractionSettings,
  onLoadSettings,
  onSaveOcrProvider,
  onDeleteOcrProvider,
}: {
  sources: KnowledgeSource[];
  categories: KnowledgeCategory[];
  folders: KnowledgeFolder[];
  onCreate: FormHandler;
  onCreateUrl: FormHandler;
  onUploadFile: FormHandler;
  onIngest: (id: string) => void;
  onReleaseQuarantine: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, event: FormEvent<HTMLFormElement>) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  pageInfo: KnowledgePageInfo;
  onQueryChange: (query: KnowledgeSourceQuery) => void;
  onRefresh: () => void;
  onLoadVersions: (id: string) => Promise<KnowledgeSourceVersion[]>;
  onCreateCategory: FormHandler;
  onCreateFolder: FormHandler;
  canManageSettings: boolean;
  workspaceName: string;
  extractionSettings: KnowledgeExtractionSettings | null;
  settingsError: string | null;
  ocrProviders: KnowledgeOcrProvider[];
  aiProviders: AIProvider[];
  onSaveExtractionSettings: (input: KnowledgeExtractionSettingsInput) => Promise<boolean>;
  onLoadSettings: () => Promise<boolean>;
  onSaveOcrProvider: (input: KnowledgeOcrProviderInput, id?: string) => Promise<boolean>;
  onDeleteOcrProvider: (id: string) => Promise<boolean>;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState<SourceMode>("text");
  const [selectedSource, setSelectedSource] = useState<KnowledgeSource | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const queryCallbackRef = useRef(onQueryChange);
  const refreshRef = useRef(onRefresh);

  const buildQuery = useCallback((page: number): KnowledgeSourceQuery => ({
    page,
    limit: pageInfo.limit,
    search: search.trim() || undefined,
    status:
      statusFilter !== "all" && statusFilter !== "quarantined"
        ? statusFilter
        : undefined,
    quarantined: statusFilter === "quarantined" ? true : undefined,
    type: typeFilter === "all" ? undefined : typeFilter,
    folderId: folderFilter === "all" ? undefined : folderFilter,
  }), [folderFilter, pageInfo.limit, search, statusFilter, typeFilter]);

  useEffect(() => {
    queryCallbackRef.current = onQueryChange;
    refreshRef.current = onRefresh;
  }, [onQueryChange, onRefresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      queryCallbackRef.current(buildQuery(1));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [buildQuery]);

  const hasActiveIngestion = sources.some((source) =>
    ["pending", "processing"].includes(source.status),
  );
  useEffect(() => {
    if (!hasActiveIngestion) return;
    const timer = window.setInterval(() => refreshRef.current(), 3_000);
    return () => window.clearInterval(timer);
  }, [hasActiveIngestion]);

  const filteredSources = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sources.filter((source) => {
      const matchesSearch =
        !term ||
        source.name.toLowerCase().includes(term) ||
        source.fileName?.toLowerCase().includes(term) ||
        source.url?.toLowerCase().includes(term) ||
        source.categories.some((category) => category.toLowerCase().includes(term));
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "quarantined" ? source.isQuarantined : source.status === statusFilter);
      const matchesType = typeFilter === "all" || source.type === typeFilter;
      const matchesFolder =
        folderFilter === "all" ||
        (folderFilter === "unfiled" ? !source.folderId : source.folderId === folderFilter);
      return matchesSearch && matchesStatus && matchesType && matchesFolder;
    });
  }, [folderFilter, search, sources, statusFilter, typeFilter]);

  const readyCount = sources.filter((source) => source.status === "ready" && !source.isQuarantined).length;
  const processingCount = sources.filter((source) => ["pending", "processing"].includes(source.status)).length;
  const attentionCount = sources.filter((source) => source.status === "failed" || source.isQuarantined).length;
  const chunkCount = sources.reduce((total, source) => total + metadataNumber(source, "chunkCount"), 0);

  function openCreate(mode: SourceMode = "text") {
    setSourceMode(mode);
    setIsCreateOpen(true);
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    if (sourceMode === "uploaded_file") onUploadFile(event);
    else if (sourceMode === "website_url") onCreateUrl(event);
    else onCreate(event);
    setIsCreateOpen(false);
  }

  function deleteSource(source: KnowledgeSource) {
    if (!window.confirm(`Delete “${source.name}” and all of its indexed knowledge?`)) return;
    onDelete(source.id);
    setSelectedSource(null);
  }

  return (
    <>
      <div className="space-y-4">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Knowledge summary">
          <SummaryMetric label="Total sources" value={pageInfo.total} detail={`${folders.length} folders`} icon={Files} tone="blue" />
          <SummaryMetric label="Ready to answer" value={readyCount} detail={`${chunkCount} searchable chunks`} icon={CheckCircle2} tone="green" />
          <SummaryMetric label="In progress" value={processingCount} detail="Pending or processing" icon={Sparkles} tone="cyan" />
          <SummaryMetric label="Needs attention" value={attentionCount} detail="Failed or quarantined" icon={AlertTriangle} tone="amber" />
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <Card>
              <div className="border-b border-[var(--border-subtle)] px-4 py-4">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-[var(--accent-primary)]" />
                  <h2 className="text-sm font-semibold text-[var(--text-strong)]">Library</h2>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Organize sources by team or purpose.</p>
              </div>

              <nav className="p-2" aria-label="Knowledge folders">
                <FolderFilterButton active={folderFilter === "all"} label="All sources" count={sources.length} onClick={() => setFolderFilter("all")} />
                {folders.map((folder) => (
                  <FolderFilterButton
                    key={folder.id}
                    active={folderFilter === folder.id}
                    label={folder.name}
                    count={folder._count?.sources ?? sources.filter((source) => source.folderId === folder.id).length}
                    onClick={() => setFolderFilter(folder.id)}
                    actions={<TaxonomyActions label={folder.name} onRename={(name) => onUpdateFolder(folder.id, name)} onDelete={() => onDeleteFolder(folder.id)} />}
                  />
                ))}
                <FolderFilterButton
                  active={folderFilter === "unfiled"}
                  label="Unfiled"
                  count={sources.filter((source) => !source.folderId).length}
                  onClick={() => setFolderFilter("unfiled")}
                />
              </nav>

              <div className="border-t border-[var(--border-subtle)] p-3">
                <form onSubmit={onCreateFolder} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-base)]">
                    <FolderPlus className="h-3.5 w-3.5" /> New folder
                  </div>
                  <input name="name" className="input" required minLength={2} placeholder="Customer support" aria-label="Folder name" />
                  <select name="parentId" className="input" defaultValue="" aria-label="Parent folder">
                    <option value="">Top level</option>
                    {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                  </select>
                  <button className="h-9 w-full rounded-md border border-[var(--border-strong)] text-xs font-medium text-[var(--text-base)] hover:bg-[var(--surface-hover)]">Create folder</button>
                </form>
              </div>
            </Card>

            <Card>
              <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                <h2 className="text-sm font-semibold text-[var(--text-strong)]">Categories</h2>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                {categories.length ? categories.map((category) => (
                  <span key={category.id} className="group inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] pl-2.5 pr-1 py-1 text-xs text-[var(--text-base)]">{category.name}<TaxonomyActions compact label={category.name} onRename={(name) => onUpdateCategory(category.id, name)} onDelete={() => onDeleteCategory(category.id)} /></span>
                )) : <p className="text-xs text-[var(--text-muted)]">No categories yet.</p>}
              </div>
              <form onSubmit={onCreateCategory} className="flex gap-2 border-t border-[var(--border-subtle)] p-3">
                <input name="name" className="input min-w-0" required minLength={2} placeholder="Policies" aria-label="Category name" />
                <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-base)] hover:bg-[var(--surface-hover)]" title="Add category" aria-label="Add category"><Plus className="h-4 w-4" /></button>
              </form>
            </Card>
          </aside>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
              <div>
                <h2 className="font-semibold text-[var(--text-strong)]">Knowledge sources</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Content available to your assistants and customer channels.</p>
              </div>
              <div className="flex items-center gap-2">
                {canManageSettings ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(true);
                      void onLoadSettings();
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border-strong)] px-3 text-sm font-medium text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
                  >
                    <Settings2 className="h-4 w-4" /> Processing
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openCreate()}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]"
                >
                  <Plus className="h-4 w-4" /> Add source
                </button>
              </div>
            </div>

            <div className="grid gap-2 border-b border-[var(--border-subtle)] p-3 md:grid-cols-[minmax(220px,1fr)_160px_170px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="input pl-9" placeholder="Search sources or categories" aria-label="Search knowledge sources" />
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input" aria-label="Filter by status">
                <option value="all">All statuses</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="quarantined">Quarantined</option>
              </select>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="input" aria-label="Filter by source type">
                <option value="all">All source types</option>
                <option value="text">Text</option>
                <option value="uploaded_file">Uploaded files</option>
                <option value="website_url">Websites</option>
                <option value="faq">FAQ</option>
              </select>
            </div>

            {filteredSources.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-[var(--surface-card-muted)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    <tr>
                      <th className="px-5 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Access</th>
                      <th className="px-4 py-3 font-medium">Ingestion</th>
                      <th className="px-4 py-3 font-medium">Updated</th>
                      <th className="px-5 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {filteredSources.map((source) => (
                      <SourceRow
                        key={source.id}
                        source={source}
                        folder={folders.find((folder) => folder.id === source.folderId)}
                        onOpen={() => setSelectedSource(source)}
                        onIngest={() => onIngest(source.id)}
                        onApprove={() => onReleaseQuarantine(source.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-tint)] text-[var(--accent-primary)]"><BookOpenText className="h-6 w-6" /></div>
                <h3 className="mt-4 text-sm font-semibold text-[var(--text-strong)]">{sources.length ? "No sources match these filters" : "Build your knowledge library"}</h3>
                <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">{sources.length ? "Adjust the search or filters to see more results." : "Add a website, upload a document, or paste trusted content for your assistants to use."}</p>
                {!sources.length ? <button type="button" onClick={() => openCreate()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)]"><Plus className="h-4 w-4" /> Add first source</button> : null}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-3 text-xs text-[var(--text-muted)]">
              <span>Page {pageInfo.page} of {pageInfo.totalPages} · {pageInfo.total} sources</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={pageInfo.page <= 1} onClick={() => queryCallbackRef.current(buildQuery(pageInfo.page - 1))} className="h-8 rounded-md border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text-base)] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                <button type="button" disabled={pageInfo.page >= pageInfo.totalPages} onClick={() => queryCallbackRef.current(buildQuery(pageInfo.page + 1))} className="h-8 rounded-md border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text-base)] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {isCreateOpen ? (
        <SourceModal
          mode={sourceMode}
          onModeChange={setSourceMode}
          categories={categories}
          folders={folders}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={submitCreate}
        />
      ) : null}

      {selectedSource ? (
        <SourceDetailsModal
          source={selectedSource}
          folder={folders.find((folder) => folder.id === selectedSource.folderId)}
          onClose={() => setSelectedSource(null)}
          onIngest={() => {
            onIngest(selectedSource.id);
            setSelectedSource(null);
          }}
          onApprove={() => {
            onReleaseQuarantine(selectedSource.id);
            setSelectedSource(null);
          }}
          onDelete={() => deleteSource(selectedSource)}
          onUpdate={(event) => {
            onUpdate(selectedSource.id, event);
            setSelectedSource(null);
          }}
          folders={folders}
          onLoadVersions={onLoadVersions}
        />
      ) : null}

      {isSettingsOpen ? (
        <KnowledgeSettingsModal
          workspaceName={workspaceName}
          settings={extractionSettings}
          error={settingsError}
          ocrProviders={ocrProviders}
          aiProviders={aiProviders}
          onClose={() => setIsSettingsOpen(false)}
          onRetry={() => void onLoadSettings()}
          onSaveSettings={onSaveExtractionSettings}
          onSaveProvider={onSaveOcrProvider}
          onDeleteProvider={onDeleteOcrProvider}
        />
      ) : null}
    </>
  );
}

function SummaryMetric({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: typeof Files; tone: "blue" | "green" | "cyan" | "amber" }) {
  const tones = {
    blue: "bg-[var(--surface-tint)] text-[var(--accent-primary)]",
    green: "bg-[var(--success-bg)] text-[var(--success-text)]",
    cyan: "bg-[var(--surface-accent)] text-[var(--accent-secondary)]",
    amber: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
  };
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-medium text-[var(--text-muted)]">{label}</p><p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{value}</p></div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
      </div>
      <p className="mt-3 text-xs text-[var(--text-soft)]">{detail}</p>
    </div>
  );
}

function FolderFilterButton({ active, label, count, onClick, actions }: { active: boolean; label: string; count: number; onClick: () => void; actions?: ReactNode }) {
  return (
    <div className={`group flex w-full items-center rounded-md ${active ? "bg-[var(--surface-accent)] font-medium text-[var(--accent-primary)]" : "text-[var(--text-base)] hover:bg-[var(--surface-hover)]"}`}>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-sm"><Folder className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{label}</span><span className="text-xs text-[var(--text-soft)]">{count}</span></button>{actions}
    </div>
  );
}

function TaxonomyActions({ label, onRename, onDelete, compact = false }: { label: string; onRename: (name: string) => void; onDelete: () => void; compact?: boolean }) {
  return <span className={`items-center ${compact ? "inline-flex" : "hidden group-hover:flex"}`}><button type="button" className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-soft)] hover:bg-[var(--surface-hover-strong)] hover:text-[var(--text-base)]" title={`Rename ${label}`} onClick={(event) => { event.stopPropagation(); const name = window.prompt("Rename", label)?.trim(); if (name && name !== label) onRename(name); }}><Pencil className="h-3 w-3" /></button><button type="button" className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-soft)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)]" title={`Delete ${label}`} onClick={(event) => { event.stopPropagation(); if (window.confirm(`Delete “${label}”? Sources will not be deleted.`)) onDelete(); }}><Trash2 className="h-3 w-3" /></button></span>;
}

function SourceRow({ source, folder, onOpen, onIngest, onApprove }: { source: KnowledgeSource; folder?: KnowledgeFolder; onOpen: () => void; onIngest: () => void; onApprove: () => void }) {
  const Icon = source.type === "website_url" ? Globe2 : source.type === "uploaded_file" ? FileSpreadsheet : FileText;
  const actionLabel = source.status === "ready" ? "Re-ingest" : source.status === "failed" ? "Retry" : "Ingest";
  return (
    <tr className="group hover:bg-[var(--surface-hover)]">
      <td className="px-5 py-4">
        <button type="button" onClick={onOpen} className="flex max-w-[320px] items-start gap-3 text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-tint)] text-[var(--accent-primary)]"><Icon className="h-4 w-4" /></div>
          <div className="min-w-0"><p className="truncate font-medium text-[var(--text-strong)] group-hover:text-[var(--accent-primary)]">{source.name}</p><p className="mt-1 truncate text-xs text-[var(--text-muted)]">{source.fileName ?? source.url ?? sourceTypeLabel(source.type)}</p></div>
        </button>
      </td>
      <td className="px-4 py-4"><p className="text-xs text-[var(--text-base)]">Level {source.sensitivityLevel ?? 0} · {source.productVisibility?.length ?? 0} products</p><p className="mt-1 max-w-[210px] truncate text-xs text-[var(--text-soft)]">{folder?.name ?? "Unfiled"}{source.categories.length ? ` · ${source.categories.join(", ")}` : ""}</p></td>
      <td className="px-4 py-4"><div className="flex flex-wrap items-center gap-1.5"><StatusPill status={source.status} />{source.isQuarantined ? <StatusPill status="quarantined" /> : null}</div><p className="mt-2 text-xs text-[var(--text-soft)]">{metadataNumber(source, "chunkCount")} chunks</p></td>
      <td className="px-4 py-4 text-xs text-[var(--text-muted)]">{formatDate(source.updatedAt ?? source.createdAt)}</td>
      <td className="px-5 py-4"><div className="flex items-center justify-end gap-2">{source.isQuarantined ? <button type="button" onClick={onApprove} className="h-8 rounded-md border border-[var(--warning-text)]/40 px-2.5 text-xs font-medium text-[var(--warning-text)] hover:bg-[var(--warning-bg)]">Approve</button> : null}<button type="button" onClick={onIngest} disabled={source.status === "processing"} className="h-8 rounded-md border border-[var(--border-strong)] px-2.5 text-xs font-medium text-[var(--text-base)] hover:bg-[var(--surface-card)] disabled:cursor-not-allowed disabled:opacity-50">{actionLabel}</button><button type="button" onClick={onOpen} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-hover-strong)]" aria-label={`View ${source.name}`}><MoreHorizontal className="h-4 w-4" /></button></div></td>
    </tr>
  );
}

function SourceModal({ mode, onModeChange, categories, folders, onClose, onSubmit }: { mode: SourceMode; onModeChange: (mode: SourceMode) => void; categories: KnowledgeCategory[]; folders: KnowledgeFolder[]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [fileName, setFileName] = useState("");

  return (
    <ModalShell title="Add knowledge source" description="Choose trusted content and control exactly where it can be used." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-2 border-b border-[var(--border-subtle)] px-6 py-4 sm:grid-cols-3">
          {sourceTypes.map((type) => { const Icon = type.icon; return <button key={type.id} type="button" onClick={() => onModeChange(type.id)} className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-left ${mode === type.id ? "border-[var(--accent-primary)] bg-[var(--surface-accent)]" : "border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]"}`}><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${mode === type.id ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`} /><span><span className="block text-sm font-medium text-[var(--text-strong)]">{type.label}</span><span className="mt-0.5 block text-xs text-[var(--text-muted)]">{type.description}</span></span></button>; })}
        </div>
        <div className="max-h-[calc(90vh-250px)] space-y-5 overflow-y-auto px-6 py-5">
          <Field label="Source name"><input name="name" className="input" required minLength={2} placeholder={mode === "website_url" ? "Help center" : mode === "uploaded_file" ? "Product handbook" : "Refund policy"} /></Field>
          {mode === "text" ? <Field label="Content"><textarea name="rawText" rows={8} className="input resize-y" required placeholder="Paste the approved content your assistants should use..." /></Field> : null}
          {mode === "uploaded_file" ? <Field label="File"><label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-card-muted)] px-4 py-6 text-center hover:border-[var(--accent-primary)]"><Upload className="h-5 w-5 text-[var(--accent-primary)]" /><span className="mt-2 text-sm font-medium text-[var(--text-strong)]">{fileName || "Choose a file"}</span><span className="mt-1 text-xs text-[var(--text-muted)]">{fileName ? "Click to choose a different file" : "PDF, DOCX, XLSX, TXT, Markdown, CSV, or TSV"}</span><input name="file" type="file" className="sr-only" accept=".txt,.md,.pdf,.docx,.xlsx,.csv,.tsv" required onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></label></Field> : null}
          {mode === "website_url" ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_220px]"><Field label="Website URL"><input name="url" type="url" className="input" placeholder="https://example.com/help" required /></Field><Field label="Automatic recrawl"><select name="recrawlIntervalHours" className="input" defaultValue="24"><option value="6">Every 6 hours</option><option value="24">Daily</option><option value="168">Weekly</option><option value="720">Monthly</option></select></Field></div> : null}
          <MemoryAccessFields categories={categories} folders={folders} />
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] px-6 py-4"><button type="button" onClick={onClose} className="h-10 rounded-md border border-[var(--border-strong)] px-4 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]">Cancel</button><button className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">Add and ingest</button></div>
      </form>
    </ModalShell>
  );
}

function SourceDetailsModal({ source, folder, folders, onClose, onIngest, onApprove, onDelete, onUpdate, onLoadVersions }: { source: KnowledgeSource; folder?: KnowledgeFolder; folders: KnowledgeFolder[]; onClose: () => void; onIngest: () => void; onApprove: () => void; onDelete: () => void; onUpdate: (event: FormEvent<HTMLFormElement>) => void; onLoadVersions: (id: string) => Promise<KnowledgeSourceVersion[]> }) {
  const classification = source.metadata?.classification as Record<string, unknown> | undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [openedAt] = useState(Date.now);
  const [versions, setVersions] = useState<KnowledgeSourceVersion[]>([]);
  const loadVersionsRef = useRef(onLoadVersions);
  useEffect(() => {
    loadVersionsRef.current = onLoadVersions;
  }, [onLoadVersions]);
  useEffect(() => {
    let active = true;
    void loadVersionsRef.current(source.id).then((result) => {
      if (active) setVersions(result);
    });
    return () => {
      active = false;
    };
  }, [source.id]);
  const isStale = source.staleAfterAt
    ? new Date(source.staleAfterAt).getTime() < openedAt
    : false;
  return (
    <ModalShell title={source.name} description={source.fileName ?? source.url ?? sourceTypeLabel(source.type)} onClose={onClose} compact>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2"><StatusPill status={source.status} />{source.isQuarantined ? <StatusPill status="quarantined" /> : null}{isStale ? <StatusPill status="stale" /> : null}<span className="rounded-full bg-[var(--neutral-bg)] px-2 py-1 text-xs font-medium text-[var(--neutral-text)]">Level {source.sensitivityLevel ?? 0}</span></div>
          <button type="button" onClick={() => setIsEditing((value) => !value)} className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border-strong)] px-2.5 text-xs font-medium text-[var(--text-base)] hover:bg-[var(--surface-hover)]"><Pencil className="h-3.5 w-3.5" /> {isEditing ? "Cancel edit" : "Edit"}</button>
        </div>
        {source.errorMessage ? <div className="mt-4 rounded-lg border border-[var(--danger-text)]/20 bg-[var(--danger-bg)] p-3"><p className="text-xs font-medium text-[var(--danger-text)]">Ingestion error</p><p className="mt-1 text-sm text-[var(--danger-text)]">{source.errorMessage}</p></div> : null}
        {isEditing ? (
          <form onSubmit={onUpdate} className="mt-5 space-y-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name"><input name="name" className="input" defaultValue={source.name} required minLength={2} /></Field>
              <Field label="Folder"><select name="folderId" className="input" defaultValue={source.folderId ?? ""}><option value="">Unfiled</option>{folders.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></Field>
              {source.type === "website_url" ? <div className="sm:col-span-2"><Field label="Website URL"><input name="url" type="url" className="input" defaultValue={source.url ?? ""} required /></Field></div> : null}
              <Field label="Sensitivity"><select name="sensitivityLevel" className="input" defaultValue={String(source.sensitivityLevel ?? 0)}><option value="0">0 · Public</option><option value="1">1 · Internal</option><option value="2">2 · Restricted</option><option value="3">3 · Confidential</option><option value="4">4 · Owner only</option></select></Field>
              {source.type === "website_url" ? <Field label="Automatic recrawl"><select name="recrawlIntervalHours" className="input" defaultValue={String(source.recrawlIntervalHours ?? "")}><option value="">Disabled</option><option value="6">Every 6 hours</option><option value="24">Daily</option><option value="168">Weekly</option><option value="720">Monthly</option></select></Field> : <div />}
              <div className="sm:col-span-2"><Field label="Categories"><input name="categories" className="input" defaultValue={source.categories.join(", ")} /></Field></div>
            </div>
            <fieldset><legend className="text-sm font-medium text-[var(--text-base)]">Available to products</legend><div className="mt-2 grid grid-cols-2 gap-2">{products.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2 text-xs"><input type="checkbox" name="productVisibility" value={key} defaultChecked={source.productVisibility.includes(key)} /> {label}</label>)}</div></fieldset>
            <div className="flex justify-end"><button className="h-9 rounded-md bg-[var(--accent-primary)] px-3 text-sm font-medium text-[var(--text-on-accent)]">Save changes</button></div>
          </form>
        ) : null}
        <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
          <Detail label="Source type" value={sourceTypeLabel(source.type)} />
          <Detail label="Folder" value={folder?.name ?? "Unfiled"} />
          <Detail label="Documents" value={String(metadataNumber(source, "documentCount"))} />
          <Detail label="Searchable chunks" value={String(metadataNumber(source, "chunkCount"))} />
          <Detail label="Created" value={formatDate(source.createdAt)} />
          <Detail label="Last ingested" value={source.lastIngestedAt ? formatDate(source.lastIngestedAt) : "Never"} />
          {source.fileSizeBytes ? <Detail label="File size" value={formatBytes(source.fileSizeBytes)} /> : null}
          <Detail label="Classification" value={source.levelSource === "manual" ? "Set manually" : "Automatic"} />
          <Detail label="Source version" value={`v${source.version ?? 0}`} />
          <Detail label="Security scan" value={source.malwareScanStatus?.replaceAll("_", " ") ?? "Not required"} />
          {source.type === "website_url" ? <Detail label="Next recrawl" value={source.nextCrawlAt ? formatDate(source.nextCrawlAt) : "Disabled"} /> : null}
          {source.staleAfterAt ? <Detail label="Fresh until" value={formatDate(source.staleAfterAt)} /> : null}
        </dl>
        <div className="mt-5 border-t border-[var(--border-subtle)] pt-5"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">Available to products</p><div className="mt-2 flex flex-wrap gap-2">{source.productVisibility.map((key) => <span key={key} className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-[var(--text-base)]">{products.find(([product]) => product === key)?.[1] ?? key}</span>)}</div></div>
        <div className="mt-5 border-t border-[var(--border-subtle)] pt-5"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">Categories</p><div className="mt-2 flex flex-wrap gap-2">{source.categories.length ? source.categories.map((category) => <span key={category} className="rounded-full bg-[var(--surface-tint)] px-2.5 py-1 text-xs text-[var(--accent-primary)]">{category}</span>) : <span className="text-sm text-[var(--text-muted)]">No categories</span>}</div></div>
        {typeof classification?.rationale === "string" ? <div className="mt-5 rounded-lg bg-[var(--surface-card-muted)] p-4"><div className="flex items-center gap-2 text-sm font-medium text-[var(--text-strong)]"><ShieldCheck className="h-4 w-4 text-[var(--accent-primary)]" /> Automatic classification</div><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{classification.rationale}</p></div> : null}
        <div className="mt-5 border-t border-[var(--border-subtle)] pt-5"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">Version history</p>{versions.length ? <div className="mt-2 divide-y divide-[var(--border-subtle)] rounded-md border border-[var(--border-subtle)]">{versions.map((version) => <div key={version.id} className="flex items-center justify-between gap-3 px-3 py-2.5"><div><p className="text-sm font-medium text-[var(--text-strong)]">Version {version.version}</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">{formatDate(version.createdAt)} · {version.documentCount} documents</p></div><span className="text-xs text-[var(--text-soft)]">{version.chunkCount} chunks</span></div>)}</div> : <p className="mt-2 text-sm text-[var(--text-muted)]">No captured versions yet.</p>}</div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-6 py-4"><button type="button" onClick={onDelete} className="inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"><Trash2 className="h-4 w-4" /> Delete source</button><div className="flex gap-2">{source.isQuarantined ? <button type="button" onClick={onApprove} className="h-9 rounded-md border border-[var(--warning-text)]/40 px-3 text-sm font-medium text-[var(--warning-text)] hover:bg-[var(--warning-bg)]">Approve for retrieval</button> : null}<button type="button" onClick={onIngest} disabled={source.status === "processing"} className="h-9 rounded-md bg-[var(--accent-primary)] px-3 text-sm font-medium text-[var(--text-on-accent)] disabled:opacity-50">{source.status === "ready" ? "Re-ingest" : source.status === "failed" ? "Retry ingestion" : "Ingest now"}</button></div></div>
    </ModalShell>
  );
}

function ModalShell({ title, description, onClose, compact = false, children }: { title: string; description: string; onClose: () => void; compact?: boolean; children: ReactNode }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`max-h-[90vh] w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_32px_80px_rgba(15,23,42,0.22)] ${compact ? "max-w-2xl" : "max-w-4xl"}`}><div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5"><div className="min-w-0"><h2 className="truncate text-lg font-semibold text-[var(--text-strong)]">{title}</h2><p className="mt-1 truncate text-sm text-[var(--text-muted)]">{description}</p></div><button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]" aria-label="Close dialog"><X className="h-4 w-4" /></button></div>{children}</div></div>;
}

function MemoryAccessFields({ categories, folders }: { categories: KnowledgeCategory[]; folders: KnowledgeFolder[] }) {
  return (
    <div className="border-t border-[var(--border-subtle)] pt-5">
      <div className="mb-4"><h3 className="text-sm font-semibold text-[var(--text-strong)]">Access and classification</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Automatic classification quarantines confidential content until it is approved.</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Sensitivity"><select name="sensitivityLevel" className="input" defaultValue=""><option value="">Auto classify (recommended)</option><option value="0">0 · Public</option><option value="1">1 · Internal</option><option value="2">2 · Restricted</option><option value="3">3 · Confidential</option><option value="4">4 · Owner only</option></select></Field>
        <Field label="Folder"><select name="folderId" className="input" defaultValue=""><option value="">Unfiled</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Categories"><input name="categories" className="input" list="knowledge-categories" placeholder="policies, support, pricing" /></Field><datalist id="knowledge-categories">{categories.map((category) => <option key={category.id} value={category.name} />)}</datalist><p className="mt-1 text-xs text-[var(--text-soft)]">Separate multiple categories with commas.</p></div>
      </div>
      <fieldset className="mt-4"><legend className="text-sm font-medium text-[var(--text-base)]">Available to products</legend><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{products.map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-3 py-2.5 text-sm text-[var(--text-base)]"><input type="checkbox" name="productVisibility" value={key} defaultChecked /> {label}</label>)}</div></fieldset>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-[var(--text-soft)]">{label}</dt><dd className="mt-1 text-sm font-medium text-[var(--text-strong)]">{value}</dd></div>; }
function sourceTypeLabel(type: string) { return type === "website_url" ? "Website" : type === "uploaded_file" ? "Uploaded file" : type === "faq" ? "FAQ" : "Pasted text"; }
function metadataNumber(source: KnowledgeSource, key: string) { const value = source.metadata?.[key]; return typeof value === "number" ? value : 0; }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function formatBytes(value: number) { if (value < 1024) return `${value} B`; if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`; return `${(value / (1024 * 1024)).toFixed(1)} MB`; }
