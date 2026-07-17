import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Check,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Languages,
  MessageSquareText,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
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
}: {
  configs: WhatsAppConfig[];
  activeConfig?: WhatsAppConfig;
  templates: WhatsAppTemplate[];
  canConfigure: boolean;
  onSelectConfig: (id: string) => void;
  onSyncTemplates: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
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
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
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
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
                      {formatDateTime(template.syncedAt)}
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
          <Field label="Components JSON (optional)">
            <textarea
              name="components"
              rows={3}
              className="input resize-y font-mono text-xs"
              placeholder={
                '[{"type":"body","parameters":[{"type":"text","text":"Ada"}]}]'
              }
            />
          </Field>
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
