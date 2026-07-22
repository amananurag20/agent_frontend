"use client";

import {
  AlertTriangle,
  BellRing,
  Bold,
  CalendarOff,
  Clock,
  Italic,
  Link2,
  List,
  ListOrdered,
  Mail,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Underline,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import type {
  AppointmentBlackout,
  AppointmentDeadLetters,
  AppointmentPolicy,
  AppointmentService,
  AppointmentStaff,
  AppointmentWaitlistEntry,
  FormHandler,
} from "@/lib/types";
import { EmptyState, Field, StatusPill } from "./ui";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function minutesLabel(value: number) {
  if (!value) return "No minimum";
  if (value % 1440 === 0) return `${value / 1440} day${value === 1440 ? "" : "s"}`;
  if (value % 60 === 0) return `${value / 60} hour${value === 60 ? "" : "s"}`;
  return `${value} minutes`;
}

type DurationUnit = "minutes" | "hours" | "days";

const durationMultipliers: Record<DurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
};

function initialDurationValue(minutes: number): { amount: number; unit: DurationUnit } {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return { amount: minutes / 1440, unit: "days" };
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return { amount: minutes / 60, unit: "hours" };
  }
  return { amount: minutes, unit: "minutes" };
}

function PolicyDurationField({
  name,
  label,
  description,
  initialMinutes,
  minMinutes,
  maxMinutes,
  zeroLabel = "No minimum notice",
}: {
  name: string;
  label: string;
  description: string;
  initialMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  zeroLabel?: string;
}) {
  const initial = initialDurationValue(initialMinutes);
  const [amount, setAmount] = useState(initial.amount);
  const [unit, setUnit] = useState<DurationUnit>(initial.unit);
  const totalMinutes = Math.round(amount * durationMultipliers[unit]);

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <input type="hidden" name={name} value={totalMinutes} />
      <p className="text-sm font-medium text-[var(--text-strong)]">{label}</p>
      <p className="mt-1 min-h-10 text-xs leading-5 text-[var(--text-muted)]">{description}</p>
      <div className="mt-3 grid grid-cols-[minmax(70px,0.8fr)_minmax(110px,1.2fr)] gap-2">
        <input
          type="number"
          min={Math.ceil(minMinutes / durationMultipliers[unit])}
          max={Math.floor(maxMinutes / durationMultipliers[unit])}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          aria-label={`${label} amount`}
          className="input"
          required
        />
        <select
          value={unit}
          onChange={(event) => setUnit(event.target.value as DurationUnit)}
          aria-label={`${label} unit`}
          className="input"
        >
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
          <option value="days">Days</option>
        </select>
      </div>
      <p className="mt-2 text-xs font-medium text-[var(--accent-primary)]">
        {totalMinutes === 0 ? zeroLabel : minutesLabel(totalMinutes)}
      </p>
    </div>
  );
}

function QuietHoursSettings({
  enabled: initialEnabled,
  start,
  end,
  timezone: initialTimezone,
}: {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [timezone, setTimezone] = useState(initialTimezone);
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 sm:p-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          name="quietHoursEnabled"
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--accent-primary)]"
        />
        <span>
          <span className="block text-sm font-medium text-[var(--text-strong)]">Respect customer-friendly sending hours</span>
          <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">Move scheduled reminders outside this period. Booking confirmations are always sent immediately.</span>
        </span>
      </label>
      <div className={enabled ? "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3" : "hidden"}>
        <Field label="Do not send after">
          <input name="quietHoursStart" type="time" defaultValue={start} className="input" required />
        </Field>
        <Field label="Resume sending at">
          <input name="quietHoursEnd" type="time" defaultValue={end} className="input" required />
        </Field>
        <Field label="Timezone for these hours">
          <div className="flex gap-2">
            <input name="quietHoursTimezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} className="input min-w-0" required />
            {timezone !== browserTimezone ? (
              <button type="button" onClick={() => setTimezone(browserTimezone)} className="shrink-0 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--surface-tint)]">Use mine</button>
            ) : null}
          </div>
        </Field>
      </div>
      {!enabled ? (
        <>
          <input type="hidden" name="quietHoursStart" value={start} />
          <input type="hidden" name="quietHoursEnd" value={end} />
          <input type="hidden" name="quietHoursTimezone" value={timezone} />
        </>
      ) : null}
    </div>
  );
}

