import type {
  FormHandler,
  VoiceCall,
  VoiceCallEvent,
  VoiceCallList,
  VoiceConfig,
} from "@/lib/types";
import { Card, EmptyState, Field, StatusPill } from "./ui";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function VoiceReceptionistView({
  configs,
  calls,
  selectedCall,
  filters,
  setFilters,
  onCreateConfig,
  onLoadCalls,
  onSelectCall,
  onSendMessage,
  onRequestHandoff,
  onRouteCall,
  onUpdateStatus,
}: {
  configs: VoiceConfig[];
  calls: VoiceCallList | null;
  selectedCall: VoiceCall | null;
  filters: { status: string; search: string };
  setFilters: (filters: { status: string; search: string }) => void;
  onCreateConfig: FormHandler;
  onLoadCalls: () => void;
  onSelectCall: (id: string) => void;
  onSendMessage: FormHandler;
  onRequestHandoff: () => void;
  onRouteCall: (action: "transfer" | "voicemail" | "close") => void;
  onUpdateStatus: (status: VoiceCall["status"]) => void;
}) {
  const activeConfig = configs[0];

  return (
    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-4">
        <form
          onSubmit={onCreateConfig}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
        >
          <h2 className="font-semibold">Voice Provider</h2>
          <div className="mt-4 space-y-4">
            <Field label="Name">
              <input name="name" className="input" required />
            </Field>
            <Field label="Provider">
              <select name="provider" className="input" defaultValue="twilio">
                <option value="twilio">Twilio Voice</option>
                <option value="sip">SIP</option>
                <option value="custom">Custom</option>
              </select>
            </Field>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Phone number">
                <input name="phoneNumber" className="input" />
              </Field>
              <Field label="SIP domain">
                <input name="sipDomain" className="input" />
              </Field>
            </div>
            <Field label="Provider API key">
              <input name="apiKey" type="password" className="input" />
            </Field>
            <Field label="Webhook verify token">
              <input
                name="webhookVerifyToken"
                type="password"
                className="input"
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="STT provider">
                <input name="sttProvider" className="input" defaultValue="openai" />
              </Field>
              <Field label="TTS voice">
                <input name="ttsVoice" className="input" defaultValue="alloy" />
              </Field>
            </div>
            <Field label="Transfer phone">
              <input name="transferPhoneNumber" className="input" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-[var(--text-base)]">
              <input
                name="voicemailEnabled"
                type="checkbox"
                defaultChecked
                className="h-4 w-4"
              />
              Enable voicemail fallback
            </label>
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
                {activeConfig.provider} ·{" "}
                {activeConfig.phoneNumber ?? activeConfig.sipDomain ?? "No endpoint"}
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <StatusPill status={activeConfig.hasApiKey ? "api key" : "no key"} />
                <StatusPill
                  status={
                    activeConfig.hasWebhookVerifyToken ? "verify" : "no verify"
                  }
                />
                <StatusPill
                  status={activeConfig.voicemailEnabled ? "voicemail" : "no vm"}
                />
              </div>
              <pre className="overflow-auto rounded-md bg-[var(--surface-card)] p-3 text-xs text-[var(--text-strong)]">
                {`GET /api/v1/voice-receptionist/webhook/${activeConfig.id}`}
                {"\n"}
                {`POST /api/v1/voice-receptionist/webhook/${activeConfig.id}/events`}
              </pre>
            </div>
          ) : (
            <EmptyState>No voice config yet.</EmptyState>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <div className="border-b border-[var(--border-subtle)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Voice Calls</h2>
              <span className="text-xs text-[var(--text-muted)]">{calls?.total ?? 0}</span>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_130px] gap-2">
              <input
                value={filters.search}
                onChange={(event) =>
                  setFilters({ ...filters, search: event.target.value })
                }
                placeholder="Search caller"
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
                <option value="in_progress">In progress</option>
                <option value="waiting_for_agent">Waiting</option>
                <option value="voicemail">Voicemail</option>
                <option value="transferred">Transferred</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button
              onClick={onLoadCalls}
              className="mt-3 h-9 w-full rounded-md bg-[var(--surface-tint)] text-sm hover:bg-[var(--accent-primary-strong)]"
            >
              Apply
            </button>
          </div>
          <div className="max-h-[640px] overflow-auto">
            {calls?.data.map((call) => (
              <button
                key={call.id}
                onClick={() => onSelectCall(call.id)}
                className={`block w-full border-b border-[var(--border-subtle)] p-4 text-left hover:bg-[var(--surface-hover)] ${
                  selectedCall?.id === call.id ? "bg-[var(--surface-accent)]" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {call.callerName ?? call.fromNumber ?? call.providerCallId}
                  </span>
                  <StatusPill status={call.status} />
                </div>
                <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                  {call.events.at(-1)?.content ?? "No transcript yet"}
                </p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  {formatDateTime(call.lastEventAt)}
                </p>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          {selectedCall ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-4">
                <div>
                  <h2 className="font-semibold">
                    {selectedCall.callerName ?? "Voice caller"}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedCall.fromNumber ?? selectedCall.providerCallId}
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
                    onClick={() => onRouteCall("transfer")}
                    className="h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]"
                  >
                    Transfer
                  </button>
                  <button
                    onClick={() => onRouteCall("voicemail")}
                    className="h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]"
                  >
                    Voicemail
                  </button>
                  <button
                    onClick={() => onUpdateStatus("completed")}
                    className="h-9 rounded-md bg-[var(--surface-card)] px-3 text-sm text-[var(--text-strong)] hover:bg-[var(--surface-hover-strong)]"
                  >
                    End
                  </button>
                </div>
              </div>
              <div className="max-h-[560px] space-y-3 overflow-auto bg-[var(--surface-card)] p-4">
                {selectedCall.events.map((event) => (
                  <VoiceEventBubble key={event.id} event={event} />
                ))}
              </div>
              <form
                onSubmit={onSendMessage}
                className="border-t border-[var(--border-subtle)] p-4"
              >
                <textarea
                  name="reply"
                  rows={3}
                  className="input min-h-24 resize-y"
                  placeholder="Speak a live agent message"
                  required
                />
                <div className="mt-3 flex justify-end">
                  <button className="h-10 rounded-md bg-[var(--accent-secondary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-secondary-strong)]">
                    Speak message
                  </button>
                </div>
              </form>
            </>
          ) : (
            <EmptyState>No voice call selected.</EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}

function VoiceEventBubble({ event }: { event: VoiceCallEvent }) {
  const isCaller = event.role === "caller";
  const isAgent = event.role === "agent";

  return (
    <div
      className={`max-w-[80%] rounded-lg border p-3 ${
        isCaller
          ? "ml-auto border-[var(--accent-primary)] bg-[var(--surface-accent)]"
          : isAgent
            ? "border-[var(--accent-secondary)] bg-[var(--success-bg)]"
            : "border-[var(--border-subtle)] bg-[var(--surface-card)]"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-medium uppercase text-[var(--text-muted)]">
        <span>{event.role}</span>
        <span>{event.type}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6">
        {event.content ?? "No content"}
      </p>
      {event.confidence ? (
        <p className="mt-1 text-xs text-[var(--text-soft)]">
          confidence {(event.confidence * 100).toFixed(0)}%
        </p>
      ) : null}
      <p className="mt-2 text-xs text-[var(--text-soft)]">
        {formatDateTime(event.createdAt)}
      </p>
    </div>
  );
}
