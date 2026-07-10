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
          className="rounded-lg border border-[#263449] bg-[#111c2e] p-4"
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
            <button className="h-10 rounded-md bg-[#4f7cff] px-4 text-sm font-medium text-white">
              Save config
            </button>
          </div>
        </form>

        <Card>
          <div className="border-b border-[#263449] p-4">
            <h2 className="font-semibold">Current Config</h2>
          </div>
          {activeConfig ? (
            <div className="space-y-3 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{activeConfig.name}</span>
                <StatusPill status={activeConfig.status} />
              </div>
              <p className="text-xs text-[#8797b0]">
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
              <pre className="overflow-auto rounded-md bg-[#111c2e] p-3 text-xs text-white">
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
          <div className="border-b border-[#263449] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">WhatsApp Inbox</h2>
              <span className="text-xs text-[#8797b0]">
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
              className="mt-3 h-9 w-full rounded-md bg-[#223047] text-sm hover:bg-[#314158]"
            >
              Apply
            </button>
          </div>
          <div className="max-h-[640px] overflow-auto">
            {conversations?.data.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`block w-full border-b border-[#223047] p-4 text-left hover:bg-[#142238] ${
                  selectedConversation?.id === conversation.id
                    ? "bg-[#172b47]"
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
                <p className="mt-1 truncate text-xs text-[#8797b0]">
                  {conversation.messages.at(-1)?.content ?? "No text message"}
                </p>
                <p className="mt-1 text-xs text-[#98a2b3]">
                  {formatDateTime(conversation.lastMessageAt)}
                </p>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          {selectedConversation ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#263449] p-4">
                <div>
                  <h2 className="font-semibold">
                    {selectedConversation.contactName ?? "WhatsApp contact"}
                  </h2>
                  <p className="text-xs text-[#8797b0]">
                    {selectedConversation.contactPhone ??
                      selectedConversation.contactWaId}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={onRequestHandoff}
                    className="h-9 rounded-md border border-[#314158] px-3 text-sm hover:bg-[#18263b]"
                  >
                    Handoff
                  </button>
                  <button
                    onClick={() => onUpdateStatus("open")}
                    className="h-9 rounded-md border border-[#314158] px-3 text-sm hover:bg-[#18263b]"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => onUpdateStatus("closed")}
                    className="h-9 rounded-md bg-[#111c2e] px-3 text-sm text-white hover:bg-[#26344f]"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="max-h-[560px] space-y-3 overflow-auto bg-[#111c2e] p-4">
                {selectedConversation.messages.map((message) => (
                  <WhatsAppBubble key={message.id} message={message} />
                ))}
              </div>
              <form
                onSubmit={onSendReply}
                className="border-t border-[#263449] p-4"
              >
                <textarea
                  name="reply"
                  rows={3}
                  className="input min-h-24 resize-y"
                  placeholder="Write a WhatsApp agent reply"
                  required
                />
                <div className="mt-3 flex justify-end">
                  <button className="h-10 rounded-md bg-[#19b8c9] px-4 text-sm font-medium text-white hover:bg-[#0f8895]">
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
          ? "ml-auto border-[#1d3a60] bg-[#172b47]"
          : isAgent
            ? "border-[#1b4338] bg-[#15352f]"
            : "border-[#263449] bg-[#111c2e]"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-medium uppercase text-[#8797b0]">
        <span>{message.role}</span>
        <span>{message.type}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6">
        {message.content ?? `Media message: ${message.mediaMimeType ?? message.type}`}
      </p>
    </div>
  );
}