function NotificationChannelSettings({
  enabledChannels,
  readiness,
}: {
  enabledChannels: AppointmentPolicy["reminderChannels"];
  readiness?: AppointmentPolicy["notificationReadiness"];
}) {
  const channels = [
    {
      id: "email" as const,
      label: "Email",
      description: "Send confirmations and reminders to the customer’s email address.",
      setup: "Requires SMTP email setup by the platform administrator.",
      icon: Mail,
    },
    {
      id: "sms" as const,
      label: "SMS",
      description: "Send concise updates to the customer’s mobile number.",
      setup: "Requires a configured Twilio SMS sender.",
      icon: MessageSquare,
    },
    {
      id: "whatsapp" as const,
      label: "WhatsApp",
      description: "Send reminders through the organization’s WhatsApp number.",
      setup: "Requires an active WhatsApp provider connection.",
      icon: MessageCircle,
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[var(--text-strong)]">Where should notifications be sent?</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Enable only the channels you actively use. A notification is skipped when the booking does not include the required email address or phone number.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {channels.map((channel) => {
          const Icon = channel.icon;
          return (
            <label key={channel.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4 hover:border-[var(--accent-primary)]">
              <input
                type="checkbox"
                name="reminderChannels"
                value={channel.id}
                defaultChecked={enabledChannels.includes(channel.id)}
                className="mt-1 h-4 w-4 accent-[var(--accent-primary)]"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--text-strong)]">
                  <Icon size={16} className="text-[var(--accent-primary)]" />{channel.label}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${readiness?.[channel.id] ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {readiness?.[channel.id] ? "Ready" : "Setup required"}
                  </span>
                </span>
                <span className="mt-2 block text-xs leading-5 text-[var(--text-muted)]">{channel.description}</span>
                <span className="mt-2 block text-[11px] leading-4 text-[var(--text-soft)]">{channel.setup}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ChannelTemplateTabs({ policy }: { policy: AppointmentPolicy }) {
  const [activeChannel, setActiveChannel] = useState<"email" | "sms" | "whatsapp">("email");
  const tabs = [
    { id: "email" as const, label: "Email", icon: Mail },
    { id: "sms" as const, label: "SMS", icon: MessageSquare },
    { id: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle },
  ];
  const confirmationFallback =
    policy.reminderTemplates.confirmation ??
    "Your {{serviceName}} appointment is confirmed for {{startTime}}.";
  const reminderFallback =
    policy.reminderTemplates.reminder ??
    "Reminder: {{serviceName}} with {{staffName}} at {{startTime}}.";

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border-subtle)]">
      <div className="flex overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeChannel === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveChannel(tab.id)}
              className={`inline-flex h-10 min-w-32 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition ${selected ? "bg-[var(--surface-card)] text-[var(--text-strong)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-strong)]"}`}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-5">
        <div className={activeChannel === "email" ? "space-y-4" : "hidden"}>
            <div>
              <h5 className="text-sm font-semibold text-[var(--text-strong)]">Email content</h5>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Set the subject, accessible plain-text fallback and optional formatted design.</p>
            </div>
            <Field label="Subject line">
              <input name="emailSubjectTemplate" defaultValue={policy.reminderTemplates.emailSubject ?? "Appointment: {{serviceName}}"} className="input" placeholder="Appointment: {{serviceName}}" />
            </Field>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Field label="Confirmation email text">
                <textarea name="emailConfirmationTemplate" rows={4} maxLength={5000} defaultValue={policy.reminderTemplates.emailConfirmation ?? confirmationFallback} className="input resize-y" />
              </Field>
              <Field label="Reminder email text">
                <textarea name="emailReminderTemplate" rows={4} maxLength={5000} defaultValue={policy.reminderTemplates.emailReminder ?? reminderFallback} className="input resize-y" />
              </Field>
            </div>
            <details className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)]">
              <summary className="cursor-pointer list-none px-4 py-4 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-strong)]">Formatted email design</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Add headings, emphasis, lists, links and booking details.</p>
                  </div>
                  <span className="text-xs font-medium text-[var(--accent-primary)] group-open:hidden">Open editor</span>
                  <span className="hidden text-xs font-medium text-[var(--accent-primary)] group-open:inline">Hide editor</span>
                </div>
              </summary>
              <div className="space-y-6 border-t border-[var(--border-subtle)] p-4">
                <RichEmailEditor name="confirmationEmailHtml" label="Confirmation email" initialHtml={policy.reminderTemplates.confirmationEmailHtml} />
                <RichEmailEditor name="reminderEmailHtml" label="Reminder email" initialHtml={policy.reminderTemplates.reminderEmailHtml} />
                <p className="text-xs leading-5 text-[var(--text-muted)]">Images, scripts and custom tracking code are blocked for safety.</p>
              </div>
            </details>
        </div>

        <div className={activeChannel === "sms" ? "space-y-4" : "hidden"}>
            <div>
              <h5 className="text-sm font-semibold text-[var(--text-strong)]">SMS content</h5>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Keep messages concise. Longer text may be delivered as multiple SMS segments.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Field label="Booking confirmation SMS">
                <textarea name="smsConfirmationTemplate" rows={5} maxLength={1600} defaultValue={policy.reminderTemplates.smsConfirmation ?? confirmationFallback} className="input resize-y" />
              </Field>
              <Field label="Appointment reminder SMS">
                <textarea name="smsReminderTemplate" rows={5} maxLength={1600} defaultValue={policy.reminderTemplates.smsReminder ?? reminderFallback} className="input resize-y" />
              </Field>
            </div>
            <p className="text-xs text-[var(--text-soft)]">Booking details such as {"{{customerName}}"}, {"{{serviceName}}"}, {"{{startTime}}"} and {"{{staffName}}"} are replaced automatically.</p>
        </div>

        <div className={activeChannel === "whatsapp" ? "space-y-4" : "hidden"}>
            <div>
              <h5 className="text-sm font-semibold text-[var(--text-strong)]">WhatsApp content</h5>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Used for Twilio WhatsApp and as fallback content where free-form messages are supported.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Field label="Booking confirmation WhatsApp message">
                <textarea name="whatsappConfirmationTemplate" rows={5} maxLength={4096} defaultValue={policy.reminderTemplates.whatsappConfirmation ?? confirmationFallback} className="input resize-y" />
              </Field>
              <Field label="Appointment reminder WhatsApp message">
                <textarea name="whatsappReminderTemplate" rows={5} maxLength={4096} defaultValue={policy.reminderTemplates.whatsappReminder ?? reminderFallback} className="input resize-y" />
              </Field>
            </div>
            <details className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)]">
              <summary className="cursor-pointer list-none px-4 py-4 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-strong)]">Meta approved-template option</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Required only when your Meta connection sends an approved template.</p>
                  </div>
                  <span className="text-xs font-medium text-[var(--accent-primary)] group-open:hidden">Configure</span>
                  <span className="hidden text-xs font-medium text-[var(--accent-primary)] group-open:inline">Hide</span>
                </div>
              </summary>
              <div className="border-t border-[var(--border-subtle)] p-4">
                <Field label="Approved Meta template name">
                  <input name="whatsappTemplateName" defaultValue={policy.reminderTemplates.whatsappTemplateName ?? ""} className="input" placeholder="appointment_reminder" />
                </Field>
              </div>
            </details>
        </div>
      </div>
    </div>
  );
}

