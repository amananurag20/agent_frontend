import { FormEvent, useMemo, useState } from "react";
import type {
  User,
  VoiceCall,
  VoiceCallEvent,
  VoiceCallFilters,
  VoiceCallList,
  VoiceConfig,
  VoiceConfigInput,
} from "@/lib/types";
import { Card, EmptyState, Field, StatusPill } from "./ui";

const WEEKDAYS = [
  [0, "Sun"],
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
] as const;

type ConfigDraft = {
  name: string;
  provider: VoiceConfig["provider"];
  status: VoiceConfig["status"];
  phoneNumber: string;
  sipDomain: string;
  apiKey: string;
  webhookVerifyToken: string;
  twilioAccountSid: string;
  sttProvider: string;
  sttModel: string;
  ttsProvider: string;
  ttsVoice: string;
  defaultLocale: string;
  transferPhoneNumber: string;
  voicemailEnabled: boolean;
  greeting: string;
  errorMessage: string;
  afterHoursMessage: string;
  businessHoursEnabled: boolean;
  timezone: string;
  businessDays: number[];
  startTime: string;
  endTime: string;
  holidays: string;
  routingKeywords: string;
  dtmfRoutes: string;
  voicemailPrompt: string;
  voicemailMaxLengthSeconds: string;
  handoffNotificationEmail: string;
  handoffNotificationPhone: string;
  voicemailNotificationEmail: string;
  voicemailNotificationPhone: string;
  conversationRelayUrl: string;
  conversationRelayTtsProvider: string;
  conversationRelayVoice: string;
  conversationRelayTranscriptionProvider: string;
  conversationRelaySpeechModel: string;
  twilioGatherUrl: string;
  twilioDialCallbackUrl: string;
  twilioRecordingCallbackUrl: string;
  twilioConversationRelayCallbackUrl: string;
};

