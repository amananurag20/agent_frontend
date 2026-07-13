"use client";

import {
  Check,
  CheckCircle2,
  Clipboard,
  Code2,
  ExternalLink,
  Globe2,
  MessageCircle,
  Palette,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { Conversation, FormHandler, WidgetConfig } from "@/lib/types";
import { Field, StatusPill } from "./ui";

type WidgetPosition = "bottom-right" | "bottom-left";

type WidgetAppearance = {
  assistantName: string;
  primaryColor: string;
  launcherLabel: string;
  position: WidgetPosition;
};

export function WidgetView({
  config,
  onSubmit,
  testConversation,
  onSendTestMessage,
  onResetTestChat,
  apiBaseUrl,
}: {
  config: WidgetConfig | null;
  onSubmit: FormHandler;
  testConversation: Conversation | null;
  onSendTestMessage: FormHandler;
  onResetTestChat: () => void;
  apiBaseUrl: string;
}) {
  const [copied, setCopied] = useState<"key" | "snippet" | null>(null);
  const appearance = useMemo(() => readAppearance(config?.settings), [config]);
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
  const isReady = Boolean(config?.enabled && config.widgetKey);

  async function copy(value: string, type: "key" | "snippet") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-accent)] text-[var(--accent-primary)]">
            <MessageCircle size={21} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-[var(--text-strong)]">
                Website assistant
              </h2>
              <StatusPill status={isReady ? "active" : "disabled"} />
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Configure, test and install the customer-facing AI chat widget.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-3 py-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-soft)]">
              Widget key
            </p>
            <p className="max-w-72 truncate font-mono text-xs text-[var(--text-base)]">
              {config?.widgetKey ?? "Loading configuration"}
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-hover-strong)] hover:text-[var(--text-strong)] disabled:opacity-40"
            title="Copy widget key"
            disabled={!config?.widgetKey}
            onClick={() => config?.widgetKey && copy(config.widgetKey, "key")}
          >
            {copied === "key" ? <Check size={16} /> : <Clipboard size={16} />}
          </button>
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
                icon={ShieldCheck}
                title="Domain access"
                description="Only these exact website origins may start conversations."
              />
              <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                <Field label="Allowed website origins">
                  <textarea
                    key={`${config?.widgetKey}-domains`}
                    name="allowedDomains"
                    rows={3}
                    defaultValue={config?.allowedDomains.join("\n")}
                    className="input resize-y font-mono text-xs"
                    placeholder={"https://example.com\nhttps://www.example.com"}
                  />
                </Field>
                <button className="h-10 rounded-md bg-[var(--accent-primary)] px-5 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
                  Save changes
                </button>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-soft)]">
                <Globe2 size={13} /> Include the protocol and development port. One
                origin per line.
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