function reminderTimeLabel(value: number) {
  if (value % 10080 === 0) {
    const weeks = value / 10080;
    return `${weeks} week${weeks === 1 ? "" : "s"} before`;
  }
  if (value % 1440 === 0) {
    const days = value / 1440;
    return `${days} day${days === 1 ? "" : "s"} before`;
  }
  if (value % 60 === 0) {
    const hours = value / 60;
    return `${hours} hour${hours === 1 ? "" : "s"} before`;
  }
  return `${value} minute${value === 1 ? "" : "s"} before`;
}

function ReminderScheduleField({ initialMinutes }: { initialMinutes: number[] }) {
  const [reminders, setReminders] = useState(() =>
    [...new Set(initialMinutes)].sort((left, right) => right - left),
  );
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState<"minutes" | "hours" | "days" | "weeks">("days");
  const [error, setError] = useState<string | null>(null);

  const addReminder = () => {
    const multipliers = { minutes: 1, hours: 60, days: 1440, weeks: 10080 };
    const minutes = Math.floor(amount) * multipliers[unit];
    if (!Number.isFinite(minutes) || minutes < 1) {
      setError("Enter a reminder time greater than zero.");
      return;
    }
    if (minutes > 525600) {
      setError("Reminders can be scheduled up to one year before the appointment.");
      return;
    }
    if (reminders.length >= 20 && !reminders.includes(minutes)) {
      setError("You can add up to 20 reminder times.");
      return;
    }
    setReminders((current) =>
      [...new Set([...current, minutes])].sort((left, right) => right - left),
    );
    setError(null);
  };

  return (
    <div>
      <input type="hidden" name="reminderOffsetsMinutes" value={reminders.join(",")} />
      <div className="mb-2">
        <p className="text-sm font-medium text-[var(--text-base)]">Reminder timing</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Confirmation is sent immediately. Add any reminders customers should receive before the appointment.</p>
      </div>
      <div className="min-h-14 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-3">
        {reminders.length ? (
          <div className="flex flex-wrap gap-2">
            {reminders.map((minutes) => (
              <span key={minutes} className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] py-1.5 pl-3 pr-1.5 text-sm font-medium text-[var(--text-strong)]">
                <Clock className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                {reminderTimeLabel(minutes)}
                <button
                  type="button"
                  onClick={() => setReminders((current) => current.filter((value) => value !== minutes))}
                  aria-label={`Remove reminder ${reminderTimeLabel(minutes)}`}
                  className="grid h-6 w-6 place-items-center rounded-full text-[var(--text-soft)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)]"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="py-1 text-sm text-[var(--text-muted)]">No scheduled reminders. Customers will only receive the immediate confirmation.</p>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(80px,0.7fr)_minmax(140px,1fr)_auto]">
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          aria-label="Reminder amount"
          className="input"
        />
        <select
          value={unit}
          onChange={(event) => setUnit(event.target.value as typeof unit)}
          aria-label="Reminder unit"
          className="input"
        >
          <option value="minutes">Minutes before</option>
          <option value="hours">Hours before</option>
          <option value="days">Days before</option>
          <option value="weeks">Weeks before</option>
        </select>
        <button
          type="button"
          onClick={addReminder}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--surface-tint)]"
        >
          <Plus size={15} /> Add
        </button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-[var(--danger-text)]">{error}</p> : null}
    </div>
  );
}

const emailTemplateVariables = [
  "customerName",
  "serviceName",
  "staffName",
  "startTime",
  "partySize",
  "meetingDetails",
  "meetingUrl",
  "location",
  "preferencesUrl",
];

function sanitizeEditorHtml(value: string) {
  if (typeof window === "undefined") return "";
  const documentValue = new DOMParser().parseFromString(value, "text/html");
  const allowedTags = new Set([
    "P",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "H1",
    "H2",
    "H3",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "DIV",
    "SPAN",
    "A",
  ]);

  documentValue
    .querySelectorAll("script, style, iframe, object, embed, img, form, input, button")
    .forEach((element) => element.remove());
  Array.from(documentValue.body.querySelectorAll("*")).forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      if (element.tagName !== "A" || attribute.name !== "href") {
        element.removeAttribute(attribute.name);
      }
    });
    if (element.tagName === "A") {
      const href = element.getAttribute("href") ?? "";
      if (!/^(https?:|mailto:)/i.test(href)) element.removeAttribute("href");
    }
  });
  return documentValue.body.innerHTML;
}