const emptyDraft: ConfigDraft = {
  name: "",
  provider: "twilio",
  status: "active",
  phoneNumber: "",
  sipDomain: "",
  apiKey: "",
  webhookVerifyToken: "",
  twilioAccountSid: "",
  sttProvider: "deepgram",
  sttModel: "",
  ttsProvider: "amazon",
  ttsVoice: "Joanna-Neural",
  defaultLocale: "en-US",
  transferPhoneNumber: "",
  voicemailEnabled: true,
  greeting: "Hello, thank you for calling. How can I help you today?",
  errorMessage:
    "I am sorry, I am having trouble answering right now. Please try again or ask for a person.",
  afterHoursMessage:
    "We are currently closed. Please call again during business hours.",
  businessHoursEnabled: false,
  timezone: "Asia/Kolkata",
  businessDays: [1, 2, 3, 4, 5],
  startTime: "09:00",
  endTime: "18:00",
  holidays: "",
  routingKeywords: "",
  dtmfRoutes: "",
  voicemailPrompt: "Please leave a voicemail after the tone.",
  voicemailMaxLengthSeconds: "120",
  handoffNotificationEmail: "",
  handoffNotificationPhone: "",
  voicemailNotificationEmail: "",
  voicemailNotificationPhone: "",
  conversationRelayUrl: "",
  conversationRelayTtsProvider: "Amazon",
  conversationRelayVoice: "Joanna-Neural",
  conversationRelayTranscriptionProvider: "Deepgram",
  conversationRelaySpeechModel: "",
  twilioGatherUrl: "",
  twilioDialCallbackUrl: "",
  twilioRecordingCallbackUrl: "",
  twilioConversationRelayCallbackUrl: "",
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(seconds?: number | null) {
  if (seconds === undefined || seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function routesToLines(value: unknown, dtmf = false) {
  return Object.entries(record(value))
    .map(([key, route]) => {
      if (typeof route === "string") return `${key}=${route}`;
      const details = record(route);
      const target = text(details.transferTo);
      const department = text(details.department);
      return dtmf && department
        ? `${key}=${department}|${target}`
        : `${key}=${target}`;
    })
    .join("\n");
}

function draftFromConfig(config: VoiceConfig): ConfigDraft {
  const settings = record(config.settings);
  const hours = record(settings.businessHours);
  return {
    ...emptyDraft,
    name: config.name,
    provider: config.provider,
    status: config.status,
    phoneNumber: config.phoneNumber ?? "",
    sipDomain: config.sipDomain ?? "",
    sttProvider: config.sttProvider ?? "",
    sttModel: config.sttModel ?? "",
    ttsProvider: config.ttsProvider ?? "",
    ttsVoice: config.ttsVoice ?? "",
    defaultLocale: config.defaultLocale,
    transferPhoneNumber: config.transferPhoneNumber ?? "",
    voicemailEnabled: config.voicemailEnabled,
    twilioAccountSid: text(settings.twilioAccountSid),
    greeting: text(settings.greeting, emptyDraft.greeting),
    errorMessage: text(settings.errorMessage, emptyDraft.errorMessage),
    afterHoursMessage: text(
      settings.afterHoursMessage,
      emptyDraft.afterHoursMessage,
    ),
    businessHoursEnabled: hours.enabled !== false && Boolean(settings.businessHours),
    timezone: text(hours.timezone, emptyDraft.timezone),
    businessDays: Array.isArray(hours.days)
      ? hours.days.filter((day): day is number => typeof day === "number")
      : emptyDraft.businessDays,
    startTime: text(hours.startTime, emptyDraft.startTime),
    endTime: text(hours.endTime, emptyDraft.endTime),
    holidays: Array.isArray(hours.holidays) ? hours.holidays.join(", ") : "",
    routingKeywords: routesToLines(settings.routingKeywords),
    dtmfRoutes: routesToLines(settings.dtmfRoutes, true),
    voicemailPrompt: text(settings.voicemailPrompt, emptyDraft.voicemailPrompt),
    voicemailMaxLengthSeconds: String(
      typeof settings.voicemailMaxLengthSeconds === "number"
        ? settings.voicemailMaxLengthSeconds
        : 120,
    ),
    handoffNotificationEmail: text(settings.handoffNotificationEmail),
    handoffNotificationPhone: text(settings.handoffNotificationPhone),
    voicemailNotificationEmail: text(settings.voicemailNotificationEmail),
    voicemailNotificationPhone: text(settings.voicemailNotificationPhone),
    conversationRelayUrl: text(settings.conversationRelayUrl),
    conversationRelayTtsProvider: text(
      settings.conversationRelayTtsProvider,
      emptyDraft.conversationRelayTtsProvider,
    ),
    conversationRelayVoice: text(
      settings.conversationRelayVoice,
      config.ttsVoice ?? emptyDraft.conversationRelayVoice,
    ),
    conversationRelayTranscriptionProvider: text(
      settings.conversationRelayTranscriptionProvider,
      emptyDraft.conversationRelayTranscriptionProvider,
    ),
    conversationRelaySpeechModel: text(
      settings.conversationRelaySpeechModel,
    ),
    twilioGatherUrl: text(settings.twilioGatherUrl),
    twilioDialCallbackUrl: text(settings.twilioDialCallbackUrl),
    twilioRecordingCallbackUrl: text(settings.twilioRecordingCallbackUrl),
    twilioConversationRelayCallbackUrl: text(
      settings.twilioConversationRelayCallbackUrl,
    ),
  };
}

function parseKeywordRoutes(lines: string) {
  const routes: Record<string, string> = {};
  for (const line of lines.split("\n").map((item) => item.trim()).filter(Boolean)) {
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    routes[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return routes;
}

function parseDtmfRoutes(lines: string) {
  const routes: Record<string, string | { department: string; transferTo: string }> = {};
  for (const line of lines.split("\n").map((item) => item.trim()).filter(Boolean)) {
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const digits = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    const [department, transferTo] = value.includes("|")
      ? value.split("|", 2).map((item) => item.trim())
      : ["", value];
    routes[digits] = department ? { department, transferTo } : transferTo;
  }
  return routes;
}

function buildConfigInput(
  draft: ConfigDraft,
  existing?: VoiceConfig,
): VoiceConfigInput {
  const settings: Record<string, unknown> = { ...(existing?.settings ?? {}) };
  const set = (key: string, value: unknown) => {
    if (value === "" || value === undefined || value === null) delete settings[key];
    else settings[key] = value;
  };
  set("twilioAccountSid", draft.twilioAccountSid.trim());
  set("greeting", draft.greeting.trim());
  set("errorMessage", draft.errorMessage.trim());
  set("afterHoursMessage", draft.afterHoursMessage.trim());
  settings.businessHours = {
    enabled: draft.businessHoursEnabled,
    timezone: draft.timezone.trim(),
    days: draft.businessDays,
    startTime: draft.startTime,
    endTime: draft.endTime,
    holidays: draft.holidays
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  };
  set("routingKeywords", parseKeywordRoutes(draft.routingKeywords));
  set("dtmfRoutes", parseDtmfRoutes(draft.dtmfRoutes));
  set("voicemailPrompt", draft.voicemailPrompt.trim());
  set(
    "voicemailMaxLengthSeconds",
    Number(draft.voicemailMaxLengthSeconds) || 120,
  );
  for (const key of [
    "handoffNotificationEmail",
    "handoffNotificationPhone",
    "voicemailNotificationEmail",
    "voicemailNotificationPhone",
    "conversationRelayUrl",
    "conversationRelayTtsProvider",
    "conversationRelayVoice",
    "conversationRelayTranscriptionProvider",
    "conversationRelaySpeechModel",
    "twilioGatherUrl",
    "twilioDialCallbackUrl",
    "twilioRecordingCallbackUrl",
    "twilioConversationRelayCallbackUrl",
  ] as const) {
    set(key, draft[key].trim());
  }
  return {
    name: draft.name.trim(),
    provider: draft.provider,
    status: draft.status,
    phoneNumber: draft.phoneNumber.trim() || null,
    sipDomain: draft.sipDomain.trim() || null,
    ...(draft.apiKey ? { apiKey: draft.apiKey } : {}),
    ...(draft.webhookVerifyToken
      ? { webhookVerifyToken: draft.webhookVerifyToken }
      : {}),
    sttProvider: draft.sttProvider || null,
    sttModel: draft.sttModel.trim() || null,
    ttsProvider: draft.ttsProvider || null,
    ttsVoice: draft.ttsVoice.trim() || null,
    defaultLocale: draft.defaultLocale.trim() || "en-US",
    transferPhoneNumber: draft.transferPhoneNumber.trim() || null,
    voicemailEnabled: draft.voicemailEnabled,
    settings,
  };
}

export function VoiceReceptionistView({
  configs,
  calls,
  selectedCall,
  users,
  canConfigure,
  canManageAgents,
  apiBaseUrl,
  filters,
  setFilters,
  onSaveConfig,
  onLoadCalls,
  onSelectCall,
  onSendMessage,
  onRequestHandoff,
  onRouteCall,
  onUpdateStatus,
  onAssignCall,
}: {
  configs: VoiceConfig[];
  calls: VoiceCallList | null;
  selectedCall: VoiceCall | null;
  users: User[];
  canConfigure: boolean;
  canManageAgents: boolean;
  apiBaseUrl: string;
  filters: VoiceCallFilters;
  setFilters: (filters: VoiceCallFilters) => void;
  onSaveConfig: (
    configId: string | null,
    input: VoiceConfigInput,
  ) => Promise<VoiceConfig | null | undefined>;
  onLoadCalls: (filters?: VoiceCallFilters) => void;
  onSelectCall: (id: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onRequestHandoff: () => void;
  onRouteCall: (
    action: "transfer" | "voicemail" | "close",
    options?: { transferTo?: string; reason?: string },
  ) => void;
  onUpdateStatus: (status: VoiceCall["status"]) => void;
  onAssignCall: (assignedAgentId: string | null) => void;
}) {
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(
    configs[0]?.id ?? null,
  );
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);
  const selectedConfig = isCreatingConfig
    ? null
    : (configs.find((config) => config.id === selectedConfigId) ??
      configs[0] ??
      null);
  const editorKey = selectedConfig?.id ?? "new";
  const [editor, setEditor] = useState<{
    key: string;
    draft: ConfigDraft;
  } | null>(null);
  const draft =
    editor?.key === editorKey
      ? editor.draft
      : selectedConfig
        ? draftFromConfig(selectedConfig)
        : { ...emptyDraft, businessDays: [...emptyDraft.businessDays] };
  const [routeEditor, setRouteEditor] = useState({
    callId: "",
    transferTo: "",
    reason: "",
  });
  const transferTo =
    routeEditor.callId === selectedCall?.id ? routeEditor.transferTo : "";
  const routeReason =
    routeEditor.callId === selectedCall?.id ? routeEditor.reason : "";

  const eligibleAgents = useMemo(
    () =>
      users.filter(
        (candidate) =>
          candidate.isActive !== false &&
          candidate.roles.some((role) => role === "agent" || role === "org_admin"),
      ),
    [users],
  );
  const totalPages = calls ? Math.max(1, Math.ceil(calls.total / calls.limit)) : 1;

  async function submitConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSaveConfig(
      selectedConfig?.id ?? null,
      buildConfigInput(draft, selectedConfig ?? undefined),
    );
    if (saved) {
      setSelectedConfigId(saved.id);
      setIsCreatingConfig(false);
      setEditor(null);
    }
  }

  function selectConfig(config: VoiceConfig) {
    setSelectedConfigId(config.id);
    setIsCreatingConfig(false);
    setEditor(null);
  }

  function newConfig() {
    setSelectedConfigId(null);
    setIsCreatingConfig(true);
    setEditor({
      key: "new",
      draft: { ...emptyDraft, businessDays: [...emptyDraft.businessDays] },
    });
  }

  function update<K extends keyof ConfigDraft>(key: K, value: ConfigDraft[K]) {
    setEditor({ key: editorKey, draft: { ...draft, [key]: value } });
  }

  const callbackRoot = selectedConfig
    ? `${apiBaseUrl}/voice-receptionist/webhook/${selectedConfig.id}/twilio`
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[470px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
              <div>
                <h2 className="font-semibold">Receptionist configurations</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {configs.length} configured
                </p>
              </div>
              {canConfigure ? (
                <button type="button" onClick={newConfig} className="h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]">
                  New
                </button>
              ) : null}
            </div>
            <div className="max-h-52 overflow-auto">
              {configs.map((config) => (
                <button
                  key={config.id}
                  type="button"
                  onClick={() => selectConfig(config)}
                  className={`flex w-full items-center justify-between border-b border-[var(--border-subtle)] p-3 text-left hover:bg-[var(--surface-hover)] ${
                    selectedConfigId === config.id ? "bg-[var(--surface-accent)]" : ""
                  }`}
                >
                  <span>
                    <span className="block text-sm font-medium">{config.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {config.provider} · {config.phoneNumber ?? config.sipDomain ?? "No endpoint"}
                    </span>
                  </span>
                  <StatusPill status={config.status} />
                </button>
              ))}
              {!configs.length ? <EmptyState>No voice config yet.</EmptyState> : null}
            </div>
          </Card>

          <form onSubmit={submitConfig}>
            <Card>
              <div className="border-b border-[var(--border-subtle)] p-4">
                <h2 className="font-semibold">
                  {selectedConfig ? `Edit ${selectedConfig.name}` : "New receptionist"}
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Secrets left blank are preserved when editing.
                </p>
              </div>
              <fieldset disabled={!canConfigure} className="space-y-4 p-4 disabled:opacity-70">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name">
                    <input className="input" required value={draft.name} onChange={(event) => update("name", event.target.value)} />
                  </Field>
                  <Field label="Status">
                    <select className="input" value={draft.status} onChange={(event) => update("status", event.target.value as VoiceConfig["status"])}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Provider">
                    <select className="input" value={draft.provider} onChange={(event) => update("provider", event.target.value as VoiceConfig["provider"])}>
                      <option value="twilio">Twilio</option>
                      <option value="sip">SIP</option>
                      <option value="custom">Custom</option>
                    </select>
                  </Field>
                  <Field label="Default locale">
                    <input className="input" placeholder="en-US" value={draft.defaultLocale} onChange={(event) => update("defaultLocale", event.target.value)} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone number">
                    <input className="input" placeholder="+919876543210" value={draft.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} />
                  </Field>
                  <Field label="SIP domain">
                    <input className="input" value={draft.sipDomain} onChange={(event) => update("sipDomain", event.target.value)} />
                  </Field>
                </div>

                <details open={!selectedConfig} className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Credentials and Twilio</summary>
                  <div className="mt-3 space-y-3">
                    <Field label="Twilio Account SID">
                      <input className="input" placeholder="AC…" value={draft.twilioAccountSid} onChange={(event) => update("twilioAccountSid", event.target.value)} />
                    </Field>
                    <Field label="Twilio auth token / provider key">
                      <input type="password" className="input" placeholder={selectedConfig?.hasApiKey ? "Configured — leave blank to preserve" : "Required for live Twilio"} value={draft.apiKey} onChange={(event) => update("apiKey", event.target.value)} />
                    </Field>
                    <Field label="Generic webhook verification token">
                      <input type="password" className="input" placeholder={selectedConfig?.hasWebhookVerifyToken ? "Configured — leave blank to preserve" : "Optional"} value={draft.webhookVerifyToken} onChange={(event) => update("webhookVerifyToken", event.target.value)} />
                    </Field>
                  </div>
                </details>

                <details open className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Speech and streaming</summary>
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="STT provider">
                        <select className="input" value={draft.sttProvider} onChange={(event) => update("sttProvider", event.target.value)}>
                          <option value="deepgram">Deepgram</option>
                          <option value="google">Google</option>
                          <option value="">Provider default</option>
                        </select>
                      </Field>
                      <Field label="STT model">
                        <input className="input" placeholder="nova-3-general" value={draft.sttModel} onChange={(event) => update("sttModel", event.target.value)} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="TTS provider">
                        <select className="input" value={draft.ttsProvider} onChange={(event) => update("ttsProvider", event.target.value)}>
                          <option value="amazon">Amazon</option>
                          <option value="google">Google</option>
                          <option value="elevenlabs">ElevenLabs</option>
                          <option value="twilio">Twilio/Amazon alias</option>
                        </select>
                      </Field>
                      <Field label="TTS voice">
                        <input className="input" placeholder="Joanna-Neural" value={draft.ttsVoice} onChange={(event) => update("ttsVoice", event.target.value)} />
                      </Field>
                    </div>
                    <Field label="ConversationRelay WSS URL (optional per-config override)">
                      <input className="input" placeholder="wss://api.example.com/api/v1/voice-receptionist/stream/…" value={draft.conversationRelayUrl} onChange={(event) => update("conversationRelayUrl", event.target.value)} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Relay transcription provider">
                        <select className="input" value={draft.conversationRelayTranscriptionProvider} onChange={(event) => update("conversationRelayTranscriptionProvider", event.target.value)}>
                          <option value="Deepgram">Deepgram</option>
                          <option value="Google">Google</option>
                        </select>
                      </Field>
                      <Field label="Relay speech model">
                        <input className="input" placeholder="nova-3-general" value={draft.conversationRelaySpeechModel} onChange={(event) => update("conversationRelaySpeechModel", event.target.value)} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Relay TTS provider">
                        <select className="input" value={draft.conversationRelayTtsProvider} onChange={(event) => update("conversationRelayTtsProvider", event.target.value)}>
                          <option value="Amazon">Amazon</option>
                          <option value="Google">Google</option>
                          <option value="ElevenLabs">ElevenLabs</option>
                        </select>
                      </Field>
                      <Field label="Relay voice">
                        <input className="input" value={draft.conversationRelayVoice} onChange={(event) => update("conversationRelayVoice", event.target.value)} />
                      </Field>
                    </div>
                  </div>
                </details>

                <details open className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Messages and human transfer</summary>
                  <div className="mt-3 space-y-3">
                    <Field label="Greeting"><textarea className="input min-h-20" value={draft.greeting} onChange={(event) => update("greeting", event.target.value)} /></Field>
                    <Field label="AI error fallback"><textarea className="input min-h-20" value={draft.errorMessage} onChange={(event) => update("errorMessage", event.target.value)} /></Field>
                    <Field label="After-hours message"><textarea className="input min-h-20" value={draft.afterHoursMessage} onChange={(event) => update("afterHoursMessage", event.target.value)} /></Field>
                    <Field label="Default transfer number"><input className="input" placeholder="+919876543210" value={draft.transferPhoneNumber} onChange={(event) => update("transferPhoneNumber", event.target.value)} /></Field>
                  </div>
                </details>

                <details className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Business hours and holidays</summary>
                  <div className="mt-3 space-y-3">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.businessHoursEnabled} onChange={(event) => update("businessHoursEnabled", event.target.checked)} /> Enforce business hours</label>
                    <Field label="IANA timezone"><input className="input" value={draft.timezone} onChange={(event) => update("timezone", event.target.value)} /></Field>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map(([day, label]) => (
                        <label key={day} className="flex items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 text-xs">
                          <input type="checkbox" checked={draft.businessDays.includes(day)} onChange={(event) => update("businessDays", event.target.checked ? [...draft.businessDays, day].sort() : draft.businessDays.filter((item) => item !== day))} /> {label}
                        </label>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Opens"><input type="time" className="input" value={draft.startTime} onChange={(event) => update("startTime", event.target.value)} /></Field>
                      <Field label="Closes"><input type="time" className="input" value={draft.endTime} onChange={(event) => update("endTime", event.target.value)} /></Field>
                    </div>
                    <Field label="Holidays (YYYY-MM-DD, comma separated)"><textarea className="input min-h-20" value={draft.holidays} onChange={(event) => update("holidays", event.target.value)} /></Field>
                  </div>
                </details>

                <details className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Keyword and keypad routing</summary>
                  <div className="mt-3 space-y-3">
                    <Field label="Keyword routes — one keyword=+number per line"><textarea className="input min-h-28 font-mono text-xs" placeholder={"sales=+919800000001\nsupport=+919800000002"} value={draft.routingKeywords} onChange={(event) => update("routingKeywords", event.target.value)} /></Field>
                    <Field label="DTMF routes — digit=Department|+number"><textarea className="input min-h-28 font-mono text-xs" placeholder={"1=Sales|+919800000001\n0=+919800000000"} value={draft.dtmfRoutes} onChange={(event) => update("dtmfRoutes", event.target.value)} /></Field>
                  </div>
                </details>

                <details className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Voicemail and notifications</summary>
                  <div className="mt-3 space-y-3">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.voicemailEnabled} onChange={(event) => update("voicemailEnabled", event.target.checked)} /> Enable voicemail fallback</label>
                    <Field label="Voicemail prompt"><textarea className="input min-h-20" value={draft.voicemailPrompt} onChange={(event) => update("voicemailPrompt", event.target.value)} /></Field>
                    <Field label="Maximum recording seconds (10–600)"><input type="number" min={10} max={600} className="input" value={draft.voicemailMaxLengthSeconds} onChange={(event) => update("voicemailMaxLengthSeconds", event.target.value)} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Handoff email"><input type="email" className="input" value={draft.handoffNotificationEmail} onChange={(event) => update("handoffNotificationEmail", event.target.value)} /></Field>
                      <Field label="Handoff phone"><input className="input" placeholder="+91…" value={draft.handoffNotificationPhone} onChange={(event) => update("handoffNotificationPhone", event.target.value)} /></Field>
                      <Field label="Voicemail email"><input type="email" className="input" value={draft.voicemailNotificationEmail} onChange={(event) => update("voicemailNotificationEmail", event.target.value)} /></Field>
                      <Field label="Voicemail phone"><input className="input" placeholder="+91…" value={draft.voicemailNotificationPhone} onChange={(event) => update("voicemailNotificationPhone", event.target.value)} /></Field>
                    </div>
                  </div>
                </details>

                <details className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Advanced callback overrides</summary>
                  <div className="mt-3 space-y-3">
                    {([
                      ["twilioGatherUrl", "Gather callback"],
                      ["twilioDialCallbackUrl", "Dial callback"],
                      ["twilioRecordingCallbackUrl", "Recording callback"],
                      ["twilioConversationRelayCallbackUrl", "ConversationRelay action callback"],
                    ] as const).map(([key, label]) => (
                      <Field key={key} label={label}><input className="input" placeholder="https://…" value={draft[key]} onChange={(event) => update(key, event.target.value)} /></Field>
                    ))}
                  </div>
                </details>

                {canConfigure ? <button className="h-10 w-full rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)]">{selectedConfig ? "Update configuration" : "Create configuration"}</button> : <p className="text-sm text-[var(--text-muted)]">You have read-only Voice access.</p>}
              </fieldset>
            </Card>
          </form>

          {selectedConfig && callbackRoot ? (
            <Card>
              <div className="border-b border-[var(--border-subtle)] p-4"><h2 className="font-semibold">Twilio endpoints</h2></div>
              <div className="space-y-3 p-4 text-xs">
                <Endpoint label="Incoming call" value={`${callbackRoot}/incoming`} />
                <Endpoint label="Status callback" value={`${callbackRoot}/status`} />
                <Endpoint label="ConversationRelay action" value={`${callbackRoot}/relay`} />
                <Endpoint label="WebSocket" value={draft.conversationRelayUrl || `${apiBaseUrl.replace(/^http/, "ws")}/voice-receptionist/stream/${selectedConfig.id} (server default may differ)`} />
                <div className="flex flex-wrap gap-2">
                  <StatusPill status={selectedConfig.hasApiKey ? "credentials ready" : "missing credentials"} />
                  <StatusPill status={draft.conversationRelayUrl ? "stream configured" : "server default"} />
                  <StatusPill status={selectedConfig.voicemailEnabled ? "voicemail" : "no voicemail"} />
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[370px_minmax(0,1fr)]">
          <Card>
            <div className="border-b border-[var(--border-subtle)] p-4">
              <div className="flex items-center justify-between"><h2 className="font-semibold">Voice calls</h2><span className="text-xs text-[var(--text-muted)]">Auto-refresh 10s</span></div>
              <div className="mt-3 grid grid-cols-[1fr_140px] gap-2">
                <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })} placeholder="Caller, number, or call ID" className="input" />
                <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })} className="input">
                  <option value="">All statuses</option>
                  {(["ringing", "in_progress", "waiting_for_agent", "transferred", "voicemail", "completed", "failed"] as const).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                </select>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_90px] gap-2">
                <button type="button" onClick={() => onLoadCalls({ ...filters, page: 1 })} className="h-9 rounded-md bg-[var(--surface-tint)] text-sm hover:bg-[var(--surface-hover)]">Apply filters</button>
                <select value={filters.limit} onChange={(event) => onLoadCalls({ ...filters, page: 1, limit: Number(event.target.value) })} className="input" aria-label="Calls per page"><option value={10}>10</option><option value={30}>30</option><option value={50}>50</option><option value={100}>100</option></select>
              </div>
            </div>
            <div className="max-h-[720px] overflow-auto">
              {calls?.data.map((call) => (
                <button key={call.id} onClick={() => onSelectCall(call.id)} className={`block w-full border-b border-[var(--border-subtle)] p-4 text-left hover:bg-[var(--surface-hover)] ${selectedCall?.id === call.id ? "bg-[var(--surface-accent)]" : ""}`}>
                  <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{call.callerName ?? call.fromNumber ?? call.providerCallId}</span><StatusPill status={call.status} /></div>
                  <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{call.events.at(-1)?.content ?? "No transcript yet"}</p>
                  <div className="mt-2 flex justify-between text-xs text-[var(--text-soft)]"><span>{formatDateTime(call.lastEventAt)}</span><span>{formatDuration(call.durationSeconds)}</span></div>
                </button>
              ))}
              {!calls?.data.length ? <EmptyState>No calls match these filters.</EmptyState> : null}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] p-3 text-xs">
              <button disabled={filters.page <= 1} onClick={() => onLoadCalls({ ...filters, page: filters.page - 1 })} className="h-9 rounded-md border border-[var(--border-strong)] px-3 disabled:opacity-40">Previous</button>
              <span>Page {calls?.page ?? filters.page} of {totalPages} · {calls?.total ?? 0} calls</span>
              <button disabled={filters.page >= totalPages} onClick={() => onLoadCalls({ ...filters, page: filters.page + 1 })} className="h-9 rounded-md border border-[var(--border-strong)] px-3 disabled:opacity-40">Next</button>
            </div>
          </Card>

          <Card>
            {selectedCall ? (
              <div className="min-w-0">
                <div className="border-b border-[var(--border-subtle)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h2 className="font-semibold">{selectedCall.callerName ?? "Voice caller"}</h2><p className="text-xs text-[var(--text-muted)]">{selectedCall.fromNumber ?? selectedCall.providerCallId} → {selectedCall.toNumber ?? "Unknown destination"}</p></div>
                    <StatusPill status={selectedCall.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                    <CallMetric label="Started" value={formatDateTime(selectedCall.startedAt)} />
                    <CallMetric label="Duration" value={formatDuration(selectedCall.durationSeconds)} />
                    <CallMetric label="Locale" value={selectedCall.locale} />
                    <CallMetric label="Events" value={String(selectedCall.events.length)} />
                  </div>
                </div>

                <div className="space-y-3 border-b border-[var(--border-subtle)] p-4">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {canManageAgents ? (
                      <Field label="Assigned agent">
                        <select className="input" value={selectedCall.assignedAgentId ?? ""} onChange={(event) => onAssignCall(event.target.value || null)}>
                          <option value="">Unassigned</option>
                          {eligibleAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name ?? agent.email}</option>)}
                        </select>
                      </Field>
                    ) : <CallMetric label="Assigned agent" value={users.find((item) => item.id === selectedCall.assignedAgentId)?.name ?? selectedCall.assignedAgentId ?? "Unassigned"} />}
                    <Field label="Internal status">
                      <select className="input" value={selectedCall.status} onChange={(event) => onUpdateStatus(event.target.value as VoiceCall["status"])}>
                        {(["ringing", "in_progress", "waiting_for_agent", "transferred", "voicemail", "completed", "failed"] as const).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Field label="Transfer destination override"><input className="input" placeholder="Use config default" value={transferTo} onChange={(event) => setRouteEditor({ callId: selectedCall.id, transferTo: event.target.value, reason: routeReason })} /></Field>
                    <Field label="Routing reason"><input className="input" placeholder="Optional audit note" value={routeReason} onChange={(event) => setRouteEditor({ callId: selectedCall.id, transferTo, reason: event.target.value })} /></Field>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={onRequestHandoff} className="h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]">Handoff</button>
                    <button onClick={() => onRouteCall("transfer", { ...(transferTo ? { transferTo } : {}), ...(routeReason ? { reason: routeReason } : {}) })} className="h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]">Transfer</button>
                    <button onClick={() => onRouteCall("voicemail", routeReason ? { reason: routeReason } : undefined)} className="h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)]">Voicemail</button>
                    <button onClick={() => onRouteCall("close", { reason: routeReason || "Closed by operator" })} className="h-9 rounded-md bg-[var(--danger-bg)] px-3 text-sm text-[var(--danger-text)]">End live call</button>
                  </div>
                </div>

                {selectedCall.recordingUrl ? (
                  <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-tint)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-medium">Voicemail recording</p><p className="text-xs text-[var(--text-muted)]">{formatDuration(selectedCall.recordingDurationSeconds)} · {selectedCall.recordingSid}</p></div><a href={selectedCall.recordingUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent-primary)] underline">Open recording</a></div>
                    <audio controls preload="none" className="mt-3 w-full" src={selectedCall.recordingUrl}>Your browser does not support audio playback.</audio>
                  </div>
                ) : null}

                <div className="max-h-[620px] space-y-3 overflow-auto bg-[var(--surface-card)] p-4">
                  {selectedCall.events.map((event) => <VoiceEventBubble key={event.id} event={event} />)}
                </div>
                <form onSubmit={onSendMessage} className="border-t border-[var(--border-subtle)] p-4">
                  <textarea name="reply" rows={3} className="input min-h-24 resize-y" placeholder="Speak a live agent message" required />
                  <div className="mt-3 flex justify-between gap-3"><p className="text-xs text-[var(--text-muted)]">On live Twilio calls this updates the active call TwiML.</p><button className="h-10 rounded-md bg-[var(--accent-secondary)] px-4 text-sm font-medium text-[var(--text-on-accent)]">Speak message</button></div>
                </form>
                <details className="border-t border-[var(--border-subtle)] p-4 text-xs"><summary className="cursor-pointer font-medium">Call metadata</summary><pre className="mt-2 overflow-auto rounded-md bg-[var(--surface-tint)] p-3">{JSON.stringify(selectedCall.metadata, null, 2)}</pre></details>
              </div>
            ) : <EmptyState>Select a call to inspect its transcript and controls.</EmptyState>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Endpoint({ label, value }: { label: string; value: string }) {
  return <div><p className="font-medium text-[var(--text-muted)]">{label}</p><code className="mt-1 block overflow-auto rounded-md bg-[var(--surface-tint)] p-2 text-[var(--text-strong)]">{value}</code></div>;
}

function CallMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-[var(--surface-tint)] p-2"><p className="text-[var(--text-muted)]">{label}</p><p className="mt-1 truncate font-medium text-[var(--text-strong)]">{value}</p></div>;
}

function VoiceEventBubble({ event }: { event: VoiceCallEvent }) {
  const isCaller = event.role === "caller";
  const isAgent = event.role === "agent";
  const isInterrupt = event.type === "barge_in";
  return (
    <div className={`max-w-[88%] rounded-lg border p-3 ${isInterrupt ? "mx-auto border-[var(--warning-text)] bg-[var(--warning-bg)]" : isCaller ? "ml-auto border-[var(--accent-primary)] bg-[var(--surface-accent)]" : isAgent ? "border-[var(--accent-secondary)] bg-[var(--success-bg)]" : "border-[var(--border-subtle)] bg-[var(--surface-card)]"}`}>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-medium uppercase text-[var(--text-muted)]"><span>{isInterrupt ? "Caller interrupted" : event.role}</span><span>{event.type.replaceAll("_", " ")}</span></div>
      <p className="whitespace-pre-wrap text-sm leading-6">{event.content ?? (isInterrupt ? "Speech interrupted active playback" : "No content")}</p>
      {event.audioUrl ? <audio controls preload="none" className="mt-2 w-full" src={event.audioUrl} /> : null}
      {event.confidence !== undefined && event.confidence !== null ? <p className="mt-1 text-xs text-[var(--text-soft)]">Confidence {(event.confidence * 100).toFixed(0)}%</p> : null}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[var(--text-soft)]"><span>{formatDateTime(event.createdAt)}</span>{Object.keys(event.metadata).length ? <details><summary className="cursor-pointer">Metadata</summary><pre className="mt-2 max-w-sm overflow-auto rounded bg-[var(--surface-tint)] p-2 normal-case">{JSON.stringify(event.metadata, null, 2)}</pre></details> : null}</div>
    </div>
  );
}
