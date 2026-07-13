"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Code2,
  ExternalLink,
  FolderOpen,
  Globe2,
  MessageCircle,
  MoreHorizontal,
  Palette,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import type {
  Conversation,
  FormHandler,
  KnowledgeFolder,
  WidgetConfig,
  WidgetPageInfo,
} from "@/lib/types";
import { Field, StatusPill } from "./ui";

type WidgetPosition = "bottom-right" | "bottom-left";

type WidgetAppearance = {
  assistantName: string;
  primaryColor: string;
  launcherLabel: string;
  position: WidgetPosition;
};

export function WidgetView({
  configs,
  pageInfo,
  config,
  folders,
  onSelect,
  onBack,
  onCreate,
  onSubmit,
  onDelete,
  onPageChange,
  testConversation,
  onSendTestMessage,
  onResetTestChat,
  apiBaseUrl,
}: {
  configs: WidgetConfig[];
  pageInfo: WidgetPageInfo;
  config: WidgetConfig | null;
  folders: KnowledgeFolder[];
  onSelect: (config: WidgetConfig) => void;
  onBack: () => void;
  onCreate: FormHandler;
  onSubmit: FormHandler;
  onDelete: (config: WidgetConfig) => void;
  onPageChange: (page: number) => void;
  testConversation: Conversation | null;
  onSendTestMessage: FormHandler;
  onResetTestChat: () => void;
  apiBaseUrl: string;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (!config) {
    return (
      <>
        <WidgetList
          configs={configs}
          pageInfo={pageInfo}
          folders={folders}
          onSelect={onSelect}
          onDelete={onDelete}
          onPageChange={onPageChange}
          onCreate={() => setIsCreateOpen(true)}
        />
        {isCreateOpen ? (
          <CreateWidgetModal
            folders={folders}
            onClose={() => setIsCreateOpen(false)}
            onSubmit={onCreate}
          />
        ) : null}
      </>
    );
  }

  return (
    <WidgetEditor
      key={config.id}
      config={config}
      folders={folders}
      onBack={onBack}
      onSubmit={onSubmit}
      onDelete={() => onDelete(config)}
      testConversation={testConversation}
      onSendTestMessage={onSendTestMessage}
      onResetTestChat={onResetTestChat}
      apiBaseUrl={apiBaseUrl}
    />
  );
}

function WidgetEditor({
  config,
  folders,
  onBack,
  onSubmit,
  onDelete,
  testConversation,
  onSendTestMessage,
  onResetTestChat,
  apiBaseUrl,
}: {
  config: WidgetConfig;
  folders: KnowledgeFolder[];
  onBack: () => void;
  onSubmit: FormHandler;
  onDelete: () => void;
  testConversation: Conversation | null;
  onSendTestMessage: FormHandler;
  onResetTestChat: () => void;
  apiBaseUrl: string;
}) {
  const [copied, setCopied] = useState<"key" | "snippet" | null>(null);
  const [knowledgeScope, setKnowledgeScope] = useState<"all" | "folders">(
    config.knowledgeScope,
  );
  const appearance = useMemo(() => readAppearance(config.settings), [config]);
  const frontendOrigin = useSyncExternalStore(
    subscribeToOrigin,
    readBrowserOrigin,
    readServerOrigin,
  );
  const scriptUrl = frontendOrigin
    ? `${frontendOrigin}/widget.js`
    : "/widget.js";

  const snippet = `<script
  src="${scriptUrl}"
  data-widget-key="${config?.widgetKey ?? "YOUR_WIDGET_KEY"}"
  data-api-base="${apiBaseUrl}"
  defer
></script>`;
  const isReady = Boolean(config.enabled && config.widgetKey);

  async function copy(value: string, type: "key" | "snippet") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
            aria-label="Back to widgets"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-[var(--text-strong)]">
                {config.name}
              </h2>
              <StatusPill status={isReady ? "active" : "disabled"} />
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Configure, test and install the customer-facing AI chat widget.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete ${config.name}? Existing conversations will be preserved.`)) {
                onDelete();
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--danger-text)]/40 hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)]"
            title="Delete widget"
          >
            <Trash2 size={16} />
          </button>
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-3 py-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-soft)]">
              Widget key
            </p>
            <p className="max-w-72 truncate font-mono text-xs text-[var(--text-base)]">
              {config.widgetKey}
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-hover-strong)] hover:text-[var(--text-strong)] disabled:opacity-40"
            title="Copy widget key"
            onClick={() => copy(config.widgetKey, "key")}
          >
            {copied === "key" ? <Check size={16} /> : <Clipboard size={16} />}
          </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Settings2 size={17} className="text-[var(--accent-primary)]" />
                  <h2 className="font-semibold text-[var(--text-strong)]">
                    Configuration
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Changes apply to every website using this widget key.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-base)]">
                <input
                  name="enabled"
                  type="checkbox"
                  defaultChecked={config?.enabled}
                />
                Enabled
              </label>
            </div>

            <div className="grid gap-6 p-5 xl:grid-cols-2">
              <section>
                <SectionHeading
                  icon={Sparkles}
                  title="Assistant behavior"
                  description="The identity and first message visitors see."
                />
                <div className="mt-4 space-y-4">
                  <Field label="Widget name">
                    <input
                      name="name"
                      defaultValue={config.name}
                      minLength={2}
                      maxLength={80}
                      required
                      className="input"
                      placeholder="Sales Assistant"
                    />
                  </Field>
                  <Field label="Assistant name">
                    <input
                      key={`${config?.widgetKey}-assistant-name`}
                      name="assistantName"
                      defaultValue={appearance.assistantName}
                      maxLength={60}
                      className="input"
                      placeholder="AgentCore Assistant"
                    />
                  </Field>
                  <Field label="Greeting">
                    <textarea
                      key={`${config?.widgetKey}-greeting`}
                      name="greetingText"
                      rows={3}
                      maxLength={240}
                      defaultValue={config?.greetingText}
                      className="input resize-y"
                      placeholder="Hi! How can I help you today?"
                    />
                  </Field>
                  <Field label="Launcher label">
                    <input
                      key={`${config?.widgetKey}-launcher-label`}
                      name="launcherLabel"
                      defaultValue={appearance.launcherLabel}
                      maxLength={32}
                      className="input"
                      placeholder="Chat with us"
                    />
                  </Field>
                </div>
              </section>

              <section>
                <SectionHeading
                  icon={Palette}
                  title="Appearance"
                  description="Keep the widget aligned with your website."
                />
                <div className="mt-4 space-y-4">
                  <Field label="Brand color">
                    <div className="flex gap-2">
                      <input
                        key={`${config?.widgetKey}-color`}
                        name="primaryColor"
                        type="color"
                        defaultValue={appearance.primaryColor}
                        className="h-10 w-12 shrink-0 rounded-md border border-[var(--border-strong)] bg-[var(--input-background)] p-1"
                        title="Choose brand color"
                      />
                      <input
                        value={appearance.primaryColor}
                        className="input font-mono uppercase"
                        readOnly
                        aria-label="Current brand color"
                      />
                    </div>
                  </Field>
                  <Field label="Widget position">
                    <select
                      key={`${config?.widgetKey}-position`}
                      name="position"
                      defaultValue={appearance.position}
                      className="input"
                    >
                      <option value="bottom-right">Bottom right</option>
                      <option value="bottom-left">Bottom left</option>
                    </select>
                  </Field>
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-3 text-xs text-[var(--text-muted)]">
                    The installed widget uses an isolated Shadow DOM, so your site
                    styles cannot override its layout.
                  </div>
                </div>
              </section>
            </div>

            <div className="border-t border-[var(--border-subtle)] p-5">
              <SectionHeading
                icon={FolderOpen}
                title="Knowledge access"
                description="Choose exactly which ready sources may ground this widget's answers."
              />
              <KnowledgeScopeFields
                folders={folders}
                scope={knowledgeScope}
                selectedFolderIds={config.folderIds}
                onScopeChange={setKnowledgeScope}
              />
            </div>

            <div className="border-t border-[var(--border-subtle)] p-5">
              <SectionHeading
                icon={ShieldCheck}
                title="Domain access"
                description="Only these exact website origins may start conversations."
              />
              <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                <Field label="Allowed website origins">
                  <DomainInput
                    key={`${config?.widgetKey}-domains`}
                    defaultDomains={config.allowedDomains}
                  />
                </Field>
                <button className="h-10 rounded-md bg-[var(--accent-primary)] px-5 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
                  Save changes
                </button>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-soft)]">
                <Globe2 size={13} /> Paste a website link and press Enter. Paths are
                normalized to their exact origin.
              </p>
            </div>
          </form>

          <InstallPanel
            snippet={snippet}
            scriptUrl={scriptUrl}
            copied={copied === "snippet"}
            enabled={Boolean(config?.widgetKey)}
            domainProtected={Boolean(config?.allowedDomains.length)}
            onCopy={() => copy(snippet, "snippet")}
          />
        </div>

        <div className="space-y-4">
          <WidgetPreview
            config={config}
            appearance={appearance}
          />

          <TestChat
            config={config}
            appearance={appearance}
            conversation={testConversation}
            onSubmit={onSendTestMessage}
            onReset={onResetTestChat}
          />
        </div>
      </div>
    </div>
  );
}

function WidgetList({
  configs,
  pageInfo,
  folders,
  onSelect,
  onDelete,
  onPageChange,
  onCreate,
}: {
  configs: WidgetConfig[];
  pageInfo: WidgetPageInfo;
  folders: KnowledgeFolder[];
  onSelect: (config: WidgetConfig) => void;
  onDelete: (config: WidgetConfig) => void;
  onPageChange: (page: number) => void;
  onCreate: () => void;
}) {
  const firstItem = pageInfo.total
    ? (pageInfo.page - 1) * pageInfo.limit + 1
    : 0;
  const lastItem = Math.min(pageInfo.page * pageInfo.limit, pageInfo.total);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">
            Website widgets
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create assistants for different websites, audiences and knowledge areas.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]"
        >
          <Plus size={16} /> Add widget
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        {configs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-soft)]">
                <tr>
                  <th className="px-5 py-3">Widget</th>
                  <th className="px-4 py-3">Knowledge</th>
                  <th className="px-4 py-3">Domains</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {configs.map((widget) => (
                  <tr
                    key={widget.id}
                    className="group hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => onSelect(widget)}
                        className="flex max-w-80 items-start gap-3 text-left"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-accent)] text-[var(--accent-primary)]">
                          <MessageCircle size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text-strong)] group-hover:text-[var(--accent-primary)]">
                            {widget.name}
                          </p>
                          <p className="mt-1 truncate font-mono text-[11px] text-[var(--text-soft)]">
                            {widget.widgetKey}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--text-base)]">
                      {knowledgeScopeLabel(widget, folders)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-[var(--text-base)]">
                        {widget.allowedDomains.length
                          ? `${widget.allowedDomains.length} allowed`
                          : "Any domain"}
                      </p>
                      <p className="mt-1 max-w-56 truncate text-xs text-[var(--text-soft)]">
                        {widget.allowedDomains[0] ?? "Add domains before production"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={widget.enabled ? "active" : "disabled"} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <WidgetRowActions
                        widget={widget}
                        onOpen={() => onSelect(widget)}
                        onDelete={() => onDelete(widget)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between gap-4 border-t border-[var(--border-subtle)] px-5 py-3">
              <p className="text-xs text-[var(--text-muted)]">
                Showing {firstItem}-{lastItem} of {pageInfo.total} widgets
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPageChange(pageInfo.page - 1)}
                  disabled={pageInfo.page <= 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-base)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous widget page"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="min-w-24 text-center text-xs font-medium text-[var(--text-base)]">
                  Page {pageInfo.page} of {pageInfo.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => onPageChange(pageInfo.page + 1)}
                  disabled={pageInfo.page >= pageInfo.totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-base)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next widget page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-accent)] text-[var(--accent-primary)]">
              <MessageCircle size={22} />
            </div>
            <h3 className="mt-4 font-semibold text-[var(--text-strong)]">
              Create your first website widget
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
              Assign all knowledge or selected folders, test the answers, then add
              one script to your website.
            </p>
            <button
              type="button"
              onClick={onCreate}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-white"
            >
              <Plus size={16} /> Add widget
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function WidgetRowActions({
  widget,
  onOpen,
  onDelete,
}: {
  widget: WidgetConfig;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <details className="relative inline-block text-left">
      <summary
        className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-hover-strong)] hover:text-[var(--text-strong)] [&::-webkit-details-marker]:hidden"
        aria-label={`Actions for ${widget.name}`}
      >
        <MoreHorizontal size={17} />
      </summary>
      <div className="absolute bottom-9 right-0 z-30 w-40 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
        >
          <Settings2 size={15} /> Open settings
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                `Delete ${widget.name}? Existing conversations will be preserved.`,
              )
            ) {
              onDelete();
            }
          }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
        >
          <Trash2 size={15} /> Delete widget
        </button>
      </div>
    </details>
  );
}

function CreateWidgetModal({
  folders,
  onClose,
  onSubmit,
}: {
  folders: KnowledgeFolder[];
  onClose: () => void;
  onSubmit: FormHandler;
}) {
  const [scope, setScope] = useState<"all" | "folders">("all");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add widget"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_32px_80px_rgba(15,23,42,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              Add website widget
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Create an assistant and choose the knowledge it is allowed to use.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(92vh-160px)] space-y-6 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Widget name">
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                className="input"
                placeholder="Sales Assistant"
              />
            </Field>
            <Field label="Assistant name">
              <input
                name="assistantName"
                required
                defaultValue="AgentCore Assistant"
                className="input"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Greeting">
                <textarea
                  name="greetingText"
                  rows={3}
                  required
                  defaultValue="Hi! How can I help you today?"
                  className="input resize-y"
                />
              </Field>
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-5">
            <SectionHeading
              icon={FolderOpen}
              title="Knowledge access"
              description="Folder selections automatically include child folders."
            />
            <KnowledgeScopeFields
              folders={folders}
              scope={scope}
              selectedFolderIds={[]}
              onScopeChange={setScope}
            />
          </div>

          <div className="grid gap-4 border-t border-[var(--border-subtle)] pt-5 sm:grid-cols-2">
            <Field label="Launcher label">
              <input
                name="launcherLabel"
                defaultValue="Chat with us"
                className="input"
              />
            </Field>
            <Field label="Brand color">
              <input
                name="primaryColor"
                type="color"
                defaultValue="#2563eb"
                className="h-10 w-full rounded-md border border-[var(--border-strong)] bg-[var(--input-background)] p-1"
              />
            </Field>
            <Field label="Widget position">
              <select name="position" defaultValue="bottom-right" className="input">
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-[var(--text-base)]">
              <input name="enabled" type="checkbox" defaultChecked /> Enabled
            </label>
            <div className="sm:col-span-2">
              <Field label="Allowed website origins">
                <DomainInput />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-[var(--border-strong)] px-4 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button className="h-10 rounded-md bg-[var(--accent-primary)] px-5 text-sm font-medium text-white hover:bg-[var(--accent-primary-strong)]">
            Create widget
          </button>
        </div>
      </form>
    </div>
  );
}

function DomainInput({ defaultDomains = [] }: { defaultDomains?: string[] }) {
  const [domains, setDomains] = useState(() =>
    [...new Set(defaultDomains.map(normalizeOrigin).filter(Boolean))] as string[],
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addDraft(value = draft) {
    const candidates = value
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!candidates.length) return true;

    const normalized = candidates.map(normalizeOrigin);
    if (normalized.some((entry) => !entry)) {
      setError("Enter a valid HTTP or HTTPS website address.");
      return false;
    }

    setDomains((current) => [
      ...new Set([...current, ...(normalized as string[])]),
    ]);
    setDraft("");
    setError(null);
    return true;
  }

  return (
    <div>
      <div
        className={`rounded-lg border bg-[var(--input-background)] p-2 transition focus-within:ring-2 focus-within:ring-[var(--focus-ring)] ${
          error ? "border-[var(--danger-text)]" : "border-[var(--border-strong)]"
        }`}
      >
        {domains.length ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {domains.map((domain) => (
              <span
                key={domain}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-accent)] px-2.5 py-1 font-mono text-xs text-[var(--text-base)]"
              >
                <Globe2 size={12} className="shrink-0 text-[var(--accent-primary)]" />
                <span className="truncate">{domain}</span>
                <button
                  type="button"
                  onClick={() =>
                    setDomains((current) =>
                      current.filter((entry) => entry !== domain),
                    )
                  }
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover-strong)] hover:text-[var(--danger-text)]"
                  aria-label={`Remove ${domain}`}
                >
                  <X size={12} />
                </button>
                <input type="hidden" name="allowedDomains" value={domain} />
              </span>
            ))}
          </div>
        ) : null}
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            event.currentTarget.setCustomValidity("");
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              const valid = addDraft();
              event.currentTarget.setCustomValidity(
                valid ? "" : "Enter a valid HTTP or HTTPS website address.",
              );
              if (!valid) event.currentTarget.reportValidity();
            }
            if (event.key === "Backspace" && !draft && domains.length) {
              setDomains((current) => current.slice(0, -1));
            }
          }}
          onBlur={(event) => {
            const valid = addDraft();
            event.currentTarget.setCustomValidity(
              valid ? "" : "Enter a valid HTTP or HTTPS website address.",
            );
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            if (/[\n,]/.test(pasted)) {
              event.preventDefault();
              const valid = addDraft(pasted);
              event.currentTarget.setCustomValidity(
                valid ? "" : "Enter valid HTTP or HTTPS website addresses.",
              );
            }
          }}
          className="h-8 w-full bg-transparent px-1 text-sm text-[var(--text-strong)] outline-none placeholder:text-[var(--text-soft)]"
          inputMode="url"
          placeholder="https://example.com"
          aria-label="Add allowed website origin"
          aria-invalid={Boolean(error)}
        />
        <input
          type="hidden"
          name="allowedDomains"
          value={normalizeOrigin(draft) ?? ""}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-[var(--danger-text)]">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-[var(--text-soft)]">
          Press Enter to add. Leave empty to allow any origin.
        </p>
      )}
    </div>
  );
}

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`,
    );
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function KnowledgeScopeFields({
  folders,
  scope,
  selectedFolderIds,
  onScopeChange,
}: {
  folders: KnowledgeFolder[];
  scope: "all" | "folders";
  selectedFolderIds: string[];
  onScopeChange: (scope: "all" | "folders") => void;
}) {
  const orderedFolders = orderFolders(folders);

  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
            scope === "all"
              ? "border-[var(--accent-primary)] bg-[var(--surface-accent)]"
              : "border-[var(--border-subtle)] bg-[var(--surface-card-muted)]"
          }`}
        >
          <input
            name="knowledgeScope"
            type="radio"
            value="all"
            checked={scope === "all"}
            onChange={() => onScopeChange("all")}
          />
          <span>
            <span className="block text-sm font-semibold text-[var(--text-strong)]">
              All knowledge
            </span>
            <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
              Use every ready source available to Customer Chat.
            </span>
          </span>
        </label>
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
            scope === "folders"
              ? "border-[var(--accent-primary)] bg-[var(--surface-accent)]"
              : "border-[var(--border-subtle)] bg-[var(--surface-card-muted)]"
          }`}
        >
          <input
            name="knowledgeScope"
            type="radio"
            value="folders"
            checked={scope === "folders"}
            onChange={() => onScopeChange("folders")}
          />
          <span>
            <span className="block text-sm font-semibold text-[var(--text-strong)]">
              Selected folders
            </span>
            <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
              Restrict answers to one or more knowledge areas.
            </span>
          </span>
        </label>
      </div>

      {scope === "folders" ? (
        <div className="max-h-60 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-2">
          {orderedFolders.length ? (
            orderedFolders.map(({ folder, depth }) => (
              <label
                key={folder.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 hover:bg-[var(--surface-hover)]"
                style={{ paddingLeft: `${12 + depth * 20}px` }}
              >
                <input
                  name="folderIds"
                  type="checkbox"
                  value={folder.id}
                  defaultChecked={selectedFolderIds.includes(folder.id)}
                />
                <FolderOpen size={15} className="text-[var(--accent-primary)]" />
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-base)]">
                  {folder.name}
                </span>
                <span className="text-xs text-[var(--text-soft)]">
                  {folder._count?.sources ?? 0} sources
                </span>
              </label>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              Create folders in Knowledge before using folder-restricted scope.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function knowledgeScopeLabel(
  widget: WidgetConfig,
  folders: KnowledgeFolder[],
) {
  if (widget.knowledgeScope === "all") return "All knowledge";
  const names = widget.folderIds
    .map((id) => folders.find((folder) => folder.id === id)?.name)
    .filter(Boolean);
  if (!names.length) return "No folders selected";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function orderFolders(folders: KnowledgeFolder[]) {
  const children = new Map<string | null, KnowledgeFolder[]>();
  for (const folder of folders) {
    const parentId = folder.parentId ?? null;
    const entries = children.get(parentId) ?? [];
    entries.push(folder);
    children.set(parentId, entries);
  }
  for (const entries of children.values()) {
    entries.sort((a, b) => a.name.localeCompare(b.name));
  }
  const result: Array<{ folder: KnowledgeFolder; depth: number }> = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const folder of children.get(parentId) ?? []) {
      result.push({ folder, depth });
      visit(folder.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Settings2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-accent)] text-[var(--accent-primary)]">
        <Icon size={16} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-strong)]">{title}</h3>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
      </div>
    </div>
  );
}

function WidgetPreview({
  config,
  appearance,
}: {
  config: WidgetConfig | null;
  appearance: WidgetAppearance;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
        <div>
          <h2 className="font-semibold text-[var(--text-strong)]">Live preview</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Desktop visitor experience
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface-accent)] px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)]">
          Preview
        </span>
      </div>
      <div className="relative min-h-96 bg-[var(--surface-card-muted)] p-5">
        <div className="absolute inset-x-5 top-5 h-3 rounded-full bg-[var(--surface-hover-strong)]" />
        <div className="absolute inset-x-5 top-12 grid grid-cols-3 gap-2">
          <div className="h-24 rounded-lg bg-[var(--surface-hover)]" />
          <div className="col-span-2 h-24 rounded-lg bg-[var(--surface-hover)]" />
        </div>
        <div
          className={`absolute bottom-20 w-[min(340px,calc(100%-40px))] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)] ${
            appearance.position === "bottom-left" ? "left-5" : "right-5"
          }`}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 text-white"
            style={{ backgroundColor: appearance.primaryColor }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Sparkles size={17} />
            </div>
            <div>
              <p className="text-sm font-semibold">{appearance.assistantName}</p>
              <p className="text-[11px] text-white/80">Typically replies instantly</p>
            </div>
          </div>
          <div className="min-h-40 bg-[#f8fafc] p-4">
            <div className="max-w-[85%] rounded-xl rounded-tl-sm border border-[#e2e8f0] bg-white p-3 text-xs leading-5 text-[#334155] shadow-sm">
              {config?.greetingText ?? "Hi! How can I help you today?"}
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-[#e2e8f0] bg-white p-3">
            <div className="flex-1 rounded-lg border border-[#cbd5e1] px-3 py-2 text-xs text-[#94a3b8]">
              Type your message...
            </div>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: appearance.primaryColor }}
            >
              <Send size={14} />
            </div>
          </div>
        </div>
        <div
          className={`absolute bottom-5 flex h-12 items-center gap-2 rounded-full px-4 text-sm font-medium text-white shadow-lg ${
            appearance.position === "bottom-left" ? "left-5" : "right-5"
          }`}
          style={{ backgroundColor: appearance.primaryColor }}
        >
          <MessageCircle size={18} />
          {appearance.launcherLabel}
        </div>
      </div>
    </section>
  );
}

