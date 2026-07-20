"use client";

import {
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Clock3,
  ExternalLink,
  Plus,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Users2,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type {
  AppointmentBooking,
  AppointmentBlackout,
  AppointmentDeadLetters,
  AppointmentCalendarConnection,
  AppointmentPolicy,
  AppointmentResource,
  AppointmentScheduleFeed,
  AppointmentService,
  AppointmentSlot,
  AppointmentStaff,
  AppointmentWaitlistEntry,
  FormHandler,
} from "@/lib/types";
import { Card, CardHeader, EmptyState, Field, StatusPill } from "./ui";
import { AppointmentOperations } from "./appointment-operations";
import { AppointmentScheduleCalendar } from "./appointment-schedule-calendar";

type Tab = "schedule" | "bookings" | "services" | "team" | "calendars" | "operations";
type Dialog =
  | "booking"
  | "service"
  | "service_edit"
  | "staff"
  | "resource"
  | "availability"
  | "timeoff"
  | "reschedule"
  | "calendar"
  | null;

const tabs: Array<{ id: Tab; label: string; icon: typeof CalendarDays }> = [
  { id: "schedule", label: "Calendar", icon: CalendarDays },
  { id: "bookings", label: "Booking list", icon: CalendarDays },
  { id: "services", label: "Services", icon: Settings2 },
  { id: "team", label: "Team & availability", icon: Users2 },
  { id: "calendars", label: "Calendar sync", icon: CalendarCheck },
  { id: "operations", label: "Policies & operations", icon: SlidersHorizontal },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function dialogTitle(dialog: Dialog) {
  return {
    booking: "New booking",
    service: "Add service",
    service_edit: "Edit service",
    staff: "Add team member",
    resource: "Add resource",
    availability: "Add weekly hours",
    timeoff: "Block time off",
    reschedule: "Reschedule booking",
    calendar: "Connect calendar",
  }[dialog ?? "booking"];
}

function Modal({
  dialog,
  onClose,
  children,
}: {
  dialog: Exclude<Dialog, null>;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_32px_80px_rgba(15,23,42,0.2)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              {dialogTitle(dialog)}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Complete the details below. Required fields are marked by the browser.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-92px)] overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function SubmitActions({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-5">
      <button
        type="button"
        onClick={onClose}
        className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
      >
        Cancel
      </button>
      <button className="h-10 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
        {label}
      </button>
    </div>
  );
}

export function AppointmentsView({
  services,
  staff,
  resources,
  slots,
  bookings,
  calendarConnections,
  policy,
  blackouts,
  waitlist,
  deadLetters,
  onCreateService,
  onUpdateService,
  onCreateStaff,
  onCreateResource,
  onCreateAvailability,
  onCreateTimeOff,
  onSearchSlots,
  onLoadCalendarBookings,
  onMoveBooking,
  onCreateBooking,
  onRescheduleBooking,
  onCancelBooking,
  onCheckInBooking,
  onCancelSeries,
  onUpdatePolicy,
  onCreateBlackout,
  onDeleteBlackout,
  onRetryDeadLetter,
  onConnectCalendar,
  onDisconnectCalendar,
}: {
  services: AppointmentService[];
  staff: AppointmentStaff[];
  resources: AppointmentResource[];
  slots: AppointmentSlot[];
  bookings: AppointmentBooking[];
  calendarConnections: AppointmentCalendarConnection[];
  policy: AppointmentPolicy | null;
  blackouts: AppointmentBlackout[];
  waitlist: AppointmentWaitlistEntry[];
  deadLetters: AppointmentDeadLetters;
  onCreateService: FormHandler;
  onUpdateService: FormHandler;
  onCreateStaff: FormHandler;
  onCreateResource: FormHandler;
  onCreateAvailability: FormHandler;
  onCreateTimeOff: FormHandler;
  onSearchSlots: FormHandler;
  onLoadCalendarBookings: (from: Date, to: Date) => Promise<AppointmentScheduleFeed>;
  onMoveBooking: (booking: AppointmentBooking, startAt: Date) => Promise<void>;
  onCreateBooking: FormHandler;
  onRescheduleBooking: FormHandler;
  onCancelBooking: (id: string) => Promise<void> | void;
  onCheckInBooking: (id: string) => Promise<void> | void;
  onCancelSeries: (seriesId: string, fromOccurrenceIndex?: number) => void;
  onUpdatePolicy: FormHandler;
  onCreateBlackout: FormHandler;
  onDeleteBlackout: (id: string) => void;
  onRetryDeadLetter: (kind: "reminders" | "calendars", id: string) => void;
  onConnectCalendar: (
    provider: "google" | "microsoft",
    staffId: string,
  ) => void;
  onDisconnectCalendar: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("schedule");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selectedBooking, setSelectedBooking] = useState<AppointmentBooking | null>(
    null,
  );
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [bookingDefaults, setBookingDefaults] = useState<AppointmentSlot | null>(
    null,
  );
  const [selectedService, setSelectedService] = useState<AppointmentService | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("calendar")) {
      const timer = window.setTimeout(() => setActiveTab("calendars"), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const closeDialog = () => {
    setDialog(null);
    setSelectedBooking(null);
    setSelectedStaffId("");
    setBookingDefaults(null);
    setSelectedService(null);
  };
  const [calendarRefreshVersion, setCalendarRefreshVersion] = useState(0);
  const submitDialog = (handler: FormHandler, refreshCalendar = false): FormHandler => async (event) => {
    await handler(event);
    if (refreshCalendar) setCalendarRefreshVersion((value) => value + 1);
    closeDialog();
  };

  const openPrimaryDialog = () => {
    setDialog(
      activeTab === "bookings"
        ? "booking"
        : activeTab === "schedule"
          ? "booking"
        : activeTab === "services"
          ? "service"
          : activeTab === "team"
            ? "staff"
            : activeTab === "calendars"
              ? "calendar"
              : null,
    );
  };

  const primaryLabel = {
    schedule: "New appointment",
    bookings: "New booking",
    services: "Add service",
    team: "Add team member",
    calendars: "Connect calendar",
    operations: "",
  }[activeTab];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[var(--surface-card-muted)] p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${
                      selected
                        ? "bg-[var(--surface-card)] text-[var(--text-strong)] shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              {activeTab === "team" ? (
                <button
                  type="button"
                  onClick={() => setDialog("resource")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)]"
                >
                  <Plus className="h-4 w-4" />
                  Add resource
                </button>
              ) : null}
              {activeTab !== "operations" ? <button
                type="button"
                onClick={openPrimaryDialog}
                disabled={activeTab === "team" && !services.length}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {primaryLabel}
              </button> : null}
            </div>
          </div>
        </CardHeader>

        {activeTab === "bookings" ? (
          <div>
            <form
              onSubmit={onSearchSlots}
              className="grid grid-cols-1 items-end gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-5 py-4 md:grid-cols-[minmax(180px,1fr)_minmax(160px,220px)_auto]"
            >
              <Field label="Find an open time">
                <select name="serviceId" className="input" required>
                  <option value="">Choose a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} · {service.durationMinutes} min
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input name="date" type="date" className="input" required />
              </Field>
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)]">
                <RefreshCw className="h-4 w-4" />
                Find times
              </button>
            </form>

            {slots.length ? (
              <div className="border-b border-[var(--border-subtle)] px-5 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Available times
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {slots.map((slot) => (
                    <button
                      type="button"
                      key={`${slot.staffId}-${slot.startAt}`}
                      onClick={() => {
                        setBookingDefaults(slot);
                        setDialog("booking");
                      }}
                      className="shrink-0 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 py-3 text-left hover:border-[var(--accent-primary)] hover:bg-[var(--surface-hover)]"
                    >
                      <p className="text-sm font-medium text-[var(--text-strong)]">
                        {formatDateTime(slot.startAt)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {slot.staffName} · {slot.seatsRemaining} seat{slot.seatsRemaining === 1 ? "" : "s"} left
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {bookings.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-[var(--surface-card-muted)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    <tr>
                      <th className="px-5 py-3 font-medium">Customer</th>
                      <th className="px-5 py-3 font-medium">Date & time</th>
                      <th className="px-5 py-3 font-medium">Service</th>
                      <th className="px-5 py-3 font-medium">Team member</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {bookings.map((booking) => {
                      const service = services.find(
                        (item) => item.id === booking.serviceId,
                      );
                      const member = staff.find(
                        (item) => item.id === booking.staffId,
                      );
                      const canChange = !["cancelled", "completed", "no_show"].includes(
                        booking.status,
                      );
                      return (
                        <tr key={booking.id} className="hover:bg-[var(--surface-hover)]">
                          <td className="px-5 py-4">
                            <p className="font-medium text-[var(--text-strong)]">
                              {booking.customerName}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {booking.customerEmail ?? booking.customerPhone ?? "No contact"}
                              {booking.partySize > 1 ? ` · Party of ${booking.partySize}` : ""}
                              {booking.seriesId ? ` · Recurring #${(booking.occurrenceIndex ?? 0) + 1}` : ""}
                              {booking.checkedInAt ? " · Checked in" : ""}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-[var(--text-base)]">
                            {formatDateTime(booking.startAt)}
                          </td>
                          <td className="px-5 py-4 text-[var(--text-base)]">
                            {service?.name ?? "Service"}
                          </td>
                          <td className="px-5 py-4 text-[var(--text-base)]">
                            {member?.name ?? "Unassigned"}
                          </td>
                          <td className="px-5 py-4">
                            <StatusPill status={booking.status} />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              {canChange ? (
                                <>
                                  {!booking.checkedInAt ? (
                                    <button
                                      type="button"
                                      onClick={() => onCheckInBooking(booking.id)}
                                      className="h-9 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--success-text)] hover:bg-[var(--success-bg)]"
                                    >
                                      Check in
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBooking(booking);
                                      setDialog("reschedule");
                                    }}
                                    className="h-9 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium hover:bg-[var(--surface-hover)]"
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onCancelBooking(booking.id)}
                                    className="h-9 rounded-xl px-3 text-xs font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                                  >
                                    Cancel
                                  </button>
                                  {booking.seriesId ? (
                                    <button
                                      type="button"
                                      onClick={() => onCancelSeries(booking.seriesId!, booking.occurrenceIndex ?? undefined)}
                                      className="h-9 rounded-xl px-3 text-xs font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                                      title="Cancel this and future occurrences"
                                    >
                                      Cancel series
                                    </button>
                                  ) : null}
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState>No bookings yet. Use “New booking” to schedule one.</EmptyState>
            )}
          </div>
        ) : null}

        {activeTab === "schedule" ? (
          <AppointmentScheduleCalendar
            services={services}
            staff={staff}
            onLoadRange={onLoadCalendarBookings}
            refreshVersion={calendarRefreshVersion}
            onMoveBooking={onMoveBooking}
            onCreateAt={(startAt) => {
              if (startAt) {
                setBookingDefaults({
                  staffId: "",
                  staffName: "",
                  startAt: startAt.toISOString(),
                  endAt: new Date(startAt.getTime() + 30 * 60_000).toISOString(),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                  seatsRemaining: 1,
                });
              }
              setDialog("booking");
            }}
            onReschedule={(booking) => {
              setSelectedBooking(booking);
              setDialog("reschedule");
            }}
            onCancel={onCancelBooking}
            onCheckIn={onCheckInBooking}
          />
        ) : null}

        {activeTab === "services" ? (
          services.length ? (
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-tint)] text-[var(--accent-primary)]">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <StatusPill status={service.status} />
                  </div>
                  <h3 className="mt-4 font-semibold text-[var(--text-strong)]">
                    {service.name}
                  </h3>
                  <p className="mt-1 min-h-10 text-sm text-[var(--text-muted)]">
                    {service.description || "No description added."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                    <span className="rounded-full bg-[var(--surface-card)] px-2.5 py-1">
                      {service.durationMinutes} min
                    </span>
                    {service.bufferBeforeMinutes || service.bufferAfterMinutes ? (
                      <span className="rounded-full bg-[var(--surface-card)] px-2.5 py-1">
                        {service.bufferBeforeMinutes + service.bufferAfterMinutes} min buffer
                      </span>
                    ) : null}
                    <span className="rounded-full bg-[var(--surface-card)] px-2.5 py-1">
                      {service.maxAttendees > 1 ? `Group · ${service.maxAttendees} seats` : "Private"}
                    </span>
                    {service.waitlistEnabled ? (
                      <span className="rounded-full bg-[var(--surface-card)] px-2.5 py-1">Waitlist on</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedService(service);
                      setDialog("service_edit");
                    }}
                    className="mt-4 h-9 w-full rounded-xl border border-[var(--border-strong)] text-xs font-medium hover:bg-[var(--surface-card)]"
                  >
                    Edit service settings
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No services yet. Add a service before creating team schedules.</EmptyState>
          )
        ) : null}

        {activeTab === "team" ? (
          staff.length || resources.length ? (
            <div>
              <div className="border-b border-[var(--border-subtle)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Team members
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--surface-hover)]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-tint)] font-semibold text-[var(--accent-primary)]">
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-strong)]">
                        {member.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                        {member.email ?? "No email"} · {member.timezone}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        {member.services?.map((service) => service.name).join(", ") ||
                          "No services assigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={member.status} />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStaffId(member.id);
                        setDialog("availability");
                      }}
                      className="h-9 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium hover:bg-[var(--surface-card)]"
                    >
                      Add hours
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStaffId(member.id);
                        setDialog("timeoff");
                      }}
                      className="h-9 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium hover:bg-[var(--surface-card)]"
                    >
                      Block time
                    </button>
                  </div>
                </div>
              ))}
              {!staff.length ? <EmptyState>No team members yet.</EmptyState> : null}
              </div>
              <div className="border-y border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Bookable resources
              </div>
              {resources.length ? (
                <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {resources.map((resource) => (
                    <div key={resource.id} className="rounded-2xl border border-[var(--border-subtle)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[var(--text-strong)]">{resource.name}</p>
                          <p className="mt-1 text-xs capitalize text-[var(--text-muted)]">{resource.type}</p>
                        </div>
                        <StatusPill status={resource.status} />
                      </div>
                      <p className="mt-4 text-xs text-[var(--text-muted)]">Capacity {resource.capacity}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>No rooms, equipment, or other resources yet.</EmptyState>
              )}
            </div>
          ) : (
            <EmptyState>No team members yet.</EmptyState>
          )
        ) : null}

        {activeTab === "calendars" ? (
          <div className="p-5">
            <div className="mb-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4">
              <div className="flex items-start gap-3">
                <CalendarCheck className="mt-0.5 h-5 w-5 text-[var(--accent-primary)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-strong)]">
                    Two-way booking synchronization
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Busy events prevent conflicts. New, changed, and cancelled bookings are
                    synchronized automatically to each team member’s connected calendar.
                  </p>
                </div>
              </div>
            </div>
            {calendarConnections.length ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {calendarConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="rounded-2xl border border-[var(--border-subtle)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-tint)] text-sm font-bold text-[var(--accent-primary)]">
                          {connection.provider === "google" ? "G" : "M"}
                        </div>
                        <div>
                          <p className="font-medium capitalize text-[var(--text-strong)]">
                            {connection.provider === "microsoft"
                              ? "Microsoft Outlook"
                              : "Google Calendar"}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {connection.staff?.name ??
                              staff.find((item) => item.id === connection.staffId)?.name ??
                              "Team member"}
                          </p>
                        </div>
                      </div>
                      <StatusPill status={connection.status} />
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
                      <p>{connection.accountEmail ?? "Authorization pending"}</p>
                      <p>{connection.calendarName ?? connection.calendarId}</p>
                      <p className="text-xs">
                        {connection.lastSyncedAt
                          ? `Last synchronized ${formatDateTime(connection.lastSyncedAt)}`
                          : "Waiting for first synchronization"}
                      </p>
                      {connection.lastError ? (
                        <p className="rounded-xl bg-[var(--danger-bg)] p-3 text-xs text-[var(--danger-text)]">
                          {connection.lastError}
                        </p>
                      ) : null}
                    </div>
                    {connection.status !== "disconnected" ? (
                      <button
                        type="button"
                        onClick={() => onDisconnectCalendar(connection.id)}
                        className="mt-4 h-9 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                      >
                        Disconnect
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center">
                <CalendarPlus className="mx-auto h-8 w-8 text-[var(--text-soft)]" />
                <p className="mt-3 text-sm font-medium text-[var(--text-strong)]">
                  No calendars connected
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Connect Google Calendar or Outlook to prevent double bookings.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "operations" ? (
          <AppointmentOperations
            policy={policy}
            blackouts={blackouts}
            waitlist={waitlist}
            deadLetters={deadLetters}
            services={services}
            staff={staff}
            onUpdatePolicy={onUpdatePolicy}
            onCreateBlackout={onCreateBlackout}
            onDeleteBlackout={onDeleteBlackout}
            onRetryDeadLetter={onRetryDeadLetter}
          />
        ) : null}
      </Card>

      {dialog ? (
        <Modal dialog={dialog} onClose={closeDialog}>
          {dialog === "service" ? (
            <form onSubmit={submitDialog(onCreateService)} className="space-y-4">
              <Field label="Service name">
                <input name="name" className="input" autoFocus required />
              </Field>
              <Field label="Description">
                <textarea name="description" rows={3} className="input resize-y" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Duration (min)">
                  <input name="durationMinutes" type="number" min="5" defaultValue="30" className="input" required />
                </Field>
                <Field label="Buffer before">
                  <input name="bufferBeforeMinutes" type="number" min="0" defaultValue="0" className="input" />
                </Field>
                <Field label="Buffer after">
                  <input name="bufferAfterMinutes" type="number" min="0" defaultValue="0" className="input" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Maximum attendees">
                  <input name="maxAttendees" type="number" min="1" max="100" defaultValue="1" className="input" required />
                </Field>
                <Field label="Cancel notice (min)">
                  <input name="cancellationWindowMinutes" type="number" min="0" max="43200" className="input" placeholder="Organization default" />
                </Field>
                <Field label="Reschedule notice (min)">
                  <input name="rescheduleWindowMinutes" type="number" min="0" max="43200" className="input" placeholder="Organization default" />
                </Field>
              </div>
              <label className="flex items-center gap-3 text-sm text-[var(--text-base)]">
                <input name="waitlistEnabled" type="checkbox" defaultChecked /> Enable waitlist when full
              </label>
              <div className="rounded-xl bg-[var(--surface-card-muted)] p-4">
                <p className="mb-3 text-sm font-medium text-[var(--text-strong)]">Service reminder override (optional)</p>
                <Field label="Offsets in minutes, comma separated">
                  <input name="reminderOffsetsMinutes" className="input" placeholder="Leave blank to use organization schedule" />
                </Field>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Confirmation template"><textarea name="confirmationTemplate" rows={3} className="input resize-y" /></Field>
                  <Field label="Reminder template"><textarea name="reminderTemplate" rows={3} className="input resize-y" /></Field>
                </div>
              </div>
              <SubmitActions label="Create service" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "service_edit" && selectedService ? (
            <form onSubmit={submitDialog(onUpdateService)} className="space-y-4">
              <input type="hidden" name="serviceId" value={selectedService.id} />
              <Field label="Service name">
                <input name="name" className="input" defaultValue={selectedService.name} required />
              </Field>
              <Field label="Description">
                <textarea name="description" rows={3} className="input resize-y" defaultValue={selectedService.description ?? ""} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Duration (min)">
                  <input name="durationMinutes" type="number" min="5" max="1440" defaultValue={selectedService.durationMinutes} className="input" required />
                </Field>
                <Field label="Buffer before">
                  <input name="bufferBeforeMinutes" type="number" min="0" max="240" defaultValue={selectedService.bufferBeforeMinutes} className="input" required />
                </Field>
                <Field label="Buffer after">
                  <input name="bufferAfterMinutes" type="number" min="0" max="240" defaultValue={selectedService.bufferAfterMinutes} className="input" required />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Maximum attendees">
                  <input name="maxAttendees" type="number" min="1" max="100" defaultValue={selectedService.maxAttendees} className="input" required />
                </Field>
                <Field label="Cancel notice (min)">
                  <input name="cancellationWindowMinutes" type="number" min="0" max="43200" defaultValue={selectedService.cancellationWindowMinutes ?? ""} className="input" placeholder="Organization default" />
                </Field>
                <Field label="Reschedule notice (min)">
                  <input name="rescheduleWindowMinutes" type="number" min="0" max="43200" defaultValue={selectedService.rescheduleWindowMinutes ?? ""} className="input" placeholder="Organization default" />
                </Field>
              </div>
              <label className="flex items-center gap-3 text-sm text-[var(--text-base)]">
                <input name="waitlistEnabled" type="checkbox" defaultChecked={selectedService.waitlistEnabled} /> Enable waitlist when full
              </label>
              <div className="rounded-xl bg-[var(--surface-card-muted)] p-4">
                <p className="mb-3 text-sm font-medium text-[var(--text-strong)]">Service reminder override</p>
                <Field label="Offsets in minutes, comma separated">
                  <input name="reminderOffsetsMinutes" className="input" defaultValue={selectedService.reminderOffsetsMinutes.join(", ")} placeholder="Leave blank to inherit" />
                </Field>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Confirmation template"><textarea name="confirmationTemplate" rows={3} className="input resize-y" defaultValue={selectedService.reminderTemplates.confirmation ?? ""} /></Field>
                  <Field label="Reminder template"><textarea name="reminderTemplate" rows={3} className="input resize-y" defaultValue={selectedService.reminderTemplates.reminder ?? ""} /></Field>
                </div>
              </div>
              <SubmitActions label="Save service" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "staff" ? (
            <form onSubmit={submitDialog(onCreateStaff)} className="space-y-4">
              <Field label="Name">
                <input name="name" className="input" autoFocus required />
              </Field>
              <Field label="Email">
                <input name="email" type="email" className="input" />
              </Field>
              <Field label="Timezone">
                <input name="timezone" className="input" defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"} required />
              </Field>
              <Field label="Service">
                <select name="serviceId" className="input" required>
                  <option value="">Choose a service</option>
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
              </Field>
              <SubmitActions label="Add team member" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "resource" ? (
            <form onSubmit={submitDialog(onCreateResource)} className="space-y-4">
              <Field label="Resource name">
                <input name="name" className="input" autoFocus required placeholder="Consultation room A" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Type">
                  <select name="type" className="input" defaultValue="room">
                    <option value="room">Room</option>
                    <option value="equipment">Equipment</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="generic">Other</option>
                  </select>
                </Field>
                <Field label="Capacity">
                  <input name="capacity" type="number" min="1" max="100" defaultValue="1" className="input" required />
                </Field>
              </div>
              <Field label="Required by service (optional)">
                <select name="serviceId" className="input">
                  <option value="">Do not assign yet</option>
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
              </Field>
              <SubmitActions label="Add resource" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "availability" ? (
            <form onSubmit={submitDialog(onCreateAvailability)} className="space-y-4">
              <Field label="Team member">
                <select name="staffId" className="input" defaultValue={selectedStaffId} required>
                  <option value="">Choose a team member</option>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Day">
                  <select name="dayOfWeek" className="input" defaultValue="1">
                    {[[0,"Sunday"],[1,"Monday"],[2,"Tuesday"],[3,"Wednesday"],[4,"Thursday"],[5,"Friday"],[6,"Saturday"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Starts">
                  <input name="startTime" type="time" defaultValue="09:00" className="input" required />
                </Field>
                <Field label="Ends">
                  <input name="endTime" type="time" defaultValue="17:00" className="input" required />
                </Field>
              </div>
              <SubmitActions label="Add hours" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "timeoff" ? (
            <form onSubmit={submitDialog(onCreateTimeOff)} className="space-y-4">
              <Field label="Team member">
                <select name="staffId" className="input" defaultValue={selectedStaffId} required>
                  <option value="">Choose a team member</option>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Starts">
                  <input name="startAt" type="datetime-local" className="input" required />
                </Field>
                <Field label="Ends">
                  <input name="endAt" type="datetime-local" className="input" required />
                </Field>
              </div>
              <Field label="Reason">
                <input name="reason" className="input" placeholder="Vacation, meeting, unavailable…" />
              </Field>
              <SubmitActions label="Block time" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "booking" ? (
            <form key={bookingDefaults?.startAt ?? "blank"} onSubmit={submitDialog(onCreateBooking, true)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Service">
                  <select name="serviceId" className="input" required>
                    <option value="">Choose a service</option>
                    {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                  </select>
                </Field>
                <Field label="Team member">
                  <select name="staffId" className="input" defaultValue={bookingDefaults?.staffId ?? ""}>
                    <option value="">Auto assign</option>
                    {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Start time">
                <input
                  name="startAt"
                  type="datetime-local"
                  className="input"
                  defaultValue={bookingDefaults ? new Date(new Date(bookingDefaults.startAt).getTime() - new Date(bookingDefaults.startAt).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ""}
                  required
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Customer name">
                  <input name="customerName" className="input" required />
                </Field>
                <Field label="Customer email">
                  <input name="customerEmail" type="email" className="input" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Customer phone">
                  <input name="customerPhone" type="tel" className="input" />
                </Field>
                <Field label="Party size">
                  <input name="partySize" type="number" min="1" max="100" defaultValue="1" className="input" required />
                </Field>
              </div>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4">
                <p className="mb-3 text-sm font-medium text-[var(--text-strong)]">Recurring appointment (optional)</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Frequency">
                    <select name="recurrenceFrequency" className="input" defaultValue="">
                      <option value="">Does not repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </Field>
                  <Field label="Every">
                    <input name="recurrenceInterval" type="number" min="1" max="12" defaultValue="1" className="input" />
                  </Field>
                  <Field label="Occurrences">
                    <input name="recurrenceCount" type="number" min="2" max="52" defaultValue="2" className="input" />
                  </Field>
                </div>
              </div>
              <Field label="Notes">
                <textarea name="notes" rows={3} className="input resize-y" />
              </Field>
              <SubmitActions label="Create booking" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "reschedule" && selectedBooking ? (
            <form onSubmit={submitDialog(onRescheduleBooking, true)} className="space-y-4">
              <input type="hidden" name="bookingId" value={selectedBooking.id} />
              <div className="rounded-2xl bg-[var(--surface-card-muted)] p-4 text-sm">
                <p className="font-medium text-[var(--text-strong)]">{selectedBooking.customerName}</p>
                <p className="mt-1 text-[var(--text-muted)]">Currently {formatDateTime(selectedBooking.startAt)}</p>
              </div>
              <Field label="Team member">
                <select name="staffId" className="input" defaultValue={selectedBooking.staffId}>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </Field>
              <Field label="New start time">
                <input name="startAt" type="datetime-local" className="input" required />
              </Field>
              {selectedBooking.seriesId ? (
                <label className="flex items-start gap-3 rounded-xl bg-[var(--surface-card-muted)] p-4 text-sm text-[var(--text-base)]">
                  <input name="applyToFuture" type="checkbox" />
                  <span><strong className="text-[var(--text-strong)]">Apply to future occurrences</strong><br />Move this appointment and every later occurrence by the same amount.</span>
                </label>
              ) : null}
              <SubmitActions label="Reschedule" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "calendar" ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                onConnectCalendar(
                  String(form.get("provider")) as "google" | "microsoft",
                  String(form.get("staffId")),
                );
              }}
            >
              <Field label="Team member">
                <select name="staffId" className="input" required>
                  <option value="">Choose a team member</option>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </Field>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-[var(--text-base)]">Calendar provider</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[{ id: "google", label: "Google Calendar", mark: "G" }, { id: "microsoft", label: "Microsoft Outlook", mark: "M" }].map((provider) => (
                    <label key={provider.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--border-strong)] p-4 hover:bg-[var(--surface-hover)]">
                      <input type="radio" name="provider" value={provider.id} required />
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-tint)] font-bold text-[var(--accent-primary)]">{provider.mark}</span>
                      <span className="text-sm font-medium text-[var(--text-strong)]">{provider.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="rounded-2xl bg-[var(--surface-card-muted)] p-4 text-sm text-[var(--text-muted)]">
                You’ll be sent to the provider to grant calendar access, then returned here automatically.
              </div>
              <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-5">
                <button type="button" onClick={closeDialog} className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)]">Cancel</button>
                <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
                  Continue <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </form>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
