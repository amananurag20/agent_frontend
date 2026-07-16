"use client";

import { AlertTriangle, BellRing, CalendarOff, Clock, RotateCcw, Trash2, UsersRound } from "lucide-react";
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

export function AppointmentOperations({
  policy,
  blackouts,
  waitlist,
  deadLetters,
  services,
  staff,
  onUpdatePolicy,
  onCreateBlackout,
  onDeleteBlackout,
  onRetryDeadLetter,
}: {
  policy: AppointmentPolicy | null;
  blackouts: AppointmentBlackout[];
  waitlist: AppointmentWaitlistEntry[];
  deadLetters: AppointmentDeadLetters;
  services: AppointmentService[];
  staff: AppointmentStaff[];
  onUpdatePolicy: FormHandler;
  onCreateBlackout: FormHandler;
  onDeleteBlackout: (id: string) => void;
  onRetryDeadLetter: (kind: "reminders" | "calendars", id: string) => void;
}) {
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
        {policy ? (
          <form
            key={policy.updatedAt ?? policy.organizationId}
            onSubmit={onUpdatePolicy}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Cancel notice (minutes)">
                <input name="cancellationWindowMinutes" type="number" min="0" max="43200" defaultValue={policy.cancellationWindowMinutes} className="input" required />
              </Field>
              <Field label="Reschedule notice (minutes)">
                <input name="rescheduleWindowMinutes" type="number" min="0" max="43200" defaultValue={policy.rescheduleWindowMinutes} className="input" required />
              </Field>
              <Field label="No-show grace (minutes)">
                <input name="noShowGraceMinutes" type="number" min="0" max="10080" defaultValue={policy.noShowGraceMinutes} className="input" required />
              </Field>
              <Field label="Waitlist offer (minutes)">
                <input name="waitlistOfferMinutes" type="number" min="1" max="1440" defaultValue={policy.waitlistOfferMinutes} className="input" required />
              </Field>
            </div>
            <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
              <label className="flex items-center gap-3 text-sm font-medium text-[var(--text-strong)]">
                <input name="quietHoursEnabled" type="checkbox" defaultChecked={policy.quietHoursEnabled} />
                Keep non-confirmation reminders out of quiet hours
              </label>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Quiet hours start">
                  <input name="quietHoursStart" type="time" defaultValue={policy.quietHoursStart} className="input" required />
                </Field>
                <Field label="Quiet hours end">
                  <input name="quietHoursEnd" type="time" defaultValue={policy.quietHoursEnd} className="input" required />
                </Field>
                <Field label="Timezone">
                  <input name="quietHoursTimezone" defaultValue={policy.quietHoursTimezone} className="input" required />
                </Field>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
              <h4 className="text-sm font-medium text-[var(--text-strong)]">Reminder schedule & templates</h4>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Offsets are minutes before the appointment. Confirmation is always sent immediately.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field label="Offsets (comma separated)">
                  <input name="reminderOffsetsMinutes" defaultValue={policy.reminderOffsetsMinutes.join(", ")} className="input" placeholder="10080, 1440, 60" required />
                </Field>
                <Field label="Email subject">
                  <input name="emailSubjectTemplate" defaultValue={policy.reminderTemplates.emailSubject ?? "Appointment: {{serviceName}}"} className="input" />
                </Field>
                <Field label="Confirmation message">
                  <textarea name="confirmationTemplate" rows={3} defaultValue={policy.reminderTemplates.confirmation ?? ""} className="input resize-y" placeholder="Your {{serviceName}} appointment is confirmed for {{startTime}}." />
                </Field>
                <Field label="Reminder message">
                  <textarea name="reminderTemplate" rows={3} defaultValue={policy.reminderTemplates.reminder ?? ""} className="input resize-y" placeholder="Reminder: {{serviceName}} with {{staffName}} at {{startTime}}." />
                </Field>
                <Field label="Meta WhatsApp template name">
                  <input name="whatsappTemplateName" defaultValue={policy.reminderTemplates.whatsappTemplateName ?? ""} className="input" placeholder="appointment_reminder" />
                </Field>
              </div>
              <p className="mt-3 text-xs text-[var(--text-soft)]">Variables: {"{{customerName}}"}, {"{{serviceName}}"}, {"{{staffName}}"}, {"{{startTime}}"}, {"{{partySize}}"}, {"{{preferencesUrl}}"}.</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-muted)]">
                Cancel: {minutesLabel(policy.cancellationWindowMinutes)} · Reschedule: {minutesLabel(policy.rescheduleWindowMinutes)}
              </p>
              <button className="h-10 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
                Save policy
              </button>
            </div>
          </form>
        ) : (
          <EmptyState>Policy is loading or unavailable for this organization.</EmptyState>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
        <div className="flex items-start gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-4 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--danger-text)]" />
          <div>
            <h3 className="font-semibold text-[var(--text-strong)]">Delivery dead letters</h3>
            <p className="text-sm text-[var(--text-muted)]">Permanently failed reminders and calendar syncs requiring operator attention.</p>
          </div>
        </div>
        {!deadLetters.reminders.length && !deadLetters.calendarEvents.length ? (
          <EmptyState>No dead letters. Delivery systems are healthy.</EmptyState>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {deadLetters.reminders.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-strong)]">Reminder · {item.booking.customerName} · {item.booking.service.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{item.reminderType} · {item.attempts} attempts · {formatDateTime(item.booking.startAt)}</p>
                  <p className="mt-2 max-w-3xl truncate text-xs text-[var(--danger-text)]" title={item.lastError ?? undefined}>{item.lastError ?? "No error details"}</p>
                </div>
                <button type="button" onClick={() => onRetryDeadLetter("reminders", item.id)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium hover:bg-[var(--surface-hover)]"><RotateCcw className="h-4 w-4" /> Retry</button>
              </div>
            ))}
            {deadLetters.calendarEvents.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-strong)]">{item.connection.provider === "google" ? "Google" : "Microsoft"} calendar · {item.booking.customerName}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{item.operation} · {item.attempts} attempts · {item.connection.accountEmail ?? "Connected account"}</p>
                  <p className="mt-2 max-w-3xl truncate text-xs text-[var(--danger-text)]" title={item.lastError ?? undefined}>{item.lastError ?? "No error details"}</p>
                </div>
                <button type="button" onClick={() => onRetryDeadLetter("calendars", item.id)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium hover:bg-[var(--surface-hover)]"><RotateCcw className="h-4 w-4" /> Retry</button>
              </div>
            ))}
          </div>
        )}
      </section>

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

      <div className="flex items-start gap-3 rounded-2xl bg-[var(--surface-tint)] p-4 text-sm text-[var(--text-muted)]">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-primary)]" />
        Reminder confirmations send immediately. Later reminders respect opt-outs and the quiet-hours window above; no-show processing uses the grace period.
      </div>
    </div>
  );
}