function escapeEditorText(value: string) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML.replace(/\r?\n/g, "<br>");
}

function RichEmailEditor({
  name,
  label,
  initialHtml,
}: {
  name: string;
  label: string;
  initialHtml?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(initialHtml ?? "");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const sanitized = sanitizeEditorHtml(initialHtml ?? "");
    if (editorRef.current) editorRef.current.innerHTML = sanitized;
  }, [initialHtml]);

  const syncEditor = () => {
    if (!editorRef.current) return;
    const sanitized = sanitizeEditorHtml(editorRef.current.innerHTML);
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
    }
    setHtml(sanitized);
  };

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setHtml(editorRef.current?.innerHTML ?? "");
  };

  const insertLink = () => {
    const url = window.prompt("Enter an https:// or mailto: link");
    if (!url || !/^(https?:|mailto:)/i.test(url)) return;
    runCommand("createLink", url);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const clipboardHtml = event.clipboardData.getData("text/html");
    const safeHtml = clipboardHtml
      ? sanitizeEditorHtml(clipboardHtml)
      : escapeEditorText(event.clipboardData.getData("text/plain"));
    document.execCommand("insertHTML", false, safeHtml);
    setHtml(editorRef.current?.innerHTML ?? "");
  };

  const toolbarButton =
    "grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-[var(--text-base)]">{label}</label>
        <button
          type="button"
          onClick={() => setShowPreview((value) => !value)}
          className="text-xs font-medium text-[var(--accent-primary)]"
        >
          {showPreview ? "Continue editing" : "Preview email"}
        </button>
      </div>
      <input type="hidden" name={name} value={html} />
      {showPreview ? (
        <div className="min-h-44 rounded-xl border border-[var(--border-subtle)] bg-white p-5 text-sm text-slate-800 shadow-inner">
          {html ? (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeEditorHtml(html) }} />
          ) : (
            <p className="text-slate-500">No custom email design. The plain-text message will be used.</p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]">
          <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-2">
            <button type="button" title="Bold" aria-label="Bold" className={toolbarButton} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("bold")}><Bold size={15} /></button>
            <button type="button" title="Italic" aria-label="Italic" className={toolbarButton} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("italic")}><Italic size={15} /></button>
            <button type="button" title="Underline" aria-label="Underline" className={toolbarButton} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("underline")}><Underline size={15} /></button>
            <button type="button" title="Bulleted list" aria-label="Bulleted list" className={toolbarButton} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("insertUnorderedList")}><List size={15} /></button>
            <button type="button" title="Numbered list" aria-label="Numbered list" className={toolbarButton} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("insertOrderedList")}><ListOrdered size={15} /></button>
            <button type="button" title="Add link" aria-label="Add link" className={toolbarButton} onMouseDown={(event) => event.preventDefault()} onClick={insertLink}><Link2 size={15} /></button>
            <span className="mx-1 h-5 w-px bg-[var(--border-subtle)]" />
            <select
              aria-label="Text style"
              className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 text-xs text-[var(--text-base)]"
              defaultValue="p"
              onChange={(event) => runCommand("formatBlock", event.target.value)}
            >
              <option value="p">Paragraph</option>
              <option value="h2">Heading</option>
              <option value="h3">Subheading</option>
            </select>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={label}
            data-placeholder="Write the email customers will receive…"
            onInput={() => setHtml(editorRef.current?.innerHTML ?? "")}
            onBlur={syncEditor}
            onPaste={handlePaste}
            className="min-h-44 px-4 py-3 text-sm leading-6 text-[var(--text-strong)] outline-none empty:before:pointer-events-none empty:before:text-[var(--text-soft)] empty:before:content-[attr(data-placeholder)]"
          />
        </div>
      )}
      {!showPreview ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {emailTemplateVariables.map((variable) => (
            <button
              key={variable}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runCommand("insertText", `{{${variable}}}`)}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 py-1 font-mono text-[10px] text-[var(--text-muted)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
            >
              {`{{${variable}}}`}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppointmentBlockedTimes({
  blackouts,
  onDeleteBlackout,
}: {
  blackouts: AppointmentBlackout[];
  onDeleteBlackout: (id: string) => void;
}) {
  if (!blackouts.length) return null;

  return (
    <details className="group border-t border-[var(--border-subtle)] bg-[var(--surface-card-muted)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3">
          <CalendarOff className="h-5 w-5 text-[var(--accent-primary)]" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">Unavailable time</h3>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{blackouts.length} blocked period{blackouts.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-[var(--accent-primary)] group-open:hidden">View</span>
        <span className="hidden text-xs font-medium text-[var(--accent-primary)] group-open:inline">Hide</span>
      </summary>
      <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] bg-[var(--surface-card)]">
        {blackouts.map((blackout) => (
          <div key={blackout.id} className="flex items-center justify-between gap-4 px-5 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-strong)]">{blackout.name}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {formatDateTime(blackout.startAt)} – {formatDateTime(blackout.endAt)}
                {blackout.annual ? " · repeats every year" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDeleteBlackout(blackout.id)}
              aria-label={`Remove blocked time ${blackout.name}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}

export function AppointmentWaitlist({
  waitlist,
  services,
  staff,
}: {
  waitlist: AppointmentWaitlistEntry[];
  services: AppointmentService[];
  staff: AppointmentStaff[];
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-5 py-4">
        <div>
          <h3 className="font-semibold text-[var(--text-strong)]">Customers waiting for a place</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">When a matching place opens, the next customer is contacted automatically.</p>
        </div>
        <span className="rounded-full bg-[var(--surface-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
          {waitlist.length} waiting
        </span>
      </div>
      {waitlist.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">
              <tr>
                <th className="px-5 py-3 font-medium">Position</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Requested time</th>
                <th className="px-5 py-3 font-medium">Service</th>
                <th className="px-5 py-3 font-medium">Team member</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {waitlist.map((entry) => (
                <tr key={entry.id} className="hover:bg-[var(--surface-hover)]">
                  <td className="px-5 py-4 font-semibold text-[var(--text-strong)]">#{entry.position}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-[var(--text-strong)]">{entry.customerName}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{entry.customerEmail ?? entry.customerPhone ?? "No contact details"}</p>
                    {entry.partySize > 1 ? <p className="mt-1 text-xs text-[var(--text-muted)]">Party of {entry.partySize}</p> : null}
                  </td>
                  <td className="px-5 py-4 text-[var(--text-base)]">{formatDateTime(entry.startAt)}</td>
                  <td className="px-5 py-4 text-[var(--text-base)]">{services.find((item) => item.id === entry.serviceId)?.name ?? "Service"}</td>
                  <td className="px-5 py-4 text-[var(--text-base)]">{staff.find((item) => item.id === entry.staffId)?.name ?? "Unassigned"}</td>
                  <td className="px-5 py-4"><StatusPill status={entry.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>No customers are waiting right now.</EmptyState>
      )}
    </div>
  );
}

export function AppointmentOperations({
  policy,
  blackouts,
  waitlist,
  services,
  staff,
  onUpdatePolicy,
  onCreateBlackout,
  onDeleteBlackout,
}: {
  policy: AppointmentPolicy | null;
  blackouts: AppointmentBlackout[];
  waitlist: AppointmentWaitlistEntry[];
  services: AppointmentService[];
  staff: AppointmentStaff[];
  onUpdatePolicy: FormHandler;
  onCreateBlackout: FormHandler;
  onDeleteBlackout: (id: string) => void;
}) {
  const [editingPolicy, setEditingPolicy] = useState(false);

  return (
    <div className="space-y-6 p-5">
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-tint)] text-[var(--accent-primary)]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-strong)]">Booking policy</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Organization defaults; a service can override cancellation and rescheduling windows.
            </p>
          </div>
        </div>
        {policy && !editingPolicy ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-4 py-4 sm:px-5">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-strong)]">Current booking rules</h4>
                <p className="mt-1 text-xs text-[var(--text-muted)]">These defaults apply unless a service has its own cancellation or rescheduling rule.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPolicy(true)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--surface-hover)]"
              >
                <Pencil size={14} /> Edit booking rules
              </button>
            </div>
            <div className="grid grid-cols-1 divide-y divide-[var(--border-subtle)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
              <div className="p-4">
                <p className="text-xs text-[var(--text-muted)]">Customers can cancel</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{policy.cancellationWindowMinutes ? `${minutesLabel(policy.cancellationWindowMinutes)} before` : "Until the appointment starts"}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-[var(--text-muted)]">Customers can choose a new time</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{policy.rescheduleWindowMinutes ? `${minutesLabel(policy.rescheduleWindowMinutes)} before` : "Until the appointment starts"}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-[var(--text-muted)]">Late-arrival allowance</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{policy.noShowGraceMinutes ? minutesLabel(policy.noShowGraceMinutes) : "Mark missed immediately"}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-[var(--text-muted)]">An available place is held for</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{minutesLabel(policy.waitlistOfferMinutes)}</p>
              </div>
            </div>
          </div>
        ) : policy ? (
          <form
            key={policy.updatedAt ?? policy.organizationId}
            onSubmit={async (event) => {
              await onUpdatePolicy(event);
              setEditingPolicy(false);
            }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4 sm:p-5">
              <h4 className="text-sm font-semibold text-[var(--text-strong)]">Customer changes</h4>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Choose how close to the appointment customers may cancel or select another time.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <PolicyDurationField
                  name="cancellationWindowMinutes"
                  label="How early must customers cancel?"
                  description="Customers must cancel at least this long before the appointment starts."
                  initialMinutes={policy.cancellationWindowMinutes}
                  minMinutes={0}
                  maxMinutes={43200}
                />
                <PolicyDurationField
                  name="rescheduleWindowMinutes"
                  label="How early must customers choose a new time?"
                  description="Customers must choose a new time before this cutoff."
                  initialMinutes={policy.rescheduleWindowMinutes}
                  minMinutes={0}
                  maxMinutes={43200}
                />
              </div>
            </div>

            <details className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)]">
              <summary className="cursor-pointer list-none px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-strong)]">Advanced booking rules</h4>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Late arrivals and how long to reserve places opened from the waitlist.</p>
                  </div>
                  <span className="text-xs font-medium text-[var(--accent-primary)] group-open:hidden">Show</span>
                  <span className="hidden text-xs font-medium text-[var(--accent-primary)] group-open:inline">Hide</span>
                </div>
              </summary>
              <div className="grid grid-cols-1 gap-4 border-t border-[var(--border-subtle)] p-4 sm:p-5 lg:grid-cols-2">
                <PolicyDurationField
                  name="noShowGraceMinutes"
                  label="How long should staff wait for a late arrival?"
                  description="After this time, the appointment can be marked as missed."
                  initialMinutes={policy.noShowGraceMinutes}
                  minMinutes={0}
                  maxMinutes={10080}
                  zeroLabel="No grace period"
                />
                <PolicyDurationField
                  name="waitlistOfferMinutes"
                  label="How long should an available place be reserved?"
                  description="Give the customer this much time to claim it before offering it to the next person."
                  initialMinutes={policy.waitlistOfferMinutes}
                  minMinutes={1}
                  maxMinutes={1440}
                />
              </div>
            </details>

            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
              <p className="text-xs text-[var(--text-muted)]">
                These settings apply to every service unless that service has its own override.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingPolicy(false)} className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-base)] hover:bg-[var(--surface-hover)]">Cancel</button>
                <button className="h-10 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">Save booking rules</button>
              </div>
            </div>
          </form>
        ) : (
          <EmptyState>Policy is loading or unavailable for this organization.</EmptyState>
        )}
      </section>

      <details className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)]">
        <summary className="cursor-pointer list-none px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-[var(--text-strong)]">Holidays and waitlist operations</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Manage organization closures and customers waiting for an available place.</p>
            </div>
            <span className="text-xs font-medium text-[var(--accent-primary)] group-open:hidden">Open tools</span>
            <span className="hidden text-xs font-medium text-[var(--accent-primary)] group-open:inline">Hide tools</span>
          </div>
        </summary>
        <div className="space-y-5 border-t border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 sm:p-5">
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={onCreateBlackout} className="rounded-2xl border border-[var(--border-subtle)] p-4">
          <div className="mb-4 flex items-center gap-3">
            <CalendarOff className="h-5 w-5 text-[var(--accent-primary)]" />
            <div>
              <h3 className="font-semibold text-[var(--text-strong)]">Add organization blackout</h3>
              <p className="text-xs text-[var(--text-muted)]">Blocks all staff and services.</p>
            </div>
          </div>
          <div className="space-y-4">
            <Field label="Name">
              <input name="name" className="input" placeholder="Company holiday" required />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Starts">
                <input name="startAt" type="datetime-local" className="input" required />
              </Field>
              <Field label="Ends">
                <input name="endAt" type="datetime-local" className="input" required />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm text-[var(--text-base)]">
              <input name="annual" type="checkbox" /> Repeat every year
            </label>
            <button className="h-10 w-full rounded-xl border border-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--surface-tint)]">
              Add blackout
            </button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-4 py-3">
            <h3 className="font-semibold text-[var(--text-strong)]">Holidays & blackouts</h3>
          </div>
          {blackouts.length ? (
            <div className="divide-y divide-[var(--border-subtle)]">
              {blackouts.map((blackout) => (
                <div key={blackout.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-strong)]">{blackout.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {formatDateTime(blackout.startAt)} – {formatDateTime(blackout.endAt)}
                      {blackout.annual ? " · repeats annually" : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => onDeleteBlackout(blackout.id)} aria-label={`Delete ${blackout.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--danger-text)] hover:bg-[var(--danger-bg)]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No organization-wide blackouts.</EmptyState>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
        <div className="flex items-start gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-4 py-4">
          <UsersRound className="mt-0.5 h-5 w-5 text-[var(--accent-primary)]" />
          <div>
            <h3 className="font-semibold text-[var(--text-strong)]">Waitlist queue</h3>
            <p className="text-sm text-[var(--text-muted)]">Offers are sent automatically when matching seats open.</p>
          </div>
        </div>
        {waitlist.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Requested session</th>
                  <th className="px-4 py-3 font-medium">Service / staff</th>
                  <th className="px-4 py-3 font-medium">Party</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {waitlist.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[var(--surface-hover)]">
                    <td className="px-4 py-3 font-semibold text-[var(--text-strong)]">#{entry.position}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-strong)]">{entry.customerName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{entry.customerEmail ?? entry.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-base)]">{formatDateTime(entry.startAt)}</td>
                    <td className="px-4 py-3 text-[var(--text-base)]">
                      {services.find((item) => item.id === entry.serviceId)?.name ?? "Service"} · {staff.find((item) => item.id === entry.staffId)?.name ?? "Staff"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-base)]">{entry.partySize}</td>
                    <td className="px-4 py-3"><StatusPill status={entry.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>No waitlist entries.</EmptyState>
        )}
      </section>

        </div>
      </details>

    </div>
  );
}

export function AppointmentNotifications({
  policy,
  deadLetters,
  onUpdatePolicy,
  onRetryDeadLetter,
}: {
  policy: AppointmentPolicy | null;
  deadLetters: AppointmentDeadLetters;
  onUpdatePolicy: FormHandler;
  onRetryDeadLetter: (kind: "reminders" | "calendars", id: string) => void;
}) {
  return (
    <div className="space-y-6 p-5">
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-tint)] text-[var(--accent-primary)]">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-strong)]">Customer notifications</h3>
            <p className="text-sm text-[var(--text-muted)]">Choose delivery channels, timing and the messages customers receive.</p>
          </div>
        </div>

        {policy ? (
          <form key={policy.updatedAt ?? policy.organizationId} onSubmit={onUpdatePolicy} className="space-y-4">
            <input type="hidden" name="notificationSettingsForm" value="true" />
            <NotificationChannelSettings
              enabledChannels={policy.reminderChannels ?? ["email", "sms", "whatsapp"]}
              readiness={policy.notificationReadiness}
            />

            <QuietHoursSettings
              enabled={policy.quietHoursEnabled}
              start={policy.quietHoursStart}
              end={policy.quietHoursEnd}
              timezone={policy.quietHoursTimezone}
            />

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 sm:p-5">
              <h4 className="text-sm font-medium text-[var(--text-strong)]">When and what should we send?</h4>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Confirmation is sent immediately. Add follow-up reminders and customize the message for each channel.</p>
              <div className="mt-4">
                <ReminderScheduleField initialMinutes={policy.reminderOffsetsMinutes} />
              </div>
              <ChannelTemplateTabs policy={policy} />
            </div>

            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
              <p className="text-xs text-[var(--text-muted)]">Channel choices apply to all appointment confirmations and reminders.</p>
              <button className="h-10 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">Save notification settings</button>
            </div>
          </form>
        ) : (
          <EmptyState>Notification settings are loading or unavailable.</EmptyState>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
        <div className="flex items-start gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-4 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--danger-text)]" />
          <div>
            <h3 className="font-semibold text-[var(--text-strong)]">Delivery issues</h3>
            <p className="text-sm text-[var(--text-muted)]">Messages or calendar updates that could not be delivered after retrying.</p>
          </div>
        </div>
        {!deadLetters.reminders.length && !deadLetters.calendarEvents.length ? (
          <EmptyState>No delivery issues. Everything is running normally.</EmptyState>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {deadLetters.reminders.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-strong)]">Reminder · {item.booking.customerName} · {item.booking.service.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{item.reminderType} · {item.attempts} attempts · {formatDateTime(item.booking.startAt)}</p>
                  <p className="mt-2 max-w-3xl truncate text-xs text-[var(--danger-text)]" title={item.lastError ?? undefined}>{item.lastError ?? "No error details"}</p>
                </div>
                <button type="button" onClick={() => onRetryDeadLetter("reminders", item.id)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium hover:bg-[var(--surface-hover)]"><RotateCcw className="h-4 w-4" /> Try again</button>
              </div>
            ))}
            {deadLetters.calendarEvents.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-strong)]">{item.connection.provider === "google" ? "Google" : "Microsoft"} calendar · {item.booking.customerName}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{item.operation} · {item.attempts} attempts · {item.connection.accountEmail ?? "Connected account"}</p>
                  <p className="mt-2 max-w-3xl truncate text-xs text-[var(--danger-text)]" title={item.lastError ?? undefined}>{item.lastError ?? "No error details"}</p>
                </div>
                <button type="button" onClick={() => onRetryDeadLetter("calendars", item.id)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium hover:bg-[var(--surface-hover)]"><RotateCcw className="h-4 w-4" /> Try again</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
