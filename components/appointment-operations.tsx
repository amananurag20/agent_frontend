"use client";

import { BellRing, CalendarOff, Clock, Trash2, UsersRound } from "lucide-react";
import type {
  AppointmentBlackout,
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
