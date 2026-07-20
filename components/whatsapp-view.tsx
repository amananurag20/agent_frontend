import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Languages,
  MapPin,
  MessageSquareText,
  MoreVertical,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Video,
  X,
} from "lucide-react";
import type {
  FormHandler,
  KnowledgeFolder,
  User,
  WhatsAppConfig,
  WhatsAppConversation,
  WhatsAppConversationList,
  WhatsAppMessage,
  WhatsAppTemplate,
} from "@/lib/types";
import { Card, EmptyState, Field, StatusPill } from "./ui";

type WhatsAppFilters = {
  status: string;
  search: string;
  page: number;
  limit: number;
};

type ConfigFormHandler = (
  event: FormEvent<HTMLFormElement>,
) => boolean | Promise<boolean>;

type DeleteConfigHandler = (
  config: WhatsAppConfig,
) => boolean | Promise<boolean>;

type TemplateActionHandler = (
  template: WhatsAppTemplate,
) => boolean | Promise<boolean>;

type TemplateMediaUploadHandler = (
  configId: string,
  file: File,
) => Promise<{
  handle: string;
  filename: string;
  mimeType: string;
  size: number;
} | null>;

type Props = {
  configs: WhatsAppConfig[];
  selectedConfigId: string | null;
  templates: WhatsAppTemplate[];
  conversations: WhatsAppConversationList | null;
  selectedConversation: WhatsAppConversation | null;
  users: User[];
  currentUser: User | null;
  canConfigure: boolean;
  canManageAgents: boolean;
  folders: KnowledgeFolder[];
  filters: WhatsAppFilters;
  setFilters: (filters: WhatsAppFilters) => void;
  onCreateConfig: ConfigFormHandler;
  onUpdateConfig: ConfigFormHandler;
  onDeleteConfig: DeleteConfigHandler;
  onSelectConfig: (id: string) => void;
  onSyncTemplates: (id: string) => void;
  onCreateTemplate: ConfigFormHandler;
  onUpdateTemplate: ConfigFormHandler;
  onSubmitTemplate: TemplateActionHandler;
  onDeleteTemplate: TemplateActionHandler;
  onUploadTemplateMedia: TemplateMediaUploadHandler;
  onLoadConversations: () => void;
  onPageChange: (page: number) => void;
  onSelectConversation: (id: string) => void;
  onSendReply: FormHandler;
  onSendTemplate: FormHandler;
  onSendMedia: FormHandler;
  onOpenMedia: (
    message: WhatsAppMessage,
    disposition: "open" | "download",
  ) => void;
  onRetryMessage: (message: WhatsAppMessage) => void;
  onAssign: (agentId: string | null) => void;
  onRequestHandoff: () => void;
  onUpdateStatus: (status: WhatsAppConversation["status"]) => void;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function readKeywords(config?: WhatsAppConfig) {
  const value = config?.settings.handoffKeywords;
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .join(", ")
    : "";
}

function readStringSetting(
  config: WhatsAppConfig | undefined,
  key: string,
  fallback: string,
) {
  const value = config?.settings[key];
  return typeof value === "string" ? value : fallback;
}

function readNumberSetting(
  config: WhatsAppConfig | undefined,
  key: string,
  fallback: number,
) {
  const value = config?.settings[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function readBooleanSetting(
  config: WhatsAppConfig | undefined,
  key: string,
  fallback: boolean,
) {
  const value = config?.settings[key];
  return typeof value === "boolean" ? value : fallback;
}

function readFolderIds(config?: WhatsAppConfig) {
  const value = config?.settings.folderIds;
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function connectionChecks(config: WhatsAppConfig) {
  if (config.provider === "meta") {
    return [
      config.hasAccessToken,
      config.hasWebhookVerifyToken,
      config.hasAppSecret,
      Boolean(config.phoneNumberId),
      Boolean(config.businessAccountId),
    ];
  }
  return [
    config.hasAccessToken,
    Boolean(config.phoneNumberId),
    Boolean(config.businessAccountId),
  ];
}

function remainingSession(expiresAt: string | null | undefined, now: number) {
  if (!expiresAt) return { open: false, label: "Window unavailable" };
  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining <= 0) return { open: false, label: "24h window closed" };
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.max(0, Math.floor((remaining % 3_600_000) / 60_000));
  return { open: true, label: `${hours}h ${minutes}m remaining` };
}

function templateKey(template: WhatsAppTemplate) {
  return `${template.name}:::${template.language}`;
}

export function WhatsAppView(props: Props) {
  const {
    configs,
    selectedConfigId,
    templates,
    conversations,
    selectedConversation,
    users,
    currentUser,
    canConfigure,
    canManageAgents,
    folders,
    filters,
    setFilters,
    onCreateConfig,
    onUpdateConfig,
    onDeleteConfig,
    onSelectConfig,
    onSyncTemplates,
    onCreateTemplate,
    onUpdateTemplate,
    onSubmitTemplate,
    onDeleteTemplate,
    onUploadTemplateMedia,
    onLoadConversations,
    onPageChange,
    onSelectConversation,
    onSendReply,
    onSendTemplate,
    onSendMedia,
    onOpenMedia,
    onRetryMessage,
    onAssign,
    onRequestHandoff,
    onUpdateStatus,
  } = props;
  const [adminPanel, setAdminPanel] = useState<"configuration" | "templates">(
    "configuration",
  );
  const [composer, setComposer] = useState<"text" | "template" | "media">(
    "text",
  );
  const [now, setNow] = useState(() => Date.now());
  const activeConfig =
    configs.find((config) => config.id === selectedConfigId) ?? configs[0];
  const conversationConfigTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          template.configId === selectedConversation?.configId &&
          template.status.toLowerCase() === "approved",
      ),
    [selectedConversation?.configId, templates],
  );
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("");
  const effectiveTemplateKey = conversationConfigTemplates.some(
    (template) => templateKey(template) === selectedTemplateKey,
  )
    ? selectedTemplateKey
    : conversationConfigTemplates[0]
      ? templateKey(conversationConfigTemplates[0])
      : "";
  const selectedTemplate = conversationConfigTemplates.find(
    (template) => templateKey(template) === effectiveTemplateKey,
  );
  const session = remainingSession(selectedConversation?.sessionExpiresAt, now);
  const effectiveComposer =
    !session.open && composer !== "template" ? "template" : composer;
  const totalPages = conversations
    ? Math.max(1, Math.ceil(conversations.total / conversations.limit))
    : 1;
  const assignableUsers = useMemo(() => {
    const candidates = [...users];
    if (currentUser && !candidates.some((item) => item.id === currentUser.id)) {
      candidates.push(currentUser);
    }
    return candidates.filter(
      (candidate) =>
        candidate.orgId === selectedConversation?.organizationId &&
        candidate.isActive !== false &&
        candidate.roles.some(
          (role) => role === "agent" || role === "org_admin",
        ),
    );
  }, [currentUser, selectedConversation?.organizationId, users]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
          <div>
            <h2 className="font-semibold text-[var(--text-strong)]">
              WhatsApp control center
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Provider credentials, webhook security, templates and automation
              settings.
            </p>
          </div>
          <div className="flex rounded-xl bg-[var(--surface-tint)] p-1">
            {(["configuration", "templates"] as const).map((panel) => (
              <button
                key={panel}
                type="button"
                onClick={() => setAdminPanel(panel)}
                className={`rounded-lg px-3 py-2 text-xs font-medium capitalize ${
                  adminPanel === panel
                    ? "bg-[var(--surface-card)] text-[var(--text-strong)] shadow-sm"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {panel}
              </button>
            ))}
          </div>
        </div>
        {adminPanel === "configuration" ? (
          <ConfigurationPanel
            configs={configs}
            activeConfig={activeConfig}
            canConfigure={canConfigure}
            folders={folders}
            onSelectConfig={onSelectConfig}
            onCreateConfig={onCreateConfig}
            onUpdateConfig={onUpdateConfig}
            onDeleteConfig={onDeleteConfig}
          />
        ) : (
          <TemplatePanel
            configs={configs}
            activeConfig={activeConfig}
            templates={templates}
            canConfigure={canConfigure}
            onSelectConfig={onSelectConfig}
            onSyncTemplates={onSyncTemplates}
            onCreateTemplate={onCreateTemplate}
            onUpdateTemplate={onUpdateTemplate}
            onSubmitTemplate={onSubmitTemplate}
            onDeleteTemplate={onDeleteTemplate}
            onUploadTemplateMedia={onUploadTemplateMedia}
          />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <div className="border-b border-[var(--border-subtle)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">WhatsApp inbox</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Auto-refreshes every 10 seconds
                </p>
              </div>
              <button
                type="button"
                onClick={onLoadConversations}
                title="Refresh conversations"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_120px] gap-2">
              <input
                value={filters.search}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    page: 1,
                    search: event.target.value,
                  })
                }
                onKeyDown={(event) =>
                  event.key === "Enter" && onLoadConversations()
                }
                placeholder="Search contact"
                className="input"
              />
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    page: 1,
                    status: event.target.value,
                  })
                }
                className="input"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="waiting_for_agent">Waiting</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <button
              type="button"
              onClick={onLoadConversations}
              className="mt-3 h-9 w-full rounded-xl bg-[var(--surface-tint)] text-sm hover:bg-[var(--surface-hover)]"
            >
              Apply filters
            </button>
          </div>
          <div className="max-h-[680px] overflow-auto">
            {conversations?.data.length ? (
              conversations.data.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`block w-full border-b border-[var(--border-subtle)] p-4 text-left hover:bg-[var(--surface-hover)] ${
                    selectedConversation?.id === conversation.id
                      ? "bg-[var(--surface-accent)]"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {conversation.contactName ??
                        conversation.contactPhone ??
                        conversation.contactWaId}
                    </span>
                    <StatusPill status={conversation.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                    {conversation.messages.at(-1)?.content ??
                      `${conversation.messages.at(-1)?.type ?? "No"} message`}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--text-soft)]">
                    <span>{formatDateTime(conversation.lastMessageAt)}</span>
                    <span className="uppercase">{conversation.locale}</span>
                  </div>
                </button>
              ))
            ) : (
              <EmptyState>No conversations match these filters.</EmptyState>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] p-3 text-xs">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => onPageChange(filters.page - 1)}
              className="rounded-lg border border-[var(--border-strong)] px-3 py-2 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-[var(--text-muted)]">
              Page {filters.page} of {totalPages} · {conversations?.total ?? 0}
            </span>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => onPageChange(filters.page + 1)}
              className="rounded-lg border border-[var(--border-strong)] px-3 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </Card>

        <Card>
          {selectedConversation ? (
            <div className="flex min-h-[680px] flex-col">
              <ConversationHeader
                conversation={selectedConversation}
                session={session}
                users={assignableUsers}
                canManageAgents={canManageAgents}
                onAssign={onAssign}
                onRequestHandoff={onRequestHandoff}
                onUpdateStatus={onUpdateStatus}
              />
              <div className="max-h-[600px] flex-1 space-y-3 overflow-auto bg-[var(--surface-tint)] p-4">
                {selectedConversation.messages.map((message) => (
                  <WhatsAppBubble
                    key={message.id}
                    message={message}
                    onOpenMedia={onOpenMedia}
                    onRetryMessage={onRetryMessage}
                  />
                ))}
              </div>
              <Composer
                mode={effectiveComposer}
                setMode={setComposer}
                sessionOpen={session.open}
                templates={conversationConfigTemplates}
                selectedTemplate={selectedTemplate}
                selectedTemplateKey={effectiveTemplateKey}
                setSelectedTemplateKey={setSelectedTemplateKey}
                onSendReply={onSendReply}
                onSendTemplate={onSendTemplate}
                onSendMedia={onSendMedia}
              />
            </div>
          ) : (
            <EmptyState>
              Select a WhatsApp conversation to view its transcript.
            </EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}

function ConfigurationPanel({
  configs,
  activeConfig,
  canConfigure,
  folders,
  onSelectConfig,
  onCreateConfig,
  onUpdateConfig,
  onDeleteConfig,
}: {
  configs: WhatsAppConfig[];
  activeConfig?: WhatsAppConfig;
  canConfigure: boolean;
  folders: KnowledgeFolder[];
  onSelectConfig: (id: string) => void;
  onCreateConfig: ConfigFormHandler;
  onUpdateConfig: ConfigFormHandler;
  onDeleteConfig: DeleteConfigHandler;
}) {
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppConfig | null>(null);
  const [copiedConfigId, setCopiedConfigId] = useState<string | null>(null);
  const activeCount = configs.filter((config) => config.status === "active").length;
  const securedCount = configs.filter((config) =>
    connectionChecks(config).every(Boolean),
  ).length;

  useEffect(() => {
    if (!dialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dialog]);

  async function copyWebhook(config: WhatsAppConfig) {
    const path = `/api/v1/whatsapp-assistant/webhook/${config.id}`;
    await navigator.clipboard.writeText(path);
    setCopiedConfigId(config.id);
    window.setTimeout(() => setCopiedConfigId(null), 1600);
  }

  function openEdit(config: WhatsAppConfig) {
    onSelectConfig(config.id);
    setDialog("edit");
  }

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[var(--text-strong)]">
            Provider configurations
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Manage phone numbers, webhook security and AI knowledge policies.
          </p>
        </div>
        {canConfigure ? (
          <button
            type="button"
            onClick={() => setDialog("create")}
            className="flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add configuration
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SummaryTile
          icon={<Settings className="h-4 w-4" />}
          label="Total configurations"
          value={String(configs.length)}
        />
        <SummaryTile
          icon={<Check className="h-4 w-4" />}
          label="Active"
          value={String(activeCount)}
        />
        <SummaryTile
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Credentials ready"
          value={`${securedCount}/${configs.length}`}
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
        {configs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="bg-[var(--surface-tint)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Configuration</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Connection</th>
                  <th className="px-4 py-3 font-medium">AI policy</th>
                  <th className="px-4 py-3 font-medium">Webhook</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {configs.map((config) => {
                  const knowledgeScope = readStringSetting(
                    config,
                    "knowledgeScope",
                    "all",
                  );
                  const memoryEnabled = readBooleanSetting(
                    config,
                    "memoryEnabled",
                    true,
                  );
                  const credentialParts = connectionChecks(config);
                  const readyCredentials = credentialParts.filter(Boolean).length;
                  const isSelected = config.id === activeConfig?.id;
                  return (
                    <tr
                      key={config.id}
                      className={`transition-colors hover:bg-[var(--surface-hover)] ${
                        isSelected ? "bg-[var(--surface-accent)]" : ""
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-tint)] text-sm font-semibold uppercase text-[var(--text-strong)]">
                            {config.name.slice(0, 2)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onSelectConfig(config.id)}
                                className="truncate font-medium text-[var(--text-strong)] hover:text-[var(--accent-primary)]"
                              >
                                {config.name}
                              </button>
                              <StatusPill status={config.status} />
                            </div>
                            <p className="mt-1 max-w-[220px] truncate text-xs text-[var(--text-muted)]">
                              {config.phoneNumberId || "No sender configured"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium capitalize">{config.provider}</p>
                        <p className="mt-1 text-xs uppercase text-[var(--text-muted)]">
                          {config.defaultLocale}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              readyCredentials === credentialParts.length
                                ? "bg-[var(--success-text)]"
                                : "bg-[var(--warning-text)]"
                            }`}
                          />
                          <span className="font-medium">
                            {readyCredentials}/{credentialParts.length} ready
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {config.businessAccountId
                            ? `Account ${config.businessAccountId}`
                            : "Account ID not set"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-xs">
                          <Database className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span>
                            {knowledgeScope === "folders"
                              ? `${readFolderIds(config).length} folders`
                              : "All knowledge"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Memory {memoryEnabled ? "enabled" : "disabled"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void copyWebhook(config)}
                          className="inline-flex max-w-[170px] items-center gap-2 rounded-lg border border-[var(--border-strong)] px-2.5 py-2 text-xs hover:bg-[var(--surface-hover)]"
                          title="Copy callback URL"
                        >
                          {copiedConfigId === config.id ? (
                            <Check className="h-3.5 w-3.5 text-[var(--success-text)]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span className="truncate">
                            {copiedConfigId === config.id
                              ? "Copied"
                              : "Copy callback"}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!canConfigure}
                            onClick={() => openEdit(config)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium hover:border-[var(--accent-primary)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            disabled={!canConfigure}
                            onClick={() => setDeleteTarget(config)}
                            aria-label={`Delete ${config.name}`}
                            title="Delete configuration"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] text-[var(--danger-text)] hover:border-[var(--danger-text)] hover:bg-[var(--danger-bg)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-tint)]">
              <Settings className="h-5 w-5 text-[var(--text-muted)]" />
            </span>
            <h4 className="mt-4 font-medium text-[var(--text-strong)]">
              No WhatsApp configuration yet
            </h4>
            <p className="mt-1 max-w-md text-sm text-[var(--text-muted)]">
              Add a Meta or Twilio provider to start receiving customer
              conversations.
            </p>
            {canConfigure ? (
              <button
                type="button"
                onClick={() => setDialog("create")}
                className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)]"
              >
                <Plus className="h-4 w-4" /> Add first configuration
              </button>
            ) : null}
          </div>
        )}
      </div>

      {dialog ? (
        <ConfigDialog
          mode={dialog}
          config={dialog === "edit" ? activeConfig : undefined}
          folders={folders}
          onSubmit={
            dialog === "edit" ? onUpdateConfig : onCreateConfig
          }
          onClose={() => setDialog(null)}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteConfigDialog
          config={deleteTarget}
          onDelete={onDeleteConfig}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-tint)] px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-card)] text-[var(--text-muted)] shadow-sm">
        {icon}
      </span>
      <div>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="mt-0.5 text-lg font-semibold text-[var(--text-strong)]">
          {value}
        </p>
      </div>
    </div>
  );
}

function DeleteConfigDialog({
  config,
  onDelete,
  onClose,
}: {
  config: WhatsAppConfig;
  onDelete: DeleteConfigHandler;
  onClose: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const isInactive = config.status === "inactive";
  const confirmed = isInactive && confirmation.trim() === config.name;

  async function remove() {
    if (!confirmed || deleting) return;
    setDeleting(true);
    const succeeded = await onDelete(config);
    if (succeeded) onClose();
    else setDeleting(false);
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-whatsapp-config-title"
        aria-describedby="delete-whatsapp-config-description"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-2xl"
      >
        <div className="p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--danger-bg)] text-[var(--danger-text)]">
            <Trash2 className="h-5 w-5" />
          </span>
          <h3
            id="delete-whatsapp-config-title"
            className="mt-4 text-lg font-semibold text-[var(--text-strong)]"
          >
            Delete {config.name}?
          </h3>
          <p
            id="delete-whatsapp-config-description"
            className="mt-2 text-sm leading-6 text-[var(--text-muted)]"
          >
            This permanently removes its encrypted credentials and synchronized
            templates. Configurations with conversation history cannot be
            deleted; deactivate them instead.
          </p>
          {!isInactive ? (
            <div className="mt-4 rounded-xl bg-[var(--warning-bg)] p-3 text-sm text-[var(--warning-text)]">
              Deactivate this configuration from Edit before deleting it. This
              prevents an inbound webhook from arriving during deletion.
            </div>
          ) : null}
          <div className="mt-5 rounded-xl bg-[var(--surface-tint)] p-3 text-xs text-[var(--text-muted)]">
            Type <strong className="text-[var(--text-strong)]">{config.name}</strong>{" "}
            to confirm.
          </div>
          <input
            autoFocus
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            onKeyDown={(event) =>
              event.key === "Enter" && confirmed && void remove()
            }
            placeholder={config.name}
            disabled={!isInactive}
            className="input mt-3"
          />
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-tint)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!confirmed || deleting}
            onClick={() => void remove()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--danger-bg)] px-4 text-sm font-medium text-[var(--danger-text)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            {deleting
              ? "Deleting…"
              : isInactive
                ? "Delete configuration"
                : "Deactivate first"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigDialog({
  mode,
  config,
  onSubmit,
  folders,
  onClose,
}: {
  mode: "create" | "edit";
  config?: WhatsAppConfig;
  onSubmit: ConfigFormHandler;
  folders: KnowledgeFolder[];
  onClose: () => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    const succeeded = await onSubmit(event);
    if (succeeded) onClose();
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-config-dialog-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent-primary)]">
              {mode === "create" ? "New provider" : "Provider settings"}
            </p>
            <h3
              id="whatsapp-config-dialog-title"
              className="mt-1 text-lg font-semibold text-[var(--text-strong)]"
            >
              {mode === "create"
                ? "Add WhatsApp configuration"
                : `Edit ${config?.name ?? "configuration"}`}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Credentials remain encrypted and are never displayed after save.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close configuration dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(event) => void submit(event)} className="contents">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {config ? (
              <input type="hidden" name="configId" value={config.id} />
            ) : null}
            <ConfigFields config={config} folders={folders} />
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-tint)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)]"
            >
              Cancel
            </button>
            <button className="h-10 rounded-xl bg-[var(--accent-primary)] px-5 text-sm font-medium text-[var(--text-on-accent)] shadow-sm hover:opacity-90">
              {mode === "create" ? "Create configuration" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfigFields({
  config,
  folders,
}: {
  config?: WhatsAppConfig;
  folders: KnowledgeFolder[];
}) {
  const initialKnowledgeScope = readStringSetting(
    config,
    "knowledgeScope",
    "all",
  );
  const [knowledgeScope, setKnowledgeScope] = useState(initialKnowledgeScope);
  const selectedFolderIds = readFolderIds(config);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input
            name="name"
            className="input"
            required
            defaultValue={config?.name}
          />
        </Field>
        <Field label="Status">
          <select
            name="status"
            className="input"
            defaultValue={config?.status ?? "active"}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </div>
      <Field label="Provider">
        <select
          name="provider"
          className="input"
          defaultValue={config?.provider ?? "meta"}
        >
          <option value="meta">Meta WhatsApp Cloud</option>
          <option value="twilio">Twilio</option>
          {config?.provider === "custom" ? (
            <option value="custom">Custom</option>
          ) : null}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone number ID / sender">
          <input
            name="phoneNumberId"
            className="input"
            defaultValue={config?.phoneNumberId ?? ""}
          />
        </Field>
        <Field label="Business account / account SID">
          <input
            name="businessAccountId"
            className="input"
            defaultValue={config?.businessAccountId ?? ""}
          />
        </Field>
      </div>
      <Field label="Meta App ID (for template media uploads)">
        <input
          name="metaAppId"
          inputMode="numeric"
          pattern="[0-9]*"
          className="input"
          placeholder="123456789012345"
          defaultValue={readStringSetting(config, "metaAppId", "")}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={config ? "New access token (optional)" : "Access token"}>
          <input
            name="accessToken"
            type="password"
            className="input"
            autoComplete="new-password"
          />
        </Field>
        <Field
          label={
            config ? "New verify token (optional)" : "Webhook verify token"
          }
        >
          <input
            name="webhookVerifyToken"
            type="password"
            className="input"
            autoComplete="new-password"
          />
        </Field>
      </div>
      <Field
        label={config ? "New Meta app secret (optional)" : "Meta app secret"}
      >
        <input
          name="appSecret"
          type="password"
          className="input"
          autoComplete="new-password"
        />
      </Field>
      {config ? (
        <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-tint)] p-3 text-xs sm:grid-cols-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="clearAccessToken" /> Clear access token
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="clearWebhookVerifyToken" /> Clear
            verify token
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="clearAppSecret" /> Clear app secret
          </label>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Default locale">
          <input
            name="defaultLocale"
            className="input"
            defaultValue={config?.defaultLocale ?? "en"}
          />
        </Field>
        <Field label="Handoff keywords (comma separated)">
          <input
            name="handoffKeywords"
            className="input"
            placeholder="agent, human, representative"
            defaultValue={readKeywords(config)}
          />
        </Field>
      </div>
      <div className="rounded-xl border border-[var(--border-subtle)] p-4">
        <h4 className="text-sm font-medium text-[var(--text-strong)]">
          Knowledge and conversation memory
        </h4>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Ground answers in approved knowledge, retain recent context and
          escalate when retrieval confidence stays low.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Knowledge scope">
            <select
              name="knowledgeScope"
              className="input"
              value={knowledgeScope}
              onChange={(event) => setKnowledgeScope(event.target.value)}
            >
              <option value="all">All WhatsApp-visible knowledge</option>
              <option value="folders">Selected folders</option>
            </select>
          </Field>
          <Field label="Low-confidence action">
            <select
              name="lowConfidenceAction"
              className="input"
              defaultValue={readStringSetting(
                config,
                "lowConfidenceAction",
                "clarify",
              )}
            >
              <option value="clarify">Clarify, then hand off</option>
              <option value="handoff">Hand off immediately</option>
            </select>
          </Field>
        </div>
        {knowledgeScope === "folders" ? (
          <div className="mt-3 rounded-xl bg-[var(--surface-tint)] p-3">
            <p className="text-xs font-medium">Allowed knowledge folders</p>
            {folders.length ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {folders.map((folder) => (
                  <label
                    key={folder.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      name="folderIds"
                      value={folder.id}
                      defaultChecked={selectedFolderIds.includes(folder.id)}
                    />
                    {folder.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                No knowledge folders are available for this organization.
              </p>
            )}
          </div>
        ) : null}
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="memoryEnabled"
            defaultChecked={readBooleanSetting(config, "memoryEnabled", true)}
          />
          Use recent messages for contextual follow-ups
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Recent message limit (4–20)">
            <input
              name="recentMessageLimit"
              type="number"
              min={4}
              max={20}
              className="input"
              defaultValue={readNumberSetting(config, "recentMessageLimit", 8)}
            />
          </Field>
          <Field label="Clarifications before handoff (1–3)">
            <input
              name="maxClarificationAttempts"
              type="number"
              min={1}
              max={3}
              className="input"
              defaultValue={readNumberSetting(
                config,
                "maxClarificationAttempts",
                2,
              )}
            />
          </Field>
        </div>
      </div>
    </>
  );
}

function TemplatePanel({
  configs,
  activeConfig,
  templates,
  canConfigure,
  onSelectConfig,
  onSyncTemplates,
  onCreateTemplate,
  onUpdateTemplate,
  onSubmitTemplate,
  onDeleteTemplate,
  onUploadTemplateMedia,
}: {
  configs: WhatsAppConfig[];
  activeConfig?: WhatsAppConfig;
  templates: WhatsAppTemplate[];
  canConfigure: boolean;
  onSelectConfig: (id: string) => void;
  onSyncTemplates: (id: string) => void;
  onCreateTemplate: ConfigFormHandler;
  onUpdateTemplate: ConfigFormHandler;
  onSubmitTemplate: TemplateActionHandler;
  onDeleteTemplate: TemplateActionHandler;
  onUploadTemplateMedia: TemplateMediaUploadHandler;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [builder, setBuilder] = useState<
    "create" | WhatsAppTemplate | null
  >(null);
  const [confirmation, setConfirmation] = useState<{
    action: "submit" | "delete";
    template: WhatsAppTemplate;
  } | null>(null);
  const pageSize = 10;
  const currentTemplates = templates.filter(
    (template) => template.configId === activeConfig?.id,
  );
  const filteredTemplates = currentTemplates.filter((template) => {
    const matchesSearch = `${template.name} ${template.language} ${template.category ?? ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesStatus =
      status === "all" || template.status.toLowerCase() === status;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleTemplates = filteredTemplates.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const approvedCount = currentTemplates.filter(
    (template) => template.status.toLowerCase() === "approved",
  ).length;
  const reviewCount = currentTemplates.filter((template) =>
    ["pending", "in_appeal", "paused"].includes(
      template.status.toLowerCase(),
    ),
  ).length;
  const rejectedCount = currentTemplates.filter((template) =>
    ["rejected", "disabled"].includes(template.status.toLowerCase()),
  ).length;

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[var(--text-strong)]">
            Message templates
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Review Meta templates available outside the 24-hour service window.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Configuration
            </span>
            <select
              value={activeConfig?.id ?? ""}
              onChange={(event) => {
                setPage(1);
                onSelectConfig(event.target.value);
              }}
              className="input h-10 min-w-[220px]"
            >
              {!configs.length ? (
                <option value="">No configuration</option>
              ) : null}
              {configs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name} · {config.provider}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={
              !activeConfig || activeConfig.provider !== "meta" || !canConfigure
            }
            onClick={() => setBuilder("create")}
            className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:border-[var(--accent-primary)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> New template
          </button>
          <button
            type="button"
            disabled={
              !activeConfig || activeConfig.provider !== "meta" || !canConfigure
            }
            onClick={() => activeConfig && onSyncTemplates(activeConfig.id)}
            className="flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" /> Sync templates
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <SummaryTile
          icon={<Languages className="h-4 w-4" />}
          label="Total templates"
          value={String(currentTemplates.length)}
        />
        <SummaryTile
          icon={<Check className="h-4 w-4" />}
          label="Approved"
          value={String(approvedCount)}
        />
        <SummaryTile
          icon={<RefreshCw className="h-4 w-4" />}
          label="In review"
          value={String(reviewCount)}
        />
        <SummaryTile
          icon={<X className="h-4 w-4" />}
          label="Unavailable"
          value={String(rejectedCount)}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border border-b-0 border-[var(--border-subtle)] bg-[var(--surface-tint)] p-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search templates, language or category"
            className="input h-10 pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="input h-10 min-w-[150px]"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="in_review">In review</option>
          <option value="rejected">Rejected</option>
          <option value="paused">Paused</option>
          <option value="disabled">Disabled</option>
          <option value="stale">Stale</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-b-2xl border border-[var(--border-subtle)]">
        {visibleTemplates.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-tint)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Template</th>
                  <th className="px-4 py-3 font-medium">Language</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Components</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last synchronized</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {visibleTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className="hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-[var(--text-strong)]">
                        {template.name}
                      </p>
                      <p className="mt-1 max-w-[280px] truncate font-mono text-[11px] text-[var(--text-muted)]">
                        {template.id}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface-tint)] px-2.5 py-1.5 text-xs font-medium uppercase">
                        <Languages className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        {template.language}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {template.category ?? "Uncategorized"}
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
                      {template.components.length} component
                      {template.components.length === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={template.status.toLowerCase()} />
                      {template.rejectionReason ? (
                        <p
                          className="mt-1 max-w-[220px] truncate text-[11px] text-[var(--danger-text)]"
                          title={template.rejectionReason}
                        >
                          {template.rejectionReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
                      {formatDateTime(template.syncedAt)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setBuilder(template)}
                          title={
                            template.status.toLowerCase() === "draft"
                              ? "Edit draft"
                              : "View template"
                          }
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-2.5 text-xs hover:bg-[var(--surface-hover)]"
                        >
                          {template.status.toLowerCase() === "draft" ? (
                            <Pencil className="h-3.5 w-3.5" />
                          ) : (
                            <FileText className="h-3.5 w-3.5" />
                          )}
                          {template.status.toLowerCase() === "draft"
                            ? "Edit"
                            : "View"}
                        </button>
                        {template.status.toLowerCase() === "draft" &&
                        canConfigure ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmation({ action: "submit", template })
                              }
                              title="Submit to Meta"
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-2.5 text-xs font-medium text-[var(--text-on-accent)] hover:opacity-90"
                            >
                              <Send className="h-3.5 w-3.5" /> Submit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmation({ action: "delete", template })
                              }
                              title="Delete draft"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-tint)] px-4 py-3 text-xs text-[var(--text-muted)]">
              <span>
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filteredTemplates.length)} of{" "}
                {filteredTemplates.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-2 text-[var(--text-base)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-2 text-[var(--text-base)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-tint)]">
              <Languages className="h-5 w-5 text-[var(--text-muted)]" />
            </span>
            <h4 className="mt-4 font-medium text-[var(--text-strong)]">
              {currentTemplates.length
                ? "No templates match these filters"
                : "No synchronized templates"}
            </h4>
            <p className="mt-1 max-w-md text-sm text-[var(--text-muted)]">
              {currentTemplates.length
                ? "Try another search term or status."
                : activeConfig?.provider === "meta"
                  ? "Sync this configuration to import templates from Meta."
                  : "Template synchronization is available for Meta configurations."}
            </p>
          </div>
        )}
      </div>
      {builder && activeConfig ? (
        <TemplateBuilderDialog
          config={activeConfig}
          template={builder === "create" ? undefined : builder}
          readOnly={
            builder !== "create" && builder.status.toLowerCase() !== "draft"
          }
          onSubmit={
            builder === "create" ? onCreateTemplate : onUpdateTemplate
          }
          onUploadMedia={onUploadTemplateMedia}
          onClose={() => setBuilder(null)}
        />
      ) : null}
      {confirmation ? (
        <TemplateActionDialog
          action={confirmation.action}
          template={confirmation.template}
          onConfirm={
            confirmation.action === "submit"
              ? onSubmitTemplate
              : onDeleteTemplate
          }
          onClose={() => setConfirmation(null)}
        />
      ) : null}
    </div>
  );
}

type TemplateButtonDraft = {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "FLOW" | "MPM";
  text: string;
  value: string;
  example: string;
  flowId: string;
  navigateScreen: string;
  flowAction: "navigate" | "data_exchange";
};

function componentRecord(template: WhatsAppTemplate | undefined, type: string) {
  const component = template?.components.find(
    (item) =>
      item !== null &&
      !Array.isArray(item) &&
      typeof item === "object" &&
      String((item as Record<string, unknown>).type).toUpperCase() === type,
  );
  return component && !Array.isArray(component) && typeof component === "object"
    ? (component as Record<string, unknown>)
    : undefined;
}

function componentText(template: WhatsAppTemplate | undefined, type: string) {
  const text = componentRecord(template, type)?.text;
  return typeof text === "string" ? text : "";
}

function componentExamples(
  template: WhatsAppTemplate | undefined,
  type: "HEADER" | "BODY",
) {
  const example = componentRecord(template, type)?.example;
  if (!example || Array.isArray(example) || typeof example !== "object") return "";
  const record = example as Record<string, unknown>;
  const values =
    type === "BODY" &&
    Array.isArray(record.body_text) &&
    Array.isArray(record.body_text[0])
      ? record.body_text[0]
      : type === "HEADER" && Array.isArray(record.header_text)
        ? record.header_text
        : [];
  return values.filter((value): value is string => typeof value === "string").join("\n");
}

function componentButtons(template?: WhatsAppTemplate): TemplateButtonDraft[] {
  const raw = componentRecord(template, "BUTTONS")?.buttons;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") return [];
    const button = item as Record<string, unknown>;
    const type = String(button.type).toUpperCase();
    if (
      type !== "QUICK_REPLY" &&
      type !== "URL" &&
      type !== "PHONE_NUMBER" &&
      type !== "FLOW" &&
      type !== "MPM"
    ) {
      return [];
    }
    const example = Array.isArray(button.example)
      ? button.example.find((value): value is string => typeof value === "string")
      : "";
    return [
      {
        type,
        text: typeof button.text === "string" ? button.text : "",
        value:
          type === "URL" && typeof button.url === "string"
            ? button.url
            : type === "PHONE_NUMBER" && typeof button.phone_number === "string"
              ? button.phone_number
              : "",
        example: example ?? "",
        flowId: type === "FLOW" && typeof button.flow_id === "string" ? button.flow_id : "",
        navigateScreen:
          type === "FLOW" && typeof button.navigate_screen === "string"
            ? button.navigate_screen
            : "",
        flowAction:
          type === "FLOW" && button.flow_action === "data_exchange"
            ? "data_exchange"
            : "navigate",
      } as TemplateButtonDraft,
    ];
  });
}

function componentHeaderFormat(template?: WhatsAppTemplate) {
  const header = componentRecord(template, "HEADER");
  return header && typeof header.format === "string"
    ? header.format.toUpperCase()
    : "NONE";
}

function componentHeaderHandle(template?: WhatsAppTemplate) {
  const example = componentRecord(template, "HEADER")?.example;
  if (!example || Array.isArray(example) || typeof example !== "object") return "";
  const handles = (example as Record<string, unknown>).header_handle;
  return Array.isArray(handles) && typeof handles[0] === "string" ? handles[0] : "";
}

function authenticationSettings(template?: WhatsAppTemplate) {
  const body = componentRecord(template, "BODY");
  const footer = componentRecord(template, "FOOTER");
  const rawButtons = componentRecord(template, "BUTTONS")?.buttons;
  const button =
    Array.isArray(rawButtons) && rawButtons[0] && typeof rawButtons[0] === "object"
      ? (rawButtons[0] as Record<string, unknown>)
      : {};
  return {
    addSecurityRecommendation: body?.add_security_recommendation !== false,
    expirationMinutes:
      typeof footer?.code_expiration_minutes === "number"
        ? footer.code_expiration_minutes
        : 10,
    otpType: button.otp_type === "ONE_TAP" ? "ONE_TAP" : "COPY_CODE",
    buttonText: typeof button.text === "string" ? button.text : "Copy code",
    autofillText:
      typeof button.autofill_text === "string" ? button.autofill_text : "Autofill",
    packageName: typeof button.package_name === "string" ? button.package_name : "",
    signatureHash:
      typeof button.signature_hash === "string" ? button.signature_hash : "",
  } as const;
}

function previewText(text: string, examples: string) {
  const values = examples.split("\n").map((value) => value.trim());
  return text.replace(/\{\{(\d+)\}\}/g, (_, index: string) => {
    return values[Number(index) - 1] || `{{${index}}}`;
  });
}

function templateVariableNumbers(text: string) {
  return [
    ...new Set(
      [...text.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1])),
    ),
  ].sort((left, right) => left - right);
}

function hasValidTemplateVariables(text: string, maximum?: number) {
  const numbers = templateVariableNumbers(text);
  const stripped = text.replace(/\{\{\d+\}\}/g, "");
  return (
    !stripped.includes("{{") &&
    !stripped.includes("}}") &&
    numbers.every((number, index) => number === index + 1) &&
    (maximum === undefined || numbers.length <= maximum)
  );
}

function TemplateBuilderDialog({
  config,
  template,
  readOnly,
  onSubmit,
  onUploadMedia,
  onClose,
}: {
  config: WhatsAppConfig;
  template?: WhatsAppTemplate;
  readOnly: boolean;
  onSubmit: ConfigFormHandler;
  onUploadMedia: TemplateMediaUploadHandler;
  onClose: () => void;
}) {
  const initialAuthentication = authenticationSettings(template);
  const [name, setName] = useState(template?.name ?? "");
  const [language, setLanguage] = useState(
    template?.language ?? config.defaultLocale ?? "en_US",
  );
  const [category, setCategory] = useState(
    template?.category ?? "UTILITY",
  );
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [headerFormat, setHeaderFormat] = useState(() =>
    componentHeaderFormat(template),
  );
  const [headerMediaHandle, setHeaderMediaHandle] = useState(() =>
    componentHeaderHandle(template),
  );
  const [headerMediaName, setHeaderMediaName] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [header, setHeader] = useState(() => componentText(template, "HEADER"));
  const [headerExamples, setHeaderExamples] = useState(() =>
    componentExamples(template, "HEADER"),
  );
  const [body, setBody] = useState(() => componentText(template, "BODY"));
  const [bodyExamples, setBodyExamples] = useState(() =>
    componentExamples(template, "BODY"),
  );
  const [footer, setFooter] = useState(() => componentText(template, "FOOTER"));
  const [buttons, setButtons] = useState<TemplateButtonDraft[]>(() =>
    componentButtons(template),
  );
  const [addSecurityRecommendation, setAddSecurityRecommendation] = useState(
    initialAuthentication.addSecurityRecommendation,
  );
  const [expirationMinutes, setExpirationMinutes] = useState(
    initialAuthentication.expirationMinutes,
  );
  const [otpType, setOtpType] = useState<"COPY_CODE" | "ONE_TAP">(
    initialAuthentication.otpType,
  );
  const [otpButtonText, setOtpButtonText] = useState(
    initialAuthentication.buttonText,
  );
  const [otpAutofillText, setOtpAutofillText] = useState(
    initialAuthentication.autofillText,
  );
  const [otpPackageName, setOtpPackageName] = useState(
    initialAuthentication.packageName,
  );
  const [otpSignatureHash, setOtpSignatureHash] = useState(
    initialAuthentication.signatureHash,
  );
  const headerRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const headerVariables = templateVariableNumbers(header);
  const bodyVariables = templateVariableNumbers(body);
  const headerExampleValues = headerExamples.split("\n");
  const bodyExampleValues = bodyExamples.split("\n");
  const isAuthentication = category === "AUTHENTICATION";
  const headerValid =
    headerFormat === "NONE" ||
    headerFormat === "LOCATION" ||
    (headerFormat === "TEXT" &&
      Boolean(header.trim()) &&
      hasValidTemplateVariables(header, 1) &&
      headerVariables.every((_, index) =>
        Boolean(headerExampleValues[index]?.trim()),
      )) ||
    (["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat) &&
      Boolean(headerMediaHandle.trim()));
  const buttonValid = (button: TemplateButtonDraft) => {
    if (!button.text.trim()) return false;
    if (button.type === "QUICK_REPLY" || button.type === "MPM") return true;
    if (button.type === "PHONE_NUMBER") {
      return /^\+[1-9]\d{7,14}$/.test(button.value);
    }
    if (button.type === "FLOW") return /^\d+$/.test(button.flowId);
    if (!button.value.startsWith("https://")) return false;
    const variables = templateVariableNumbers(button.value);
    return (
      hasValidTemplateVariables(button.value, 1) &&
      (variables.length === 0 ||
        (variables.length === 1 && Boolean(button.example.trim())))
    );
  };
  const authenticationValid =
    Number.isInteger(expirationMinutes) &&
    expirationMinutes >= 1 &&
    expirationMinutes <= 90 &&
    Boolean(otpButtonText.trim()) &&
    otpButtonText.trim().length <= 25 &&
    (otpType === "COPY_CODE" ||
      (Boolean(otpAutofillText.trim()) &&
        /^[A-Za-z][A-Za-z0-9_.]*$/.test(otpPackageName) &&
        Boolean(otpSignatureHash.trim())));
  const builderValid =
    /^[a-z][a-z0-9_]{0,511}$/.test(name) &&
    /^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language) &&
    (isAuthentication
      ? authenticationValid
      : Boolean(body.trim()) &&
        body.length <= 1024 &&
        !/\{\{|\}\}/.test(footer) &&
        headerValid &&
        hasValidTemplateVariables(body) &&
        bodyVariables.every((_, index) =>
          Boolean(bodyExampleValues[index]?.trim()),
        ) &&
        buttons.length <= 3 &&
        buttons.filter((button) => button.type === "PHONE_NUMBER").length <= 1 &&
        buttons.filter((button) => button.type === "FLOW").length <= 1 &&
        buttons.every(buttonValid));
  const previewHeader =
    !isAuthentication && headerFormat === "TEXT"
      ? previewText(header, headerExamples)
      : "";
  const previewBody = isAuthentication
    ? `${addSecurityRecommendation ? "For your security, do not share this code.\n\n" : ""}{{1}} is your verification code.`
    : previewText(body, bodyExamples);
  const previewFooter = isAuthentication
    ? `This code expires in ${expirationMinutes} minutes.`
    : footer;
  const previewButtons: TemplateButtonDraft[] = isAuthentication
    ? [
        {
          type: "QUICK_REPLY",
          text: otpButtonText,
          value: "",
          example: "",
          flowId: "",
          navigateScreen: "",
          flowAction: "navigate",
        },
      ]
    : buttons;

  async function submit(event: FormEvent<HTMLFormElement>) {
    const succeeded = await onSubmit(event);
    if (succeeded) onClose();
  }

  function updateButton(index: number, patch: Partial<TemplateButtonDraft>) {
    setButtons((current) =>
      current.map((button, buttonIndex) =>
        buttonIndex === index ? { ...button, ...patch } : button,
      ),
    );
  }

  async function uploadHeaderMedia(file?: File) {
    if (!file || uploadingMedia) return;
    setUploadingMedia(true);
    const uploaded = await onUploadMedia(config.id, file);
    setUploadingMedia(false);
    if (!uploaded) return;
    setHeaderMediaHandle(uploaded.handle);
    setHeaderMediaName(uploaded.filename);
  }

  function updateExample(
    values: string[],
    index: number,
    value: string,
    setter: (next: string) => void,
  ) {
    const next = [...values];
    next[index] = value;
    setter(next.join("\n"));
  }

  function insertVariable(target: "header" | "body") {
    const isHeader = target === "header";
    const current = isHeader ? header : body;
    const variables = templateVariableNumbers(current);
    if (isHeader && variables.length >= 1) return;
    const control = isHeader ? headerRef.current : bodyRef.current;
    const start = control?.selectionStart ?? current.length;
    const end = control?.selectionEnd ?? current.length;
    const space = start > 0 && !/\s$/.test(current.slice(0, start)) ? " " : "";
    const next = `${current.slice(0, start)}${space}{{${variables.length + 1}}}${current.slice(end)}`;
    if (isHeader) setHeader(next);
    else setBody(next);
    window.setTimeout(() => control?.focus(), 0);
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-template-builder-title"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent-primary)]">
              {readOnly ? "Meta template" : template ? "Edit draft" : "New draft"}
            </p>
            <h3
              id="whatsapp-template-builder-title"
              className="mt-1 text-lg font-semibold text-[var(--text-strong)]"
            >
              {name || "Create WhatsApp template"}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {readOnly
                ? "Submitted templates are read-only. Meta controls their approved definition."
                : "Build the message visually, add realistic variable examples, then save it as a private draft."}
            </p>
            {!readOnly ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                <span className="rounded-full bg-[var(--surface-tint)] px-2.5 py-1">1 · Setup</span>
                <ChevronRight className="h-3 w-3" />
                <span className="rounded-full bg-[var(--surface-tint)] px-2.5 py-1">2 · Content</span>
                <ChevronRight className="h-3 w-3" />
                <span className="rounded-full bg-[var(--surface-tint)] px-2.5 py-1">3 · Actions</span>
                <ChevronRight className="h-3 w-3" />
                <span className="rounded-full bg-[var(--surface-accent)] px-2.5 py-1 text-[var(--accent-primary)]">Save draft</span>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMobilePreview(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium hover:bg-[var(--surface-hover)] lg:hidden"
            >
              <MessageSquareText className="h-4 w-4" /> Preview
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close template builder"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={(event) => void submit(event)} className="contents">
          <input type="hidden" name="configId" value={config.id} />
          {template ? (
            <input type="hidden" name="templateId" value={template.id} />
          ) : null}
          <input type="hidden" name="buttons" value={JSON.stringify(buttons)} />
          <input type="hidden" name="headerExamples" value={headerExamples} />
          <input type="hidden" name="bodyExamples" value={bodyExamples} />
          <div className="grid flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Template name">
                  <input
                    name="name"
                    required
                    pattern="[a-z][a-z0-9_]*"
                    maxLength={512}
                    disabled={readOnly}
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "_")
                          .replace(/[^a-z0-9_]/g, ""),
                      )
                    }
                    placeholder="appointment_reminder"
                    className="input"
                  />
                  <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                    Permanent after Meta submission.
                  </p>
                </Field>
                <Field label="Language">
                  <select
                    name="language"
                    required
                    disabled={readOnly}
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="input"
                  >
                    {![
                      "en_US",
                      "en_GB",
                      "hi",
                      "es",
                      "fr",
                      "de",
                      "ar",
                      "pt_BR",
                    ].includes(language) ? (
                      <option value={language}>{language}</option>
                    ) : null}
                    <option value="en_US">English (US)</option>
                    <option value="en_GB">English (UK)</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ar">Arabic</option>
                    <option value="pt_BR">Portuguese (Brazil)</option>
                  </select>
                </Field>
                <Field label="Category">
                  <select
                    name="category"
                    disabled={readOnly}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="input"
                  >
                    <option value="UTILITY">Utility</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </Field>
              </div>

              <div className="grid gap-2 rounded-2xl bg-[var(--surface-tint)] p-3 text-xs sm:grid-cols-3">
                {[
                  ["UTILITY", "Transactional updates"],
                  ["MARKETING", "Offers and re-engagement"],
                  ["AUTHENTICATION", "Codes and verification"],
                ].map(([value, description]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setCategory(value)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      category === value
                        ? "border-[var(--accent-primary)] bg-[var(--surface-card)] text-[var(--text-strong)] shadow-sm"
                        : "border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-card)]"
                    }`}
                  >
                    <span className="block font-medium capitalize">
                      {value.toLowerCase()}
                    </span>
                    <span className="mt-0.5 block text-[10px]">
                      {description}
                    </span>
                  </button>
                ))}
              </div>

              {isAuthentication ? (
                <AuthenticationTemplateFields
                  readOnly={readOnly}
                  addSecurityRecommendation={addSecurityRecommendation}
                  setAddSecurityRecommendation={setAddSecurityRecommendation}
                  expirationMinutes={expirationMinutes}
                  setExpirationMinutes={setExpirationMinutes}
                  otpType={otpType}
                  setOtpType={setOtpType}
                  otpButtonText={otpButtonText}
                  setOtpButtonText={setOtpButtonText}
                  otpAutofillText={otpAutofillText}
                  setOtpAutofillText={setOtpAutofillText}
                  otpPackageName={otpPackageName}
                  setOtpPackageName={setOtpPackageName}
                  otpSignatureHash={otpSignatureHash}
                  setOtpSignatureHash={setOtpSignatureHash}
                />
              ) : (
                <>
                  <div className="rounded-xl border border-[var(--border-subtle)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-strong)]">
                          Header <span className="font-normal text-[var(--text-muted)]">· optional</span>
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Choose one Meta-supported header format.
                        </p>
                      </div>
                      <select
                        name="headerFormat"
                        disabled={readOnly}
                        value={headerFormat}
                        onChange={(event) => {
                          if (event.target.value !== headerFormat) {
                            setHeaderMediaHandle("");
                            setHeaderMediaName("");
                          }
                          setHeaderFormat(event.target.value);
                        }}
                        className="input w-auto min-w-36"
                      >
                        <option value="NONE">No header</option>
                        <option value="TEXT">Text</option>
                        <option value="IMAGE">Image</option>
                        <option value="VIDEO">Video</option>
                        <option value="DOCUMENT">Document</option>
                        <option value="LOCATION">Location</option>
                      </select>
                    </div>
                    {headerFormat === "TEXT" ? (
                      <>
                        <div className="mt-3 flex gap-2">
                          <input
                            ref={headerRef}
                            name="headerText"
                            maxLength={60}
                            disabled={readOnly}
                            value={header}
                            onChange={(event) => setHeader(event.target.value)}
                            placeholder="Appointment reminder"
                            className="input"
                          />
                          {!readOnly ? (
                            <button
                              type="button"
                              disabled={headerVariables.length >= 1}
                              onClick={() => insertVariable("header")}
                              className="shrink-0 rounded-lg border border-[var(--border-strong)] px-3 text-xs font-medium disabled:opacity-40"
                            >
                              + Variable
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>At most one sequential variable.</span>
                          <span>{header.length}/60</span>
                        </div>
                        {headerVariables.length ? (
                          <TemplateVariableExamples
                            label="Header example"
                            variables={headerVariables}
                            values={headerExampleValues}
                            readOnly={readOnly}
                            onChange={(index, value) =>
                              updateExample(
                                headerExampleValues,
                                index,
                                value,
                                setHeaderExamples,
                              )
                            }
                          />
                        ) : null}
                      </>
                    ) : ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat) ? (
                      <div className="mt-3 rounded-xl bg-[var(--surface-tint)] p-3">
                        <input
                          type="hidden"
                          name="headerMediaHandle"
                          value={headerMediaHandle}
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          {!readOnly ? (
                            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 text-xs font-medium">
                              <Paperclip className="h-4 w-4" />
                              {uploadingMedia ? "Uploading…" : "Upload sample"}
                              <input
                                type="file"
                                className="sr-only"
                                disabled={uploadingMedia}
                                accept={
                                  headerFormat === "IMAGE"
                                    ? "image/jpeg,image/png"
                                    : headerFormat === "VIDEO"
                                      ? "video/mp4"
                                      : "application/pdf"
                                }
                                onChange={(event) =>
                                  void uploadHeaderMedia(event.target.files?.[0])
                                }
                              />
                            </label>
                          ) : null}
                          <div className="min-w-0 text-xs">
                            <p className="truncate font-medium text-[var(--text-strong)]">
                              {headerMediaName ||
                                (headerMediaHandle ? "Meta sample attached" : "No sample uploaded")}
                            </p>
                            <p className="mt-0.5 text-[var(--text-muted)]">
                              JPEG/PNG, MP4, or PDF up to 16 MB. Requires Meta App ID.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : headerFormat === "LOCATION" ? (
                      <p className="mt-3 rounded-xl bg-[var(--surface-tint)] p-3 text-xs text-[var(--text-muted)]">
                        The sender supplies the location parameter when this approved template is sent.
                      </p>
                    ) : null}
                  </div>

              <div className="rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-strong)]">
                      Message body <span className="text-[var(--danger-text)]">*</span>
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      The main message customers will receive.
                    </p>
                  </div>
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => insertVariable("body")}
                      className="rounded-lg border border-[var(--border-strong)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--surface-hover)]"
                    >
                      + Variable
                    </button>
                  ) : null}
                </div>
                <textarea
                  ref={bodyRef}
                  name="bodyText"
                  required
                  maxLength={1024}
                  disabled={readOnly}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Hi {{1}}, your appointment is confirmed for {{2}}."
                  rows={6}
                  className="input mt-3 resize-y"
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span
                    className={
                      hasValidTemplateVariables(body)
                        ? "text-[var(--text-muted)]"
                        : "text-[var(--danger-text)]"
                    }
                  >
                    {hasValidTemplateVariables(body)
                      ? `${bodyVariables.length} variable${bodyVariables.length === 1 ? "" : "s"}`
                      : "Variables must be sequential: {{1}}, {{2}}…"}
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {body.length}/1,024
                  </span>
                </div>
                {bodyVariables.length ? (
                  <TemplateVariableExamples
                    label="Body examples"
                    variables={bodyVariables}
                    values={bodyExampleValues}
                    readOnly={readOnly}
                    onChange={(index, value) =>
                      updateExample(
                        bodyExampleValues,
                        index,
                        value,
                        setBodyExamples,
                      )
                    }
                  />
                ) : null}
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] p-4">
                <p className="text-sm font-medium text-[var(--text-strong)]">Footer</p>
                <input
                  name="footerText"
                  maxLength={60}
                  disabled={readOnly}
                  value={footer}
                  onChange={(event) => setFooter(event.target.value)}
                  placeholder="Reply STOP to opt out"
                  className="input mt-3"
                />
                <p className="mt-1.5 text-right text-[11px] text-[var(--text-muted)]">
                  {footer.length}/60
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-strong)]">Buttons</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Optional; add up to three actions.</p>
                  </div>
                  <span className="rounded-full bg-[var(--surface-tint)] px-2.5 py-1 text-[11px] text-[var(--text-muted)]">
                    {buttons.length}/3 added
                  </span>
                </div>
                {!readOnly ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {[
                      {
                        type: "QUICK_REPLY" as const,
                        label: "Quick reply",
                        Icon: MessageSquareText,
                      },
                      {
                        type: "URL" as const,
                        label: "Website",
                        Icon: ExternalLink,
                      },
                      {
                        type: "PHONE_NUMBER" as const,
                        label: "Phone call",
                        Icon: Phone,
                      },
                      {
                        type: "FLOW" as const,
                        label: "WhatsApp Flow",
                        Icon: ExternalLink,
                      },
                      {
                        type: "MPM" as const,
                        label: "Product catalog",
                        Icon: Database,
                      },
                    ]
                      .filter(
                        (item) =>
                          item.type !== "MPM" || category === "MARKETING",
                      )
                      .map(({ type, label, Icon }) => (
                      <button
                        key={String(type)}
                        type="button"
                        disabled={buttons.length >= 3}
                        onClick={() =>
                          setButtons((current) => [
                            ...current,
                            {
                              type,
                              text: "",
                              value: "",
                              example: "",
                              flowId: "",
                              navigateScreen: "",
                              flowAction: "navigate",
                            },
                          ])
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] text-xs font-medium hover:border-[var(--accent-primary)] hover:bg-[var(--surface-accent)] disabled:opacity-40"
                      >
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 space-y-2">
                  {buttons.map((button, index) => (
                    <div key={index} className="grid gap-2 rounded-xl bg-[var(--surface-tint)] p-3 sm:grid-cols-[150px_1fr_1fr_auto]">
                      <select
                        disabled={readOnly}
                        value={button.type}
                        onChange={(event) =>
                          updateButton(index, {
                            type: event.target.value as TemplateButtonDraft["type"],
                            value: "",
                            example: "",
                            flowId: "",
                            navigateScreen: "",
                          })
                        }
                        className="input"
                      >
                        <option value="QUICK_REPLY">Quick reply</option>
                        <option value="URL">Website</option>
                        <option value="PHONE_NUMBER">Phone number</option>
                        <option value="FLOW">WhatsApp Flow</option>
                        <option value="MPM">Product catalog</option>
                      </select>
                      <input
                        required
                        disabled={readOnly}
                        value={button.text}
                        maxLength={25}
                        onChange={(event) => updateButton(index, { text: event.target.value })}
                        placeholder="Button label"
                        className="input"
                      />
                      {button.type === "URL" || button.type === "PHONE_NUMBER" ? (
                        <input
                          required
                          disabled={readOnly}
                          pattern={
                            button.type === "URL"
                              ? "https://.*"
                              : "\\+[1-9][0-9]{7,14}"
                          }
                          value={button.value}
                          onChange={(event) => updateButton(index, { value: event.target.value })}
                          placeholder={button.type === "URL" ? "https://example.com" : "+15551234567"}
                          className="input"
                        />
                      ) : button.type === "FLOW" ? (
                        <input
                          required
                          disabled={readOnly}
                          inputMode="numeric"
                          pattern="[0-9]+"
                          value={button.flowId}
                          onChange={(event) =>
                            updateButton(index, { flowId: event.target.value })
                          }
                          placeholder="Meta Flow ID"
                          className="input"
                        />
                      ) : (
                        <span />
                      )}
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => setButtons((current) => current.filter((_, buttonIndex) => buttonIndex !== index))}
                          aria-label="Remove button"
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                      {button.type === "URL" && /\{\{1\}\}/.test(button.value) ? (
                        <div className="sm:col-span-4 sm:col-start-2">
                          <input
                            required
                            disabled={readOnly}
                            value={button.example}
                            onChange={(event) =>
                              updateButton(index, { example: event.target.value })
                            }
                            placeholder="Example replacement for {{1}}, e.g. summer2026"
                            className="input"
                          />
                          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                            Meta uses this example only while reviewing the dynamic URL.
                          </p>
                        </div>
                      ) : null}
                      {button.type === "FLOW" ? (
                        <div className="grid gap-2 sm:col-span-4 sm:grid-cols-2 sm:pl-[158px]">
                          <input
                            disabled={readOnly}
                            value={button.navigateScreen}
                            onChange={(event) =>
                              updateButton(index, { navigateScreen: event.target.value })
                            }
                            placeholder="Start screen ID (optional)"
                            className="input"
                          />
                          <select
                            disabled={readOnly}
                            value={button.flowAction}
                            onChange={(event) =>
                              updateButton(index, {
                                flowAction: event.target.value as "navigate" | "data_exchange",
                              })
                            }
                            className="input"
                          >
                            <option value="navigate">Navigate</option>
                            <option value="data_exchange">Data exchange</option>
                          </select>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {!buttons.length ? (
                    <p className="rounded-xl bg-[var(--surface-tint)] p-3 text-xs text-[var(--text-muted)]">No interactive buttons.</p>
                  ) : null}
                </div>
              </div>
                </>
              )}
            </div>

            <div className="border-t border-[var(--border-subtle)] bg-[#efeae2] p-6 lg:border-l lg:border-t-0">
              <div className="sticky top-0">
                <WhatsAppTemplatePreview
                  businessName={config.name}
                  header={previewHeader}
                  headerFormat={isAuthentication ? "NONE" : headerFormat}
                  headerMediaName={headerMediaName}
                  body={previewBody}
                  footer={previewFooter}
                  buttons={previewButtons}
                  category={category}
                  language={language}
                />
              </div>
              {template?.rejectionReason ? (
                <div className="mt-4 rounded-xl bg-[var(--danger-bg)] p-3 text-xs leading-5 text-[var(--danger-text)]">
                  <strong>Meta rejection reason:</strong> {template.rejectionReason}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-tint)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)]"
            >
              {readOnly ? "Close" : "Cancel"}
            </button>
            {!readOnly ? (
              <button
                disabled={!builderValid}
                className="h-10 rounded-xl bg-[var(--accent-primary)] px-5 text-sm font-medium text-[var(--text-on-accent)] shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {template ? "Save draft" : "Create draft"}
              </button>
            ) : null}
          </div>
        </form>
        {showMobilePreview ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm lg:hidden">
            <div className="max-h-[94vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-[#efeae2] p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#111b21]">
                  Customer preview
                </p>
                <button
                  type="button"
                  onClick={() => setShowMobilePreview(false)}
                  aria-label="Close preview"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#111b21] shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <WhatsAppTemplatePreview
                businessName={config.name}
                header={previewHeader}
                headerFormat={isAuthentication ? "NONE" : headerFormat}
                headerMediaName={headerMediaName}
                body={previewBody}
                footer={previewFooter}
                buttons={previewButtons}
                category={category}
                language={language}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AuthenticationTemplateFields({
  readOnly,
  addSecurityRecommendation,
  setAddSecurityRecommendation,
  expirationMinutes,
  setExpirationMinutes,
  otpType,
  setOtpType,
  otpButtonText,
  setOtpButtonText,
  otpAutofillText,
  setOtpAutofillText,
  otpPackageName,
  setOtpPackageName,
  otpSignatureHash,
  setOtpSignatureHash,
}: {
  readOnly: boolean;
  addSecurityRecommendation: boolean;
  setAddSecurityRecommendation: (value: boolean) => void;
  expirationMinutes: number;
  setExpirationMinutes: (value: number) => void;
  otpType: "COPY_CODE" | "ONE_TAP";
  setOtpType: (value: "COPY_CODE" | "ONE_TAP") => void;
  otpButtonText: string;
  setOtpButtonText: (value: string) => void;
  otpAutofillText: string;
  setOtpAutofillText: (value: string) => void;
  otpPackageName: string;
  setOtpPackageName: (value: string) => void;
  otpSignatureHash: string;
  setOtpSignatureHash: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-accent)] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--text-strong)]">
              Meta authentication template
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Meta supplies the localized OTP body. Custom marketing text,
              headers, footers, and non-OTP buttons are intentionally disabled.
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-[var(--border-subtle)] p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="addSecurityRecommendation"
            checked={addSecurityRecommendation}
            disabled={readOnly}
            onChange={(event) =>
              setAddSecurityRecommendation(event.target.checked)
            }
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-[var(--text-strong)]">
              Add Meta security recommendation
            </span>
            <span className="mt-1 block text-xs text-[var(--text-muted)]">
              Reminds customers not to share their verification code.
            </span>
          </span>
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Code expires after">
            <div className="relative">
              <input
                name="codeExpirationMinutes"
                type="number"
                min={1}
                max={90}
                required
                disabled={readOnly}
                value={expirationMinutes}
                onChange={(event) =>
                  setExpirationMinutes(Number(event.target.value))
                }
                className="input pr-20"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                minutes
              </span>
            </div>
          </Field>
          <Field label="OTP action">
            <select
              name="otpType"
              disabled={readOnly}
              value={otpType}
              onChange={(event) =>
                setOtpType(event.target.value as "COPY_CODE" | "ONE_TAP")
              }
              className="input"
            >
              <option value="COPY_CODE">Copy code</option>
              <option value="ONE_TAP">Android one-tap autofill</option>
            </select>
          </Field>
          <Field label="Button label">
            <input
              name="otpButtonText"
              maxLength={25}
              required
              disabled={readOnly}
              value={otpButtonText}
              onChange={(event) => setOtpButtonText(event.target.value)}
              className="input"
            />
          </Field>
          {otpType === "ONE_TAP" ? (
            <Field label="Autofill label">
              <input
                name="otpAutofillText"
                maxLength={25}
                required
                disabled={readOnly}
                value={otpAutofillText}
                onChange={(event) => setOtpAutofillText(event.target.value)}
                className="input"
              />
            </Field>
          ) : null}
        </div>
        {otpType === "ONE_TAP" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Android package name">
              <input
                name="otpPackageName"
                required
                disabled={readOnly}
                value={otpPackageName}
                onChange={(event) => setOtpPackageName(event.target.value)}
                placeholder="com.example.app"
                className="input"
              />
            </Field>
            <Field label="App signature hash">
              <input
                name="otpSignatureHash"
                required
                disabled={readOnly}
                value={otpSignatureHash}
                onChange={(event) => setOtpSignatureHash(event.target.value)}
                placeholder="K8a%2FAINcGX7"
                className="input"
              />
            </Field>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TemplateVariableExamples({
  label,
  variables,
  values,
  readOnly,
  onChange,
}: {
  label: string;
  variables: number[];
  values: string[];
  readOnly: boolean;
  onChange: (index: number, value: string) => void;
}) {
  return (
    <div className="mt-4 rounded-xl bg-[var(--surface-tint)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--text-strong)]">
          {label}
        </p>
        <span className="text-[10px] text-[var(--text-muted)]">
          Required by Meta
        </span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {variables.map((variable, index) => (
          <label key={variable} className="block">
            <span className="mb-1 block text-[11px] text-[var(--text-muted)]">
              Value for {`{{${variable}}}`}
            </span>
            <input
              required
              value={values[index] ?? ""}
              onChange={(event) => onChange(index, event.target.value)}
              disabled={readOnly}
              placeholder="Realistic sample value"
              className="input"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function WhatsAppTemplatePreview({
  businessName,
  header,
  headerFormat,
  headerMediaName,
  body,
  footer,
  buttons,
  category,
  language,
}: {
  businessName: string;
  header: string;
  headerFormat: string;
  headerMediaName: string;
  body: string;
  footer: string;
  buttons: TemplateButtonDraft[];
  category: string;
  language: string;
}) {
  return (
    <div role="region" aria-label="WhatsApp customer preview">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#667781]">
          Live preview
        </p>
        <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium text-[#667781]">
          Customer view
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-[30px] border-[5px] border-[#202c33] bg-[#efeae2] shadow-xl">
        <div className="flex items-center justify-between bg-[#202c33] px-5 py-1.5 text-[9px] font-medium text-white">
          <span>12:00</span>
          <span>● ● ●</span>
        </div>
        <div className="flex items-center gap-2 bg-[#f0f2f5] px-2 py-2.5 text-[#111b21]">
          <ChevronLeft className="h-5 w-5 shrink-0 text-[#54656f]" />
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-xs font-semibold text-white">
            {businessName.slice(0, 2).toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#f0f2f5] bg-[#027eb5]">
              <Check className="h-2 w-2" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{businessName}</p>
            <p className="text-[9px] text-[#667781]">Business account preview</p>
          </div>
          <Video className="h-4 w-4 text-[#54656f]" />
          <Phone className="h-4 w-4 text-[#54656f]" />
          <MoreVertical className="h-4 w-4 text-[#54656f]" />
        </div>

        <div
          className="min-h-[430px] px-3 py-4"
          style={{
            backgroundColor: "#efeae2",
            backgroundImage:
              "radial-gradient(rgba(134, 150, 160, 0.12) 0.8px, transparent 0.8px)",
            backgroundSize: "18px 18px",
          }}
        >
          <div className="mx-auto w-fit rounded-lg bg-white/80 px-2.5 py-1 text-[9px] font-medium uppercase text-[#667781] shadow-sm">
            Today
          </div>
          <div className="mx-auto mt-2 max-w-[92%] rounded-lg bg-[#ffeecd] px-3 py-2 text-center text-[9px] leading-4 text-[#54656f] shadow-sm">
            Messages are protected with end-to-end encryption.
          </div>

          <div className="relative mt-4 max-w-[94%]">
            <span className="absolute -left-1 top-0 h-3 w-3 rotate-45 bg-white" />
            <div className="relative overflow-hidden rounded-lg bg-white shadow-sm">
              {["IMAGE", "VIDEO", "DOCUMENT", "LOCATION"].includes(
                headerFormat,
              ) ? (
                <div className="flex min-h-28 items-center justify-center bg-[#e9edef] px-4 text-center text-[#54656f]">
                  <div>
                    {headerFormat === "IMAGE" ? (
                      <ImageIcon className="mx-auto h-8 w-8" />
                    ) : headerFormat === "VIDEO" ? (
                      <Video className="mx-auto h-8 w-8" />
                    ) : headerFormat === "DOCUMENT" ? (
                      <FileText className="mx-auto h-8 w-8" />
                    ) : (
                      <MapPin className="mx-auto h-8 w-8" />
                    )}
                    <p className="mt-2 max-w-52 truncate text-[10px] font-medium uppercase tracking-wide">
                      {headerMediaName || `${headerFormat.toLowerCase()} header`}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="px-3 pt-3 text-[#111b21]">
                {header ? (
                  <p className="text-[13px] font-semibold leading-5">{header}</p>
                ) : null}
                <p
                  className={`${header ? "mt-1.5" : ""} whitespace-pre-wrap text-[12px] leading-[18px]`}
                >
                  {body || "Your message preview appears here as you type."}
                </p>
                {footer ? (
                  <p className="mt-2 text-[10px] leading-4 text-[#667781]">
                    {footer}
                  </p>
                ) : null}
                <div className="flex items-center justify-end gap-1 pb-2 pt-1 text-[9px] text-[#667781]">
                  <span>12:00</span>
                  <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                </div>
              </div>
              {buttons.length ? (
                <div className="divide-y divide-[#e9edef] border-t border-[#e9edef]">
                  {buttons.map((button, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-medium text-[#027eb5]"
                    >
                      {button.type === "URL" ? (
                        <ExternalLink className="h-3.5 w-3.5" />
                      ) : button.type === "PHONE_NUMBER" ? (
                        <Phone className="h-3.5 w-3.5" />
                      ) : (
                        <MessageSquareText className="h-3.5 w-3.5" />
                      )}
                      {button.text || "Button label"}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium text-[#54656f]">
          {category.toLowerCase()}
        </span>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium uppercase text-[#54656f]">
          {language}
        </span>
      </div>
      <div className="mt-3 rounded-xl bg-white/75 p-3 text-xs leading-5 text-[#667781]">
        Examples appear only in this preview and Meta’s review. Agents provide
        real values when sending an approved template.
      </div>
    </div>
  );
}

function TemplateActionDialog({
  action,
  template,
  onConfirm,
  onClose,
}: {
  action: "submit" | "delete";
  template: WhatsAppTemplate;
  onConfirm: TemplateActionHandler;
  onClose: () => void;
}) {
  const [working, setWorking] = useState(false);
  async function confirm() {
    if (working) return;
    setWorking(true);
    const succeeded = await onConfirm(template);
    if (succeeded) onClose();
    else setWorking(false);
  }
  const submitting = action === "submit";
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-2xl">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${submitting ? "bg-[var(--surface-accent)] text-[var(--accent-primary)]" : "bg-[var(--danger-bg)] text-[var(--danger-text)]"}`}>
          {submitting ? <Send className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
        </span>
        <h3 className="mt-4 text-lg font-semibold text-[var(--text-strong)]">
          {submitting ? "Submit template to Meta?" : "Delete this draft?"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          {submitting
            ? `${template.name} (${template.language}) will be sent to Meta for review. It cannot be edited in AgentCore after submission.`
            : `${template.name} (${template.language}) will be permanently removed. This only affects the local, unsubmitted draft.`}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={working} onClick={onClose} className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)] disabled:opacity-40">Cancel</button>
          <button type="button" disabled={working} onClick={() => void confirm()} className={`h-10 rounded-xl px-4 text-sm font-medium disabled:opacity-40 ${submitting ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "bg-[var(--danger-bg)] text-[var(--danger-text)]"}`}>
            {working ? "Working…" : submitting ? "Submit to Meta" : "Delete draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConversationHeader({
  conversation,
  session,
  users,
  canManageAgents,
  onAssign,
  onRequestHandoff,
  onUpdateStatus,
}: {
  conversation: WhatsAppConversation;
  session: { open: boolean; label: string };
  users: User[];
  canManageAgents: boolean;
  onAssign: (id: string | null) => void;
  onRequestHandoff: () => void;
  onUpdateStatus: (status: WhatsAppConversation["status"]) => void;
}) {
  return (
    <div className="border-b border-[var(--border-subtle)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {conversation.contactName ?? "WhatsApp contact"}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {conversation.contactPhone ?? conversation.contactWaId} · locale{" "}
            {conversation.locale}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill status={conversation.status} />
            <StatusPill status={session.open ? "open" : "closed"} />
            <span className="self-center text-xs text-[var(--text-muted)]">
              {session.label}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRequestHandoff}
            className="h-9 rounded-xl border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]"
          >
            Handoff
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus("open")}
            className="h-9 rounded-xl border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus("closed")}
            className="h-9 rounded-xl bg-[var(--surface-tint)] px-3 text-sm hover:bg-[var(--surface-hover)]"
          >
            Close
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,280px)_1fr] sm:items-end">
        <Field label="Assigned agent">
          <select
            className="input"
            value={conversation.assignedAgentId ?? ""}
            disabled={!canManageAgents}
            onChange={(event) => onAssign(event.target.value || null)}
          >
            <option value="">Unassigned / AI owned</option>
            {users.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name ?? agent.email}
              </option>
            ))}
          </select>
        </Field>
        <p className="pb-2 text-xs text-[var(--text-muted)]">
          Assigning an agent or requesting handoff suppresses further AI
          replies.
        </p>
      </div>
    </div>
  );
}

function TemplateSendFields({ template }: { template: WhatsAppTemplate }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showExpertOverride, setShowExpertOverride] = useState(false);
  const header = componentRecord(template, "HEADER");
  const body = componentRecord(template, "BODY");
  const buttons = componentButtons(template);
  const headerFormat =
    typeof header?.format === "string" ? header.format.toUpperCase() : "NONE";
  const bodyText = typeof body?.text === "string" ? body.text : "";
  const headerText = typeof header?.text === "string" ? header.text : "";
  const bodyVariables =
    template.category?.toUpperCase() === "AUTHENTICATION"
      ? [1]
      : templateVariableNumbers(bodyText);
  const headerVariables = templateVariableNumbers(headerText);

  function setValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const components: Record<string, unknown>[] = [];
  if (template.category?.toUpperCase() === "AUTHENTICATION") {
    const code = values.authCode?.trim() ?? "";
    if (code) {
      components.push({
        type: "body",
        parameters: [{ type: "text", text: code }],
      });
      components.push({
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: code }],
      });
    }
  } else {
    if (headerFormat === "TEXT" && headerVariables.length) {
      components.push({
        type: "header",
        parameters: headerVariables.map((number) => ({
          type: "text",
          text: values[`header-${number}`]?.trim() ?? "",
        })),
      });
    } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat)) {
      const source = values.headerMedia?.trim() ?? "";
      const media = source.startsWith("https://")
        ? { link: source }
        : { id: source };
      components.push({
        type: "header",
        parameters: [
          {
            type: headerFormat.toLowerCase(),
            [headerFormat.toLowerCase()]: {
              ...media,
              ...(headerFormat === "DOCUMENT" && values.headerFilename?.trim()
                ? { filename: values.headerFilename.trim() }
                : {}),
            },
          },
        ],
      });
    } else if (headerFormat === "LOCATION") {
      components.push({
        type: "header",
        parameters: [
          {
            type: "location",
            location: {
              latitude: Number(values.locationLatitude),
              longitude: Number(values.locationLongitude),
              name: values.locationName?.trim() ?? "",
              address: values.locationAddress?.trim() ?? "",
            },
          },
        ],
      });
    }
    if (bodyVariables.length) {
      components.push({
        type: "body",
        parameters: bodyVariables.map((number) => ({
          type: "text",
          text: values[`body-${number}`]?.trim() ?? "",
        })),
      });
    }
    buttons.forEach((button, index) => {
      if (button.type === "URL" && /\{\{1\}\}/.test(button.value)) {
        components.push({
          type: "button",
          sub_type: "url",
          index: String(index),
          parameters: [
            {
              type: "text",
              text: values[`button-${index}-url`]?.trim() ?? "",
            },
          ],
        });
      }
      if (button.type === "FLOW") {
        components.push({
          type: "button",
          sub_type: "flow",
          index: String(index),
          parameters: [
            {
              type: "action",
              action: {
                flow_token: values[`button-${index}-flowToken`]?.trim() ?? "",
              },
            },
          ],
        });
      }
      if (button.type === "MPM") {
        components.push({
          type: "button",
          sub_type: "catalog",
          index: String(index),
          parameters: [
            {
              type: "action",
              action: {
                thumbnail_product_retailer_id:
                  values[`button-${index}-retailerId`]?.trim() ?? "",
              },
            },
          ],
        });
      }
      if (
        button.type === "QUICK_REPLY" &&
        values[`button-${index}-payload`]?.trim()
      ) {
        components.push({
          type: "button",
          sub_type: "quick_reply",
          index: String(index),
          parameters: [
            {
              type: "payload",
              payload: values[`button-${index}-payload`].trim(),
            },
          ],
        });
      }
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-tint)] p-4">
      <div>
        <p className="text-sm font-medium text-[var(--text-strong)]">
          Message values
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          These values replace the approved template placeholders for this
          recipient.
        </p>
      </div>
      <input
        type="hidden"
        name="components"
        value={JSON.stringify(components)}
      />
      {template.category?.toUpperCase() === "AUTHENTICATION" ? (
        <Field label="One-time password">
          <input
            required
            autoComplete="one-time-code"
            value={values.authCode ?? ""}
            onChange={(event) => setValue("authCode", event.target.value)}
            placeholder="483920"
            className="input"
          />
        </Field>
      ) : (
        <>
          {headerFormat === "TEXT" && headerVariables.length ? (
            <RuntimeTextParameters
              label="Header"
              prefix="header"
              variables={headerVariables}
              examples={componentExamples(template, "HEADER").split("\n")}
              values={values}
              onChange={setValue}
            />
          ) : null}
          {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${headerFormat.toLowerCase()} URL or Meta media ID`}>
                <input
                  required
                  value={values.headerMedia ?? ""}
                  onChange={(event) =>
                    setValue("headerMedia", event.target.value)
                  }
                  placeholder="https://… or Meta media ID"
                  className="input"
                />
              </Field>
              {headerFormat === "DOCUMENT" ? (
                <Field label="Document filename (optional)">
                  <input
                    value={values.headerFilename ?? ""}
                    onChange={(event) =>
                      setValue("headerFilename", event.target.value)
                    }
                    placeholder="invoice.pdf"
                    className="input"
                  />
                </Field>
              ) : null}
            </div>
          ) : null}
          {headerFormat === "LOCATION" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["locationLatitude", "Latitude", "28.6139"],
                ["locationLongitude", "Longitude", "77.2090"],
                ["locationName", "Location name", "AgentCore office"],
                ["locationAddress", "Address", "New Delhi, India"],
              ].map(([key, label, placeholder]) => (
                <Field key={key} label={label}>
                  <input
                    required
                    type={
                      key.includes("Latitude") || key.includes("Longitude")
                        ? "number"
                        : "text"
                    }
                    step={
                      key.includes("Latitude") || key.includes("Longitude")
                        ? "any"
                        : undefined
                    }
                    value={values[key] ?? ""}
                    onChange={(event) => setValue(key, event.target.value)}
                    placeholder={placeholder}
                    className="input"
                  />
                </Field>
              ))}
            </div>
          ) : null}
          {bodyVariables.length ? (
            <RuntimeTextParameters
              label="Body"
              prefix="body"
              variables={bodyVariables}
              examples={componentExamples(template, "BODY").split("\n")}
              values={values}
              onChange={setValue}
            />
          ) : null}
          {buttons.map((button, index) =>
            button.type === "URL" && /\{\{1\}\}/.test(button.value) ? (
              <Field key={`url-${index}`} label={`${button.text} URL value`}>
                <input
                  required
                  value={values[`button-${index}-url`] ?? ""}
                  onChange={(event) =>
                    setValue(`button-${index}-url`, event.target.value)
                  }
                  placeholder={button.example || "Dynamic URL suffix"}
                  className="input"
                />
              </Field>
            ) : button.type === "FLOW" ? (
              <Field key={`flow-${index}`} label={`${button.text} Flow token`}>
                <input
                  required
                  value={values[`button-${index}-flowToken`] ?? ""}
                  onChange={(event) =>
                    setValue(`button-${index}-flowToken`, event.target.value)
                  }
                  placeholder="Unique token for this Flow session"
                  className="input"
                />
              </Field>
            ) : button.type === "MPM" ? (
              <Field
                key={`catalog-${index}`}
                label={`${button.text} thumbnail product retailer ID`}
              >
                <input
                  required
                  value={values[`button-${index}-retailerId`] ?? ""}
                  onChange={(event) =>
                    setValue(`button-${index}-retailerId`, event.target.value)
                  }
                  placeholder="SKU-123"
                  className="input"
                />
              </Field>
            ) : button.type === "QUICK_REPLY" ? (
              <Field
                key={`quick-${index}`}
                label={`${button.text} payload (optional)`}
              >
                <input
                  value={values[`button-${index}-payload`] ?? ""}
                  onChange={(event) =>
                    setValue(`button-${index}-payload`, event.target.value)
                  }
                  placeholder="Internal reply payload"
                  className="input"
                />
              </Field>
            ) : null,
          )}
          {!headerVariables.length &&
          !bodyVariables.length &&
          headerFormat === "NONE" &&
          !buttons.some((button) =>
            button.type === "FLOW" ||
            button.type === "MPM" ||
            (button.type === "URL" && /\{\{1\}\}/.test(button.value)),
          ) ? (
            <p className="rounded-xl bg-[var(--surface-card)] p-3 text-xs text-[var(--text-muted)]">
              This template has no runtime values and is ready to send.
            </p>
          ) : null}
        </>
      )}
      <button
        type="button"
        onClick={() => setShowExpertOverride((current) => !current)}
        className="text-xs font-medium text-[var(--accent-primary)]"
      >
        {showExpertOverride ? "Hide" : "Show"} expert JSON override
      </button>
      {showExpertOverride ? (
        <Field label="Expert components JSON (optional override)">
          <textarea
            name="componentsOverride"
            rows={4}
            className="input resize-y font-mono text-xs"
            placeholder='[{"type":"body","parameters":[…]}]'
          />
        </Field>
      ) : null}
    </div>
  );
}

function RuntimeTextParameters({
  label,
  prefix,
  variables,
  examples,
  values,
  onChange,
}: {
  label: string;
  prefix: string;
  variables: number[];
  examples: string[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[var(--text-strong)]">
        {label} variables
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {variables.map((number, index) => (
          <Field key={number} label={`{{${number}}}`}>
            <input
              required
              value={values[`${prefix}-${number}`] ?? ""}
              onChange={(event) =>
                onChange(`${prefix}-${number}`, event.target.value)
              }
              placeholder={examples[index] || `Value for {{${number}}}`}
              className="input"
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

function Composer({
  mode,
  setMode,
  sessionOpen,
  templates,
  selectedTemplate,
  selectedTemplateKey,
  setSelectedTemplateKey,
  onSendReply,
  onSendTemplate,
  onSendMedia,
}: {
  mode: "text" | "template" | "media";
  setMode: (mode: "text" | "template" | "media") => void;
  sessionOpen: boolean;
  templates: WhatsAppTemplate[];
  selectedTemplate?: WhatsAppTemplate;
  selectedTemplateKey: string;
  setSelectedTemplateKey: (value: string) => void;
  onSendReply: FormHandler;
  onSendTemplate: FormHandler;
  onSendMedia: FormHandler;
}) {
  return (
    <div className="border-t border-[var(--border-subtle)] p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <ComposerButton
          active={mode === "text"}
          disabled={!sessionOpen}
          onClick={() => setMode("text")}
          icon={<MessageSquareText className="h-4 w-4" />}
          label="Text"
        />
        <ComposerButton
          active={mode === "template"}
          onClick={() => setMode("template")}
          icon={<FileText className="h-4 w-4" />}
          label="Template"
        />
        <ComposerButton
          active={mode === "media"}
          disabled={!sessionOpen}
          onClick={() => setMode("media")}
          icon={<Paperclip className="h-4 w-4" />}
          label="Media"
        />
      </div>
      {!sessionOpen ? (
        <p className="mb-3 rounded-xl bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning-text)]">
          The 24-hour service window is closed. Send an approved template to
          reopen contact.
        </p>
      ) : null}
      {mode === "text" ? (
        <form onSubmit={onSendReply}>
          <textarea
            name="reply"
            rows={3}
            className="input min-h-24 resize-y"
            placeholder="Write a WhatsApp agent reply"
            required
          />
          <SendButton label="Send text" />
        </form>
      ) : null}
      {mode === "template" ? (
        <form onSubmit={onSendTemplate} className="space-y-3">
          <Field label="Approved template">
            <select
              className="input"
              value={selectedTemplateKey}
              onChange={(event) => setSelectedTemplateKey(event.target.value)}
              disabled={!templates.length}
            >
              {!templates.length ? (
                <option value="">No approved templates</option>
              ) : null}
              {templates.map((template) => (
                <option key={template.id} value={templateKey(template)}>
                  {template.name} · {template.language}
                </option>
              ))}
            </select>
          </Field>
          <input
            type="hidden"
            name="templateName"
            value={selectedTemplate?.name ?? ""}
          />
          <input
            type="hidden"
            name="language"
            value={selectedTemplate?.language ?? ""}
          />
          {selectedTemplate ? (
            <TemplateSendFields
              key={selectedTemplate.id}
              template={selectedTemplate}
            />
          ) : null}
          <SendButton label="Send template" disabled={!selectedTemplate} />
        </form>
      ) : null}
      {mode === "media" ? (
        <form onSubmit={onSendMedia} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Media type">
              <select name="type" className="input" defaultValue="image">
                <option value="image">Image</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
              </select>
            </Field>
            <Field label="Filename (documents)">
              <input
                name="filename"
                className="input"
                placeholder="invoice.pdf"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Meta media ID">
              <input
                name="mediaId"
                className="input"
                placeholder="Use a media ID…"
              />
            </Field>
            <Field label="HTTPS media URL">
              <input
                name="link"
                type="url"
                className="input"
                placeholder="…or https://"
              />
            </Field>
          </div>
          <Field label="Caption">
            <input name="caption" className="input" />
          </Field>
          <SendButton label="Send media" />
        </form>
      ) : null}
    </div>
  );
}

function ComposerButton({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 items-center gap-2 rounded-xl px-3 text-sm disabled:opacity-40 ${
        active
          ? "bg-[var(--accent-secondary)] text-[var(--text-on-accent)]"
          : "border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function SendButton({
  label,
  disabled,
}: {
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 flex justify-end">
      <button
        disabled={disabled}
        className="flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-secondary)] px-4 text-sm font-medium text-[var(--text-on-accent)] disabled:opacity-40"
      >
        <Send className="h-4 w-4" /> {label}
      </button>
    </div>
  );
}

function WhatsAppBubble({
  message,
  onOpenMedia,
  onRetryMessage,
}: {
  message: WhatsAppMessage;
  onOpenMedia: Props["onOpenMedia"];
  onRetryMessage: Props["onRetryMessage"];
}) {
  const outbound = message.direction === "outbound";
  const hasMedia = ["image", "audio", "video", "document", "sticker"].includes(
    message.type,
  );
  const metadata = message.metadata;
  const aiProvider =
    typeof metadata.provider === "string" ? metadata.provider : null;
  const aiModel = typeof metadata.model === "string" ? metadata.model : null;
  const usedFallback = metadata.usedFallback === true;

  return (
    <div
      className={`max-w-[86%] rounded-2xl border p-3 shadow-sm ${
        outbound
          ? "ml-auto border-[var(--accent-secondary)] bg-[var(--success-bg)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-card)]"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium uppercase text-[var(--text-muted)]">
        <span>
          {message.role} · {message.type}
        </span>
        <span>{formatDateTime(message.createdAt)}</span>
      </div>
      {message.content ? (
        <p className="whitespace-pre-wrap text-sm leading-6">
          {message.content}
        </p>
      ) : hasMedia ? (
        <p className="text-sm text-[var(--text-muted)]">
          {message.mediaMimeType ?? `${message.type} attachment`}
        </p>
      ) : null}
      {hasMedia ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.direction === "inbound" ? (
            <>
              <button
                type="button"
                onClick={() => onOpenMedia(message, "open")}
                className="flex h-8 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-3 text-xs"
              >
                {message.type === "image" ? (
                  <ImageIcon className="h-3.5 w-3.5" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                Open
              </button>
              <button
                type="button"
                onClick={() => onOpenMedia(message, "download")}
                className="flex h-8 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-3 text-xs"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </>
          ) : message.mediaUrl ? (
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-3 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open media
            </a>
          ) : null}
        </div>
      ) : null}
      {outbound ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-2">
          <StatusPill status={message.deliveryStatus ?? "unknown"} />
          <span className="text-[11px] text-[var(--text-muted)]">
            {message.deliveredAt
              ? `Delivered ${formatDateTime(message.deliveredAt)}`
              : `${message.deliveryAttempts ?? 0} delivery attempt(s)`}
          </span>
          {message.deliveryError ? (
            <p className="w-full text-xs text-[var(--danger-text)]">
              {message.deliveryError}
            </p>
          ) : null}
          {message.deliveryStatus === "failed" && message.role === "agent" ? (
            <button
              type="button"
              onClick={() => onRetryMessage(message)}
              className="rounded-lg border border-[var(--danger-text)] px-3 py-1.5 text-xs font-medium text-[var(--danger-text)]"
            >
              Retry send
            </button>
          ) : null}
        </div>
      ) : null}
      {aiProvider ||
      aiModel ||
      usedFallback ||
      Array.isArray(metadata.citations) ? (
        <details className="mt-2 text-xs text-[var(--text-muted)]">
          <summary className="cursor-pointer">AI and delivery details</summary>
          <div className="mt-2 space-y-1 rounded-lg bg-[var(--surface-tint)] p-2">
            {aiProvider ? <p>Provider: {aiProvider}</p> : null}
            {aiModel ? <p>Model: {aiModel}</p> : null}
            {usedFallback ? (
              <p className="text-[var(--warning-text)]">Safe fallback used</p>
            ) : null}
            {Array.isArray(metadata.citations) ? (
              <p>{metadata.citations.length} knowledge citation(s)</p>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
