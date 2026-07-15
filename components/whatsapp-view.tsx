import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  MessageSquareText,
  Paperclip,
  RefreshCw,
  Send,
  Settings,
} from "lucide-react";
import type {
  FormHandler,
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
  filters: WhatsAppFilters;
  setFilters: (filters: WhatsAppFilters) => void;
  onCreateConfig: FormHandler;
  onUpdateConfig: FormHandler;
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
    filters,
    setFilters,
    onCreateConfig,
    onUpdateConfig,
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
            onSelectConfig={onSelectConfig}
            onCreateConfig={onCreateConfig}
            onUpdateConfig={onUpdateConfig}
          />
        ) : (
          <TemplatePanel
            activeConfig={activeConfig}
            templates={templates}
            canConfigure={canConfigure}
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
  onSelectConfig,
  onCreateConfig,
  onUpdateConfig,
}: {
  configs: WhatsAppConfig[];
  activeConfig?: WhatsAppConfig;
  canConfigure: boolean;
  onSelectConfig: (id: string) => void;
  onCreateConfig: FormHandler;
  onUpdateConfig: FormHandler;
}) {
  return (
    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Field label="Configured provider">
          <select
            className="input"
            value={activeConfig?.id ?? ""}
            onChange={(event) => onSelectConfig(event.target.value)}
          >
            {!configs.length ? (
              <option value="">No configuration</option>
            ) : null}
            {configs.map((config) => (
              <option key={config.id} value={config.id}>
                {config.name} · {config.provider} · {config.status}
              </option>
            ))}
          </select>
        </Field>
        {activeConfig ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatusPill status={activeConfig.status} />
              <StatusPill
                status={activeConfig.hasAccessToken ? "token" : "no token"}
              />
              <StatusPill
                status={
                  activeConfig.hasWebhookVerifyToken ? "verify" : "no verify"
                }
              />
              <StatusPill
                status={activeConfig.hasAppSecret ? "secret" : "no secret"}
              />
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-tint)] p-3 text-xs">
              <p className="font-medium text-[var(--text-strong)]">
                Meta webhook URLs
              </p>
              <code className="mt-2 block break-all text-[var(--text-muted)]">
                GET /api/v1/whatsapp-assistant/webhook/{activeConfig.id}
              </code>
              <code className="mt-1 block break-all text-[var(--text-muted)]">
                POST /api/v1/whatsapp-assistant/webhook/{activeConfig.id}
                /inbound
              </code>
            </div>
          </>
        ) : (
          <EmptyState>No WhatsApp configuration yet.</EmptyState>
        )}
        {canConfigure ? (
          <details className="rounded-xl border border-[var(--border-subtle)] p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Add another provider
            </summary>
            <ConfigForm
              className="mt-4"
              onSubmit={onCreateConfig}
              submitLabel="Create config"
            />
          </details>
        ) : null}
      </div>

      {activeConfig && canConfigure ? (
        <form
          key={activeConfig.id}
          onSubmit={onUpdateConfig}
          className="space-y-4"
        >
          <input type="hidden" name="configId" value={activeConfig.id} />
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <h3 className="font-medium">Edit configuration</h3>
          </div>
          <ConfigFields config={activeConfig} />
          <button className="h-10 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)]">
            Save changes
          </button>
        </form>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-6 text-sm text-[var(--text-muted)]">
          {canConfigure
            ? "Create a configuration to connect Meta or Twilio."
            : "Configuration requires WhatsApp configure access."}
        </div>
      )}
    </div>
  );
}

function ConfigForm({
  onSubmit,
  submitLabel,
  className = "",
}: {
  onSubmit: FormHandler;
  submitLabel: string;
  className?: string;
}) {
  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${className}`}>
      <ConfigFields />
      <button className="h-10 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)]">
        {submitLabel}
      </button>
    </form>
  );
}

function ConfigFields({ config }: { config?: WhatsAppConfig }) {
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
    </>
  );
}

function TemplatePanel({
  activeConfig,
  templates,
  canConfigure,
  onSyncTemplates,
}: {
  activeConfig?: WhatsAppConfig;
  templates: WhatsAppTemplate[];
  canConfigure: boolean;
  onSyncTemplates: (id: string) => void;
}) {
  const currentTemplates = templates.filter(
    (template) => template.configId === activeConfig?.id,
  );
  return (
    <div className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Meta message templates</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Approved templates are available outside the 24-hour service window.
          </p>
        </div>
        <button
          type="button"
          disabled={
            !activeConfig || activeConfig.provider !== "meta" || !canConfigure
          }
          onClick={() => activeConfig && onSyncTemplates(activeConfig.id)}
          className="flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] disabled:opacity-40"
        >
          <RefreshCw className="h-4 w-4" /> Sync from Meta
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border-subtle)]">
        {currentTemplates.length ? (
          currentTemplates.map((template) => (
            <div
              key={template.id}
              className="grid gap-2 border-b border-[var(--border-subtle)] p-4 last:border-0 sm:grid-cols-[1fr_130px_110px_150px] sm:items-center"
            >
              <div>
                <p className="text-sm font-medium">{template.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {template.category ?? "Uncategorized"}
                </p>
              </div>
              <span className="text-xs uppercase">{template.language}</span>
              <StatusPill status={template.status.toLowerCase()} />
              <span className="text-xs text-[var(--text-muted)]">
                {formatDateTime(template.syncedAt)}
              </span>
            </div>
          ))
        ) : (
          <EmptyState>
            No synchronized templates for this configuration.
          </EmptyState>
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
