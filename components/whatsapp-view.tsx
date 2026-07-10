import type {
  FormHandler,
  WhatsAppConfig,
  WhatsAppConversation,
  WhatsAppConversationList,
  WhatsAppMessage,
} from "@/lib/types";
import { Card, EmptyState, Field, StatusPill } from "./ui";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WhatsAppView({
  configs,
  conversations,
  selectedConversation,
  filters,
  setFilters,
  onCreateConfig,
  onLoadConversations,
  onSelectConversation,
  onSendReply,
  onRequestHandoff,
  onUpdateStatus,
}: {
  configs: WhatsAppConfig[];
  conversations: WhatsAppConversationList | null;
  selectedConversation: WhatsAppConversation | null;
  filters: { status: string; search: string };
  setFilters: (filters: { status: string; search: string }) => void;
  onCreateConfig: FormHandler;
  onLoadConversations: () => void;
  onSelectConversation: (id: string) => void;
  onSendReply: FormHandler;
  onRequestHandoff: () => void;
  onUpdateStatus: (status: WhatsAppConversation["status"]) => void;
}) {
  const activeConfig = configs[0];

  return (
    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-4">
        <form
          onSubmit={onCreateConfig}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
        >
          <h2 className="font-semibold">WhatsApp Provider</h2>
          <div className="mt-4 space-y-4">
            <Field label="Name">
              <input name="name" className="input" required />
            </Field>
            <Field label="Provider">
              <select name="provider" className="input" defaultValue="meta">
                <option value="meta">Meta WhatsApp Cloud</option>
                <option value="twilio">Twilio</option>
                <option value="custom">Custom</option>
              </select>
            </Field>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Phone number ID">
                <input name="phoneNumberId" className="input" />
              </Field>
              <Field label="Business account ID">
                <input name="businessAccountId" className="input" />
              </Field>
            </div>
            <Field label="Access token">
              <input name="accessToken" type="password" className="input" />
            </Field>
            <Field label="Webhook verify token">
              <input
                name="webhookVerifyToken"
                type="password"
                className="input"
              />
            </Field>
            <Field label="Default locale">
              <input name="defaultLocale" className="input" defaultValue="en" />
            </Field>
            <button className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)]">
              Save config
            </button>
          </div>
        </form>

        <Card>
          <div className="border-b border-[var(--border-subtle)] p-4">
            <h2 className="font-semibold">Current Config</h2>
          </div>
          {activeConfig ? (
            <div className="space-y-3 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{activeConfig.name}</span>
                <StatusPill status={activeConfig.status} />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {activeConfig.provider} · {activeConfig.phoneNumberId ?? "No phone ID"}
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
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
              <pre className="overflow-auto rounded-md bg-[var(--surface-card)] p-3 text-xs text-[var(--text-strong)]">
                {`GET /api/v1/whatsapp-assistant/webhook/${activeConfig.id}`}
                {"\n"}
                {`POST /api/v1/whatsapp-assistant/webhook/${activeConfig.id}/inbound`}
              </pre>
            </div>
          ) : (
            <EmptyState>No WhatsApp config yet.</EmptyState>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <div className="border-b border-[var(--border-subtle)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">WhatsApp Inbox</h2>
              <span className="text-xs text-[var(--text-muted)]">
                {conversations?.total ?? 0}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_120px] gap-2">
              <input
                value={filters.search}
                onChange={(event) =>
                  setFilters({ ...filters, search: event.target.value })
                }
                placeholder="Search contact"
                className="input"
              />
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters({ ...filters, status: event.target.value })
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
              onClick={onLoadConversations}
              className="mt-3 h-9 w-full rounded-md bg-[var(--surface-tint)] text-sm hover:bg-[var(--accent-primary-strong)]"
            >
              Apply
            </button>
          </div>
          <div className="max-h-[640px] overflow-auto">
            {conversations?.data.map((conversation) => (
              <button
                key={conversation.id}
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
                  {conversation.messages.at(-1)?.content ?? "No text message"}
                </p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  {formatDateTime(conversation.lastMessageAt)}
                </p>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          {selectedConversation ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-4">
                <div>
                  <h2 className="font-semibold">
                    {selectedConversation.contactName ?? "WhatsApp contact"}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedConversation.contactPhone ??
                      selectedConversation.contactWaId}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={onRequestHandoff}
                    className="h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]"
                  >
                    Handoff
                  </button>
                  <button
                    onClick={() => onUpdateStatus("open")}
                    className="h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => onUpdateStatus("closed")}
                    className="h-9 rounded-md bg-[var(--surface-card)] px-3 text-sm text-[var(--text-strong)] hover:bg-[var(--surface-hover-strong)]"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="max-h-[560px] space-y-3 overflow-auto bg-[var(--surface-card)] p-4">
                {selectedConversation.messages.map((message) => (
                  <WhatsAppBubble key={message.id} message={message} />
                ))}
              </div>
              <form
                onSubmit={onSendReply}
                className="border-t border-[var(--border-subtle)] p-4"
              >
                <textarea
                  name="reply"
                  rows={3}
                  className="input min-h-24 resize-y"
                  placeholder="Write a WhatsApp agent reply"
                  required
                />
                <div className="mt-3 flex justify-end">
                  <button className="h-10 rounded-md bg-[var(--accent-secondary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-secondary-strong)]">
                    Send reply
                  </button>
                </div>
              </form>
            </>
          ) : (
            <EmptyState>No WhatsApp conversation selected.</EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}

function WhatsAppBubble({ message }: { message: WhatsAppMessage }) {
  const isContact = message.role === "contact";
  const isAgent = message.role === "agent";

  return (
    <div
      className={`max-w-[80%] rounded-lg border p-3 ${
        isContact
          ? "ml-auto border-[var(--accent-primary)] bg-[var(--surface-accent)]"
          : isAgent
            ? "border-[var(--accent-secondary)] bg-[var(--success-bg)]"
            : "border-[var(--border-subtle)] bg-[var(--surface-card)]"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-medium uppercase text-[var(--text-muted)]">
        <span>{message.role}</span>
        <span>{message.type}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6">
        {message.content ?? `Media message: ${message.mediaMimeType ?? message.type}`}
      </p>
    </div>
  );
}