function TestChat({
  config,
  appearance,
  conversation,
  onSubmit,
  onReset,
}: {
  config: WidgetConfig | null;
  appearance: WidgetAppearance;
  conversation: Conversation | null;
  onSubmit: FormHandler;
  onReset: () => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[var(--text-strong)]">Test chat</h2>
            {conversation ? <StatusPill status="active" /> : null}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Uses the public API and creates a real Inbox conversation.
          </p>
        </div>
        {conversation ? (
          <button
            type="button"
            onClick={onReset}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            title="Start a new test conversation"
          >
            <RefreshCw size={15} />
          </button>
        ) : null}
      </div>

      <div className="max-h-80 min-h-44 space-y-3 overflow-auto bg-[var(--surface-card-muted)] p-4">
        {conversation?.messages.length ? (
          conversation.messages.map((message) => {
            const isVisitor = message.role === "visitor";
            return (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-xl p-3 text-sm leading-5 ${
                  isVisitor
                    ? "ml-auto text-white"
                    : "border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-base)]"
                }`}
                style={isVisitor ? { backgroundColor: appearance.primaryColor } : undefined}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.role === "assistant" ? (
                  <AiStatus metadata={message.metadata} />
                ) : null}
                {message.citations.length ? (
                  <p className="mt-2 text-[11px] opacity-70">
                    Grounded in {message.citations.length} knowledge source
                    {message.citations.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[var(--accent-primary)]">
              <MessageCircle size={18} />
            </div>
            <p className="mt-3 text-sm font-medium text-[var(--text-strong)]">
              Start a visitor conversation
            </p>
            <p className="mt-1 max-w-64 text-xs text-[var(--text-muted)]">
              Ask something covered by a ready knowledge source to verify the full
              RAG flow.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-[var(--border-subtle)] p-4">
        <input
          name="message"
          required
          maxLength={2000}
          placeholder="Ask a customer question..."
          className="input min-w-0 flex-1"
          disabled={!config?.enabled || !config?.widgetKey}
        />
        <button
          className="flex h-10 items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!config?.enabled || !config?.widgetKey}
        >
          <Send size={15} /> Send
        </button>
      </div>
    </form>
  );
}

function InstallPanel({
  snippet,
  scriptUrl,
  copied,
  enabled,
  domainProtected,
  onCopy,
}: {
  snippet: string;
  scriptUrl: string;
  copied: boolean;
  enabled: boolean;
  domainProtected: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-accent)] text-[var(--accent-primary)]">
            <Code2 size={17} />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-strong)]">Install widget</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Paste this once before the closing body tag on your website.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          disabled={!enabled}
          className="flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] px-3 text-sm font-medium text-[var(--text-base)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
        >
          {copied ? <Check size={15} /> : <Clipboard size={15} />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <div className="p-5">
        <pre className="overflow-x-auto rounded-lg bg-[#0f172a] p-4 text-xs leading-5 text-[#dbeafe]">
          <code>{snippet}</code>
        </pre>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <InstallCheck label="Script available" value={scriptUrl.endsWith("/widget.js")} />
          <InstallCheck label="Widget configured" value={enabled} />
          <InstallCheck label="Domain protected" value={domainProtected} />
        </div>
        <a
          href={scriptUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-primary)] hover:underline"
        >
          Open loader script <ExternalLink size={13} />
        </a>
      </div>
    </section>
  );
}

function InstallCheck({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-3 py-2 text-xs text-[var(--text-base)]">
      <CheckCircle2
        size={15}
        className={value ? "text-[var(--success-text)]" : "text-[var(--text-soft)]"}
      />
      {label}
    </div>
  );
}

function AiStatus({ metadata }: { metadata: Record<string, unknown> }) {
  const usedFallback = metadata.usedFallback === true;
  const provider =
    typeof metadata.provider === "string" ? metadata.provider : "local";

  return (
    <p
      className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] ${
        usedFallback
          ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
          : "bg-[var(--success-bg)] text-[var(--success-text)]"
      }`}
    >
      {usedFallback ? "Fallback response" : `AI ${provider}`}
    </p>
  );
}

function readAppearance(settings?: Record<string, unknown>): WidgetAppearance {
  return {
    assistantName: readString(settings, "assistantName", "AgentCore Assistant"),
    primaryColor: normalizeColor(readString(settings, "primaryColor", "#2563eb")),
    launcherLabel: readString(settings, "launcherLabel", "Chat with us"),
    position:
      settings?.position === "bottom-left" ? "bottom-left" : "bottom-right",
  };
}

function readString(
  settings: Record<string, unknown> | undefined,
  key: string,
  fallback: string,
) {
  return typeof settings?.[key] === "string" && settings[key].trim()
    ? settings[key]
    : fallback;
}

function normalizeColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#2563eb";
}

function subscribeToOrigin() {
  return () => undefined;
}

function readBrowserOrigin() {
  return window.location.origin;
}

function readServerOrigin() {
  return "";
}
