"use client";

import {
  BellRing,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Clock3,
  ExternalLink,
  CalendarClock,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Users2,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type {
  AppointmentBooking,
  AppointmentBlackout,
  AppointmentDeadLetters,
  AppointmentEligibleUser,
  AppointmentCalendarConnection,
  AppointmentPolicy,
  AppointmentScheduleFeed,
  AppointmentService,
  AppointmentSlot,
  AppointmentStaff,
  AppointmentStaffAvailability,
  AppointmentStaffTimeOff,
  AppointmentWaitlistEntry,
  FormHandler,
} from "@/lib/types";
import { Card, CardHeader, EmptyState, Field, StatusPill } from "./ui";
import {
  AppointmentBlockedTimes,
  AppointmentNotifications,
  AppointmentWaitlist,
} from "./appointment-operations";
import { AppointmentScheduleCalendar } from "./appointment-schedule-calendar";

type Tab =
  | "schedule"
  | "bookings"
  | "waitlist"
  | "services"
  | "team"
  | "calendars"
  | "notifications";
type Dialog =
  | "booking"
  | "blackout"
  | "service"
  | "service_edit"
  | "staff"
  | "staff_edit"
  | "staff_schedule"
  | "availability"
  | "timeoff"
  | "reschedule"
  | "calendar"
  | null;

const tabs: Array<{ id: Tab; label: string; icon: typeof CalendarDays }> = [
  { id: "schedule", label: "Calendar", icon: CalendarDays },
  { id: "bookings", label: "Booking list", icon: CalendarDays },
  { id: "waitlist", label: "Waitlist", icon: Users2 },
  { id: "services", label: "Services", icon: Settings2 },
  { id: "team", label: "Team & availability", icon: Users2 },
  { id: "calendars", label: "Calendar setup", icon: CalendarCheck },
  { id: "notifications", label: "Notifications", icon: BellRing },
];

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPrice(priceCents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(priceCents / 100);
  } catch {
    return `${currency} ${(priceCents / 100).toFixed(2)}`;
  }
}

function dialogTitle(dialog: Dialog) {
  return {
    booking: "New booking",
    blackout: "Block time",
    service: "Add service",
    service_edit: "Edit service",
    staff: "Add team member",
    staff_edit: "Edit team member",
    staff_schedule: "Manage availability",
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
  const isServiceDialog = dialog === "service" || dialog === "service_edit";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className={`max-h-[92vh] w-full ${dialog === "staff_schedule" || isServiceDialog ? "max-w-3xl" : "max-w-xl"} overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_32px_80px_rgba(15,23,42,0.2)]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              {dialogTitle(dialog)}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {isServiceDialog
                ? "Set the booking basics now. Optional policies and reminders can inherit your organization defaults."
                : "Complete the details below. Required fields are marked by the browser."}
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

function ServiceFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-strong)]">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ServiceFormDisclosure({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)]"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">
              {title}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              {description}
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-[var(--accent-primary)] group-open:hidden">
            Customize
          </span>
          <span className="hidden shrink-0 text-xs font-medium text-[var(--accent-primary)] group-open:inline">
            Hide
          </span>
        </div>
      </summary>
      <div className="border-t border-[var(--border-subtle)] px-4 py-4 sm:px-5">
        {children}
      </div>
    </details>
  );
}

function MeetingTypeFields({
  initialType = "online",
  initialLocation = "",
}: {
  initialType?: AppointmentService["meetingType"];
  initialLocation?: string;
}) {
  const [meetingType, setMeetingType] =
    useState<AppointmentService["meetingType"]>(initialType);

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="How will this meeting happen?">
          <select
            name="meetingType"
            className="input"
            value={meetingType}
            onChange={(event) =>
              setMeetingType(
                event.target.value as AppointmentService["meetingType"],
              )
            }
          >
            <option value="online">Online meeting</option>
            <option value="in_person">In person</option>
            <option value="phone">Phone call</option>
          </select>
        </Field>
        {meetingType === "in_person" ? (
          <Field label="Meeting address">
            <input
              name="location"
              className="input"
              defaultValue={initialLocation}
              placeholder="Office address or room"
              required
            />
          </Field>
        ) : meetingType === "phone" ? (
          <Field label="Call instructions (optional)">
            <input
              name="location"
              className="input"
              defaultValue={initialLocation}
              placeholder="For example, we will call the customer"
            />
          </Field>
        ) : (
          <div className="rounded-xl bg-[var(--surface-card)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
            Google Meet or Microsoft Teams will be created from the workspace
            calendar and invitations will be emailed automatically.
          </div>
        )}
      </div>
    </div>
  );
}

function SubmitActions({
  label,
  onClose,
}: {
  label: string;
  onClose: () => void;
}) {
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

function AssignmentChecklist({
  label,
  name,
  items,
  selectedIds = [],
  empty,
}: {
  label: string;
  name: string;
  items: Array<{ id: string; name: string; status?: string }>;
  selectedIds?: string[];
  empty: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-[var(--text-base)]">
        {label}
      </legend>
      {items.length ? (
        <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-[var(--border-subtle)] p-3 sm:grid-cols-2">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2 text-sm text-[var(--text-base)]"
            >
              <input
                type="checkbox"
                name={name}
                value={item.id}
                defaultChecked={selectedIds.includes(item.id)}
                className="h-4 w-4 accent-[var(--accent-primary)]"
              />
              <span className="truncate">
                {item.name}
                {item.status === "inactive" ? " (inactive)" : ""}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--border-subtle)] p-3 text-xs text-[var(--text-muted)]">
          {empty}
        </p>
      )}
    </fieldset>
  );
}

export function AppointmentsView({
  services,
  staff,
  eligibleUsers,
  canManageTeam,
  slots,
  bookings,
  calendarConnections,
  policy,
  blackouts,
  waitlist,
  deadLetters,
  onCreateService,
  onUpdateService,
  onDeleteService,
  onCreateStaff,
  onUpdateStaff,
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
  onLoadStaffSchedule,
  onAddStaffAvailability,
  onDeleteStaffAvailability,
  onAddStaffTimeOff,
  onDeleteStaffTimeOff,
}: {
  services: AppointmentService[];
  staff: AppointmentStaff[];
  eligibleUsers: AppointmentEligibleUser[];
  canManageTeam: boolean;
  slots: AppointmentSlot[];
  bookings: AppointmentBooking[];
  calendarConnections: AppointmentCalendarConnection[];
  policy: AppointmentPolicy | null;
  blackouts: AppointmentBlackout[];
  waitlist: AppointmentWaitlistEntry[];
  deadLetters: AppointmentDeadLetters;
  onCreateService: FormHandler;
  onUpdateService: FormHandler;
  onDeleteService: (id: string) => Promise<string | null>;
  onCreateStaff: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onUpdateStaff: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onCreateAvailability: FormHandler;
  onCreateTimeOff: FormHandler;
  onSearchSlots: FormHandler;
  onLoadCalendarBookings: (
    from: Date,
    to: Date,
  ) => Promise<AppointmentScheduleFeed>;
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
    scope: "organization" | "staff",
    staffId?: string,
  ) => void;
  onDisconnectCalendar: (id: string) => void;
  onLoadStaffSchedule: (staffId: string) => Promise<{
    availability: AppointmentStaffAvailability[];
    timeOff: AppointmentStaffTimeOff[];
  }>;
  onAddStaffAvailability: (
    staffId: string,
    input: { dayOfWeek: number; startTime: string; endTime: string },
  ) => Promise<AppointmentStaffAvailability>;
  onDeleteStaffAvailability: (
    staffId: string,
    availabilityId: string,
  ) => Promise<void>;
  onAddStaffTimeOff: (
    staffId: string,
    input: { startAt: string; endAt: string; reason?: string },
  ) => Promise<AppointmentStaffTimeOff>;
  onDeleteStaffTimeOff: (staffId: string, timeOffId: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("schedule");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selectedBooking, setSelectedBooking] =
    useState<AppointmentBooking | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffAvailability, setStaffAvailability] = useState<
    AppointmentStaffAvailability[]
  >([]);
  const [staffTimeOff, setStaffTimeOff] = useState<AppointmentStaffTimeOff[]>(
    [],
  );
  const [staffScheduleLoading, setStaffScheduleLoading] = useState(false);
  const [staffScheduleError, setStaffScheduleError] = useState<string | null>(
    null,
  );
  const [bookingDefaults, setBookingDefaults] =
    useState<AppointmentSlot | null>(null);
  const [bookingServiceId, setBookingServiceId] = useState("");
  const [selectedService, setSelectedService] =
    useState<AppointmentService | null>(null);
  const [serviceFilter, setServiceFilter] = useState<
    "active" | "inactive" | "all"
  >("active");
  const [serviceDeleting, setServiceDeleting] = useState(false);
  const [serviceDeleteError, setServiceDeleteError] = useState<string | null>(
    null,
  );
  const [calendarScope, setCalendarScope] = useState<"organization" | "staff">(
    "organization",
  );

  const activeServices = services.filter(
    (service) => service.status === "active",
  );
  const availableStaffUsers = eligibleUsers.filter(
    (candidate) => !candidate.appointmentStaffId,
  );
  const inviteableStaff = staff.filter(
    (member) => member.status === "active" && member.email,
  );
  const workspaceCalendar = calendarConnections.find(
    (connection) =>
      connection.scope === "organization" &&
      connection.status !== "disconnected",
  );
  const filteredServices = services.filter(
    (service) => serviceFilter === "all" || service.status === serviceFilter,
  );
  const selectedStaff =
    staff.find((member) => member.id === selectedStaffId) ?? null;
  const staffCalendarLabel = (staffId: string) => {
    const connection = calendarConnections.find(
      (item) => item.scope === "staff" && item.staffId === staffId,
    );
    if (!connection) return "No calendar";
    return `Calendar ${connection.status}`;
  };

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
  const submitDialog =
    (handler: FormHandler, refreshCalendar = false): FormHandler =>
    async (event) => {
      await handler(event);
      if (refreshCalendar) setCalendarRefreshVersion((value) => value + 1);
      closeDialog();
    };

  const openPrimaryDialog = () => {
    if (activeTab === "calendars") {
      setCalendarScope(workspaceCalendar ? "staff" : "organization");
    }
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

  const searchAvailableSlots: FormHandler = async (event) => {
    const form = new FormData(event.currentTarget);
    setBookingServiceId(String(form.get("serviceId") || ""));
    await onSearchSlots(event);
  };

  const openStaffSchedule = async (member: AppointmentStaff) => {
    setSelectedStaffId(member.id);
    setStaffAvailability([]);
    setStaffTimeOff([]);
    setStaffScheduleError(null);
    setStaffScheduleLoading(true);
    setDialog("staff_schedule");
    try {
      const schedule = await onLoadStaffSchedule(member.id);
      setStaffAvailability(schedule.availability);
      setStaffTimeOff(schedule.timeOff);
    } catch (error) {
      setStaffScheduleError(
        error instanceof Error ? error.message : "Could not load team schedule",
      );
    } finally {
      setStaffScheduleLoading(false);
    }
  };

  const removeStaffAvailability = async (
    staffId: string,
    availabilityId: string,
  ) => {
    try {
      await onDeleteStaffAvailability(staffId, availabilityId);
      setStaffAvailability((items) =>
        items.filter((item) => item.id !== availabilityId),
      );
      setStaffScheduleError(null);
    } catch (error) {
      setStaffScheduleError(
        error instanceof Error
          ? error.message
          : "Could not remove weekly hours",
      );
    }
  };

  const removeStaffTimeOff = async (staffId: string, timeOffId: string) => {
    try {
      await onDeleteStaffTimeOff(staffId, timeOffId);
      setStaffTimeOff((items) => items.filter((item) => item.id !== timeOffId));
      setStaffScheduleError(null);
    } catch (error) {
      setStaffScheduleError(
        error instanceof Error ? error.message : "Could not remove time off",
      );
    }
  };

  const deleteSelectedService = async () => {
    if (!selectedService || serviceDeleting) return;
    const confirmed = window.confirm(
      `Permanently delete “${selectedService.name}”? This is only allowed when the service has no booking, recurrence, or waitlist history.`,
    );
    if (!confirmed) return;
    setServiceDeleteError(null);
    setServiceDeleting(true);
    try {
      const error = await onDeleteService(selectedService.id);
      if (error) setServiceDeleteError(error);
      else closeDialog();
    } finally {
      setServiceDeleting(false);
    }
  };

  const primaryLabel = {
    schedule: "New appointment",
    bookings: "New booking",
    waitlist: "",
    services: "Add service",
    team: "Add team member",
    calendars: workspaceCalendar
      ? "Add team calendar"
      : "Connect workspace calendar",
    notifications: "",
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
              {activeTab === "schedule" ? (
                <button
                  type="button"
                  onClick={() => setDialog("blackout")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)]"
                >
                  <CalendarClock className="h-4 w-4" />
                  Block time
                </button>
              ) : null}
              {activeTab !== "waitlist" &&
              activeTab !== "notifications" &&
              (activeTab !== "team" || canManageTeam) ? (
                <button
                  type="button"
                  onClick={openPrimaryDialog}
                  disabled={activeTab === "team" && !activeServices.length}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {primaryLabel}
                </button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        {activeTab === "bookings" ? (
          <div>
            <form
              onSubmit={searchAvailableSlots}
              className="grid grid-cols-1 items-end gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-5 py-4 md:grid-cols-[minmax(180px,1fr)_minmax(160px,220px)_auto]"
            >
              <Field label="Find an open time">
                <select name="serviceId" className="input" required>
                  <option value="">Choose a service</option>
                  {activeServices.map((service) => (
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
                        {slot.staffName} · {slot.seatsRemaining} seat
                        {slot.seatsRemaining === 1 ? "" : "s"} left
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
                      <th className="px-5 py-3 text-right font-medium">
                        Actions
                      </th>
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
                      const canChange = ![
                        "cancelled",
                        "completed",
                        "no_show",
                      ].includes(booking.status);
                      return (
                        <tr
                          key={booking.id}
                          className="hover:bg-[var(--surface-hover)]"
                        >
                          <td className="px-5 py-4">
                            <p className="font-medium text-[var(--text-strong)]">
                              {booking.customerName}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {booking.customerEmail ??
                                booking.customerPhone ??
                                "No contact"}
                              {booking.partySize > 1
                                ? ` · Party of ${booking.partySize}`
                                : ""}
                              {booking.seriesId
                                ? ` · Recurring #${(booking.occurrenceIndex ?? 0) + 1}`
                                : ""}
                              {booking.checkedInAt ? " · Checked in" : ""}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-[var(--text-base)]">
                            <p>{formatDateTime(booking.startAt)}</p>
                            {booking.meetingUrl ? (
                              <a
                                href={booking.meetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline"
                              >
                                Join online meeting{" "}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : booking.meetingType === "online" ? (
                              <p className="mt-1 text-xs text-[var(--text-soft)]">
                                Meeting link is being prepared
                              </p>
                            ) : booking.location ? (
                              <p
                                className="mt-1 max-w-56 truncate text-xs text-[var(--text-muted)]"
                                title={booking.location}
                              >
                                {booking.location}
                              </p>
                            ) : null}
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
                                      onClick={() =>
                                        onCheckInBooking(booking.id)
                                      }
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
                                      onClick={() =>
                                        onCancelSeries(
                                          booking.seriesId!,
                                          booking.occurrenceIndex ?? undefined,
                                        )
                                      }
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
              <EmptyState>
                No bookings yet. Use “New booking” to schedule one.
              </EmptyState>
            )}
          </div>
        ) : null}

        {activeTab === "schedule" ? (
          <div>
            <AppointmentScheduleCalendar
              services={activeServices}
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
                    endAt: new Date(
                      startAt.getTime() + 30 * 60_000,
                    ).toISOString(),
                    timezone:
                      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
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
            <AppointmentBlockedTimes
              blackouts={blackouts}
              onDeleteBlackout={onDeleteBlackout}
            />
          </div>
        ) : null}

        {activeTab === "waitlist" ? (
          <AppointmentWaitlist
            waitlist={waitlist}
            services={services}
            staff={staff}
          />
        ) : null}

        {activeTab === "services" ? (
          services.length ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-3">
                <p className="text-xs text-[var(--text-muted)]">
                  Active services are visible to customers. Inactive services
                  keep their booking history.
                </p>
                <div
                  className="flex rounded-lg bg-[var(--surface-card-muted)] p-1"
                  role="group"
                  aria-label="Filter services"
                >
                  {(["active", "inactive", "all"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setServiceFilter(status)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                        serviceFilter === status
                          ? "bg-[var(--surface-card)] text-[var(--text-strong)] shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              {filteredServices.length ? (
                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredServices.map((service) => (
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
                        {service.bufferBeforeMinutes ||
                        service.bufferAfterMinutes ? (
                          <span className="rounded-full bg-[var(--surface-card)] px-2.5 py-1">
                            {service.bufferBeforeMinutes +
                              service.bufferAfterMinutes}{" "}
                            min buffer
                          </span>
                        ) : null}
                        <span className="rounded-full bg-[var(--surface-card)] px-2.5 py-1">
                          {service.maxAttendees > 1
                            ? `Group · ${service.maxAttendees} seats`
                            : "Private"}
                        </span>
                        <span className="rounded-full bg-[var(--surface-card)] px-2.5 py-1">
                          {service.meetingType === "online"
                            ? "Online"
                            : service.meetingType === "in_person"
                              ? "In person"
                              : "Phone"}
                        </span>
                        {service.priceCents != null ? (
                          <span className="rounded-full bg-[var(--surface-card)] px-2.5 py-1">
                            {formatPrice(service.priceCents, service.currency)}
                          </span>
                        ) : null}
                        {service.waitlistEnabled ? (
                          <span className="rounded-full bg-[var(--surface-card)] px-2.5 py-1">
                            Waitlist on
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setServiceDeleteError(null);
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
                <EmptyState>No {serviceFilter} services.</EmptyState>
              )}
            </div>
          ) : (
            <EmptyState>
              No services yet. Add a service before creating team schedules.
            </EmptyState>
          )
        ) : null}

        {activeTab === "team" ? (
          staff.length ? (
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                <span>Team members</span>
                <span>
                  {staff.length} total ·{" "}
                  {staff.filter((member) => member.status === "active").length}{" "}
                  active
                </span>
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
                          {member.email ?? "No email"} ·{" "}
                          {member.phone ?? "No phone"} · {member.timezone}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-soft)]">
                          {member.services
                            ?.map((service) => service.name)
                            .join(", ") || "No services assigned"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden text-xs text-[var(--text-muted)] xl:inline">
                        {staffCalendarLabel(member.id)}
                      </span>
                      <StatusPill status={member.status} />
                      {canManageTeam ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaffId(member.id);
                            setDialog("staff_edit");
                          }}
                          className="h-9 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium hover:bg-[var(--surface-card)]"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Pencil size={13} /> Edit
                          </span>
                        </button>
                      ) : null}
                      {canManageTeam ? (
                        <button
                          type="button"
                          onClick={() => void openStaffSchedule(member)}
                          className="h-9 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-medium hover:bg-[var(--surface-card)]"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock size={13} /> Schedule
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {!staff.length ? (
                  <EmptyState>No team members yet.</EmptyState>
                ) : null}
              </div>
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
                    Workspace meeting calendar
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Connect one workspace Google or Outlook calendar to organize
                    every booking, create Meet or Teams links, and invite
                    customers and team members. Personal team calendars remain
                    optional and only prevent conflicts.
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
                            {connection.scope === "organization"
                              ? "Workspace organizer"
                              : (connection.staff?.name ??
                                staff.find(
                                  (item) => item.id === connection.staffId,
                                )?.name ??
                                "Team member")}
                          </p>
                        </div>
                      </div>
                      <StatusPill status={connection.status} />
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
                      <p>
                        {connection.accountEmail ?? "Authorization pending"}
                      </p>
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
                  Connect a workspace Google or Outlook calendar to create
                  meetings and send invitations.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "notifications" ? (
          <AppointmentNotifications
            policy={policy}
            deadLetters={deadLetters}
            onUpdatePolicy={onUpdatePolicy}
            onRetryDeadLetter={onRetryDeadLetter}
          />
        ) : null}
      </Card>

      {dialog ? (
        <Modal dialog={dialog} onClose={closeDialog}>
          {dialog === "blackout" ? (
            <form
              onSubmit={submitDialog(onCreateBlackout, true)}
              className="space-y-4"
            >
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                Mark a period when every service and team member is unavailable
                for booking.
              </p>
              <Field label="Reason">
                <input
                  name="name"
                  className="input"
                  placeholder="For example, office closed"
                  autoFocus
                  required
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Starts">
                  <input
                    name="startAt"
                    type="datetime-local"
                    className="input"
                    required
                  />
                </Field>
                <Field label="Ends">
                  <input
                    name="endAt"
                    type="datetime-local"
                    className="input"
                    required
                  />
                </Field>
              </div>
              <label className="flex items-center gap-3 text-sm text-[var(--text-base)]">
                <input
                  name="annual"
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--accent-primary)]"
                />
                Repeat every year
              </label>
              <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)]"
                >
                  Cancel
                </button>
                <button className="h-10 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
                  Block time
                </button>
              </div>
            </form>
          ) : dialog === "service" ? (
            <form
              onSubmit={submitDialog(onCreateService)}
              className="space-y-4"
            >
              <ServiceFormSection
                title="Service details"
                description="What customers are booking and how long the appointment lasts."
              >
                <div className="space-y-4">
                  <Field label="Service name">
                    <input
                      name="name"
                      className="input"
                      autoFocus
                      required
                      placeholder="For example, Product consultation"
                    />
                  </Field>
                  <Field label="Description (optional)">
                    <textarea
                      name="description"
                      rows={3}
                      className="input resize-y"
                      placeholder="Help customers understand what this appointment includes."
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Appointment duration (minutes)">
                      <input
                        name="durationMinutes"
                        type="number"
                        min="5"
                        max="1440"
                        defaultValue="30"
                        className="input"
                        required
                      />
                    </Field>
                    <Field label="Maximum attendees">
                      <input
                        name="maxAttendees"
                        type="number"
                        min="1"
                        max="100"
                        defaultValue="1"
                        className="input"
                        required
                      />
                    </Field>
                  </div>
                  <MeetingTypeFields />
                  <AssignmentChecklist
                    label="Team members invited by default (optional)"
                    name="defaultAttendeeStaffIds"
                    items={inviteableStaff}
                    empty="Add an email address to a team member before inviting them."
                  />
                </div>
              </ServiceFormSection>

              <ServiceFormSection
                title="Availability and capacity"
                description="Buffers reserve preparation or cleanup time without changing the appointment time customers see."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Preparation time before (minutes)">
                    <input
                      name="bufferBeforeMinutes"
                      type="number"
                      min="0"
                      max="240"
                      defaultValue="0"
                      className="input"
                    />
                  </Field>
                  <Field label="Cleanup time after (minutes)">
                    <input
                      name="bufferAfterMinutes"
                      type="number"
                      min="0"
                      max="240"
                      defaultValue="0"
                      className="input"
                    />
                  </Field>
                </div>
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-subtle)] p-3 text-sm text-[var(--text-base)]">
                  <input
                    name="waitlistEnabled"
                    type="checkbox"
                    defaultChecked
                    className="mt-0.5 h-4 w-4 accent-[var(--accent-primary)]"
                  />
                  <span>
                    <span className="block font-medium text-[var(--text-strong)]">
                      Allow customers to join a waitlist when full
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                      If a place opens, the next eligible customer can be
                      offered the slot.
                    </span>
                  </span>
                </label>
              </ServiceFormSection>

              <ServiceFormDisclosure
                title="Cancellation and rescheduling rules"
                description="Optional service-specific notice periods. Leave blank to use organization policy."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Minimum notice to cancel (minutes)">
                    <input
                      name="cancellationWindowMinutes"
                      type="number"
                      min="0"
                      max="43200"
                      className="input"
                      placeholder="Use organization default"
                    />
                  </Field>
                  <Field label="Minimum notice to reschedule (minutes)">
                    <input
                      name="rescheduleWindowMinutes"
                      type="number"
                      min="0"
                      max="43200"
                      className="input"
                      placeholder="Use organization default"
                    />
                  </Field>
                </div>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Examples: 60 = 1 hour, 1440 = 24 hours. Enter 0 to allow
                  changes until the appointment starts.
                </p>
              </ServiceFormDisclosure>

              <SubmitActions label="Create service" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "service_edit" && selectedService ? (
            <form
              onSubmit={submitDialog(onUpdateService)}
              className="space-y-4"
            >
              <input
                type="hidden"
                name="serviceId"
                value={selectedService.id}
              />
              <ServiceFormSection
                title="Service details"
                description="What customers are booking and how long the appointment lasts."
              >
                <div className="space-y-4">
                  <Field label="Service name">
                    <input
                      name="name"
                      className="input"
                      defaultValue={selectedService.name}
                      required
                    />
                  </Field>
                  <Field label="Description (optional)">
                    <textarea
                      name="description"
                      rows={3}
                      className="input resize-y"
                      defaultValue={selectedService.description ?? ""}
                      placeholder="Help customers understand what this appointment includes."
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Appointment duration (minutes)">
                      <input
                        name="durationMinutes"
                        type="number"
                        min="5"
                        max="1440"
                        defaultValue={selectedService.durationMinutes}
                        className="input"
                        required
                      />
                    </Field>
                    <Field label="Maximum attendees">
                      <input
                        name="maxAttendees"
                        type="number"
                        min="1"
                        max="100"
                        defaultValue={selectedService.maxAttendees}
                        className="input"
                        required
                      />
                    </Field>
                  </div>
                  <MeetingTypeFields
                    initialType={selectedService.meetingType}
                    initialLocation={selectedService.location ?? ""}
                  />
                  <AssignmentChecklist
                    label="Team members invited by default (optional)"
                    name="defaultAttendeeStaffIds"
                    items={inviteableStaff}
                    selectedIds={selectedService.defaultAttendeeStaffIds}
                    empty="Add an email address to a team member before inviting them."
                  />
                </div>
              </ServiceFormSection>

              <ServiceFormSection
                title="Availability and capacity"
                description="Buffers reserve preparation or cleanup time without changing the appointment time customers see."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Preparation time before (minutes)">
                    <input
                      name="bufferBeforeMinutes"
                      type="number"
                      min="0"
                      max="240"
                      defaultValue={selectedService.bufferBeforeMinutes}
                      className="input"
                      required
                    />
                  </Field>
                  <Field label="Cleanup time after (minutes)">
                    <input
                      name="bufferAfterMinutes"
                      type="number"
                      min="0"
                      max="240"
                      defaultValue={selectedService.bufferAfterMinutes}
                      className="input"
                      required
                    />
                  </Field>
                </div>
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-subtle)] p-3 text-sm text-[var(--text-base)]">
                  <input
                    name="waitlistEnabled"
                    type="checkbox"
                    defaultChecked={selectedService.waitlistEnabled}
                    className="mt-0.5 h-4 w-4 accent-[var(--accent-primary)]"
                  />
                  <span>
                    <span className="block font-medium text-[var(--text-strong)]">
                      Allow customers to join a waitlist when full
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                      If a place opens, the next eligible customer can be
                      offered the slot.
                    </span>
                  </span>
                </label>
              </ServiceFormSection>

              <ServiceFormSection
                title="Service availability"
                description="Inactive services are hidden from new bookings while existing history is preserved."
              >
                <Field label="Booking status">
                  <select
                    name="status"
                    className="input"
                    defaultValue={selectedService.status}
                  >
                    <option value="active">
                      Active — available for new bookings
                    </option>
                    <option value="inactive">
                      Inactive — hidden from new bookings
                    </option>
                  </select>
                </Field>
              </ServiceFormSection>

              <ServiceFormDisclosure
                title="Cancellation and rescheduling rules"
                description="Optional service-specific notice periods. Leave blank to use organization policy."
                defaultOpen={
                  selectedService.cancellationWindowMinutes != null ||
                  selectedService.rescheduleWindowMinutes != null
                }
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Minimum notice to cancel (minutes)">
                    <input
                      name="cancellationWindowMinutes"
                      type="number"
                      min="0"
                      max="43200"
                      defaultValue={
                        selectedService.cancellationWindowMinutes ?? ""
                      }
                      className="input"
                      placeholder="Use organization default"
                    />
                  </Field>
                  <Field label="Minimum notice to reschedule (minutes)">
                    <input
                      name="rescheduleWindowMinutes"
                      type="number"
                      min="0"
                      max="43200"
                      defaultValue={
                        selectedService.rescheduleWindowMinutes ?? ""
                      }
                      className="input"
                      placeholder="Use organization default"
                    />
                  </Field>
                </div>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Examples: 60 = 1 hour, 1440 = 24 hours. Enter 0 to allow
                  changes until the appointment starts.
                </p>
              </ServiceFormDisclosure>

              {serviceDeleteError ? (
                <p
                  role="alert"
                  className="rounded-xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]"
                >
                  {serviceDeleteError}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-5">
                <button
                  type="button"
                  onClick={() => void deleteSelectedService()}
                  disabled={serviceDeleting}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                  {serviceDeleting ? "Deleting…" : "Delete permanently"}
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)]"
                  >
                    Cancel
                  </button>
                  <button className="h-10 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
                    Save service
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {dialog === "staff" ? (
            availableStaffUsers.length ? (
              <form
                onSubmit={async (event) => {
                  if (await onCreateStaff(event)) closeDialog();
                }}
                className="space-y-4"
              >
                <Field label="Workspace user">
                  <select
                    name="userId"
                    className="input"
                    autoFocus
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select an active user
                    </option>
                    {availableStaffUsers.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} · {candidate.email}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="rounded-xl bg-[var(--surface-card-muted)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
                  Name and email stay synchronized with the workspace account.
                  Only active users with Appointment Booking access are shown.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Phone">
                    <input
                      name="phone"
                      type="tel"
                      className="input"
                      placeholder="+1 650 253 0000"
                    />
                  </Field>
                  <Field label="Timezone">
                    <input
                      name="timezone"
                      className="input"
                      defaultValue={
                        Intl.DateTimeFormat().resolvedOptions().timeZone ||
                        "UTC"
                      }
                      required
                    />
                  </Field>
                </div>
                <AssignmentChecklist
                  label="Services"
                  name="serviceIds"
                  items={activeServices}
                  empty="Create an active service before assigning bookable work."
                />
                <SubmitActions label="Add team member" onClose={closeDialog} />
              </form>
            ) : (
              <div className="space-y-4">
                <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-5 text-sm leading-6 text-[var(--text-muted)]">
                  Every eligible workspace user already has a scheduling
                  profile, or no active user currently has Appointment Booking
                  access. Add or update a user in Access Control first.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            )
          ) : null}

          {dialog === "staff_edit" && selectedStaff ? (
            <form
              onSubmit={async (event) => {
                if (await onUpdateStaff(event)) closeDialog();
              }}
              className="space-y-4"
            >
              <input type="hidden" name="staffId" value={selectedStaff.id} />
              <Field label="Workspace user">
                <select
                  name="userId"
                  className="input"
                  defaultValue={selectedStaff.userId ?? ""}
                  required
                >
                  <option value="" disabled>
                    Select an active user
                  </option>
                  {eligibleUsers
                    .filter(
                      (candidate) =>
                        !candidate.appointmentStaffId ||
                        candidate.appointmentStaffId === selectedStaff.id,
                    )
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} · {candidate.email}
                      </option>
                    ))}
                  {selectedStaff.userId &&
                  !eligibleUsers.some(
                    (candidate) => candidate.id === selectedStaff.userId,
                  ) ? (
                    <option value={selectedStaff.userId}>
                      {selectedStaff.name} · {selectedStaff.email ?? "No email"}{" "}
                      (access removed)
                    </option>
                  ) : null}
                </select>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Status">
                  <select
                    name="status"
                    className="input"
                    defaultValue={selectedStaff.status}
                  >
                    <option value="active">Active — accepts bookings</option>
                    <option value="inactive">
                      Inactive — history preserved
                    </option>
                  </select>
                </Field>
                <Field label="Phone">
                  <input
                    name="phone"
                    type="tel"
                    className="input"
                    defaultValue={selectedStaff.phone ?? ""}
                    placeholder="+1 650 253 0000"
                  />
                </Field>
              </div>
              <Field label="Timezone">
                <input
                  name="timezone"
                  className="input"
                  defaultValue={selectedStaff.timezone}
                  required
                />
              </Field>
              <AssignmentChecklist
                label="Services"
                name="serviceIds"
                items={services}
                selectedIds={selectedStaff.services.map(
                  (service) => service.id,
                )}
                empty="No services configured."
              />
              <p className="text-xs text-[var(--text-muted)]">
                Deactivating a member removes them from new availability and
                auto-assignment while preserving existing bookings and history.
              </p>
              <SubmitActions label="Save team member" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "staff_schedule" && selectedStaff ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4">
                <p className="font-medium text-[var(--text-strong)]">
                  {selectedStaff.name}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Hours are interpreted in {selectedStaff.timezone}. Time off is
                  stored as an exact date and time.
                </p>
              </div>
              {staffScheduleLoading ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Loading schedule…
                </p>
              ) : null}
              {staffScheduleError ? (
                <p className="rounded-lg bg-[var(--danger-bg)] p-3 text-sm text-[var(--danger-text)]">
                  {staffScheduleError}
                </p>
              ) : null}
              {!staffScheduleLoading ? (
                <>
                  <section>
                    <h3 className="font-semibold text-[var(--text-strong)]">
                      Weekly hours
                    </h3>
                    <div className="mt-3 space-y-2">
                      {staffAvailability.map((window) => (
                        <div
                          key={window.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
                        >
                          <span>
                            <strong>{dayNames[window.dayOfWeek]}</strong> ·{" "}
                            {window.startTime}–{window.endTime}
                          </span>
                          <button
                            type="button"
                            aria-label="Remove weekly hours"
                            onClick={() =>
                              void removeStaffAvailability(
                                selectedStaff.id,
                                window.id,
                              )
                            }
                            className="grid h-8 w-8 place-items-center rounded-md text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                      {!staffAvailability.length ? (
                        <p className="text-sm text-[var(--text-muted)]">
                          No weekly hours yet. This member will not appear in
                          available slots.
                        </p>
                      ) : null}
                    </div>
                    <form
                      className="mt-3 grid gap-3 rounded-lg bg-[var(--surface-card-muted)] p-3 sm:grid-cols-[1fr_110px_110px_auto] sm:items-end"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const formElement = event.currentTarget;
                        const form = new FormData(formElement);
                        try {
                          const item = await onAddStaffAvailability(
                            selectedStaff.id,
                            {
                              dayOfWeek: Number(form.get("dayOfWeek")),
                              startTime: String(form.get("startTime")),
                              endTime: String(form.get("endTime")),
                            },
                          );
                          setStaffAvailability((items) =>
                            [...items, item].sort(
                              (a, b) =>
                                a.dayOfWeek - b.dayOfWeek ||
                                a.startTime.localeCompare(b.startTime),
                            ),
                          );
                          formElement.reset();
                          setStaffScheduleError(null);
                        } catch (error) {
                          setStaffScheduleError(
                            error instanceof Error
                              ? error.message
                              : "Could not add weekly hours",
                          );
                        }
                      }}
                    >
                      <Field label="Day">
                        <select
                          name="dayOfWeek"
                          className="input"
                          defaultValue="1"
                        >
                          {dayNames.map((day, index) => (
                            <option key={day} value={index}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Starts">
                        <input
                          name="startTime"
                          type="time"
                          className="input"
                          defaultValue="09:00"
                          required
                        />
                      </Field>
                      <Field label="Ends">
                        <input
                          name="endTime"
                          type="time"
                          className="input"
                          defaultValue="17:00"
                          required
                        />
                      </Field>
                      <button className="h-10 rounded-md bg-[var(--accent-primary)] px-3 text-sm font-medium text-white">
                        Add hours
                      </button>
                    </form>
                  </section>
                  <section className="border-t border-[var(--border-subtle)] pt-5">
                    <h3 className="font-semibold text-[var(--text-strong)]">
                      Time off
                    </h3>
                    <div className="mt-3 space-y-2">
                      {staffTimeOff.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
                        >
                          <span>
                            <strong>{formatDateTime(item.startAt)}</strong> to{" "}
                            {formatDateTime(item.endAt)}
                            {item.reason ? ` · ${item.reason}` : ""}
                          </span>
                          <button
                            type="button"
                            aria-label="Remove time off"
                            onClick={() =>
                              void removeStaffTimeOff(selectedStaff.id, item.id)
                            }
                            className="grid h-8 w-8 place-items-center rounded-md text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                      {!staffTimeOff.length ? (
                        <p className="text-sm text-[var(--text-muted)]">
                          No time off scheduled.
                        </p>
                      ) : null}
                    </div>
                    <form
                      className="mt-3 grid gap-3 rounded-lg bg-[var(--surface-card-muted)] p-3 sm:grid-cols-2"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const formElement = event.currentTarget;
                        const form = new FormData(formElement);
                        try {
                          const item = await onAddStaffTimeOff(
                            selectedStaff.id,
                            {
                              startAt: String(form.get("startAt")),
                              endAt: String(form.get("endAt")),
                              reason:
                                String(form.get("reason") || "") || undefined,
                            },
                          );
                          setStaffTimeOff((items) =>
                            [...items, item].sort((a, b) =>
                              a.startAt.localeCompare(b.startAt),
                            ),
                          );
                          formElement.reset();
                          setStaffScheduleError(null);
                        } catch (error) {
                          setStaffScheduleError(
                            error instanceof Error
                              ? error.message
                              : "Could not add time off",
                          );
                        }
                      }}
                    >
                      <Field label="Starts">
                        <input
                          name="startAt"
                          type="datetime-local"
                          className="input"
                          required
                        />
                      </Field>
                      <Field label="Ends">
                        <input
                          name="endAt"
                          type="datetime-local"
                          className="input"
                          required
                        />
                      </Field>
                      <Field label="Reason">
                        <input
                          name="reason"
                          className="input"
                          placeholder="Vacation, training, personal…"
                        />
                      </Field>
                      <button className="h-10 self-end rounded-md bg-[var(--accent-primary)] px-3 text-sm font-medium text-white">
                        Block time
                      </button>
                    </form>
                  </section>
                </>
              ) : null}
            </div>
          ) : null}

          {dialog === "availability" ? (
            <form
              onSubmit={submitDialog(onCreateAvailability)}
              className="space-y-4"
            >
              <Field label="Team member">
                <select
                  name="staffId"
                  className="input"
                  defaultValue={selectedStaffId}
                  required
                >
                  <option value="">Choose a team member</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Day">
                  <select name="dayOfWeek" className="input" defaultValue="1">
                    {[
                      [0, "Sunday"],
                      [1, "Monday"],
                      [2, "Tuesday"],
                      [3, "Wednesday"],
                      [4, "Thursday"],
                      [5, "Friday"],
                      [6, "Saturday"],
                    ].map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Starts">
                  <input
                    name="startTime"
                    type="time"
                    defaultValue="09:00"
                    className="input"
                    required
                  />
                </Field>
                <Field label="Ends">
                  <input
                    name="endTime"
                    type="time"
                    defaultValue="17:00"
                    className="input"
                    required
                  />
                </Field>
              </div>
              <SubmitActions label="Add hours" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "timeoff" ? (
            <form
              onSubmit={submitDialog(onCreateTimeOff)}
              className="space-y-4"
            >
              <Field label="Team member">
                <select
                  name="staffId"
                  className="input"
                  defaultValue={selectedStaffId}
                  required
                >
                  <option value="">Choose a team member</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Starts">
                  <input
                    name="startAt"
                    type="datetime-local"
                    className="input"
                    required
                  />
                </Field>
                <Field label="Ends">
                  <input
                    name="endAt"
                    type="datetime-local"
                    className="input"
                    required
                  />
                </Field>
              </div>
              <Field label="Reason">
                <input
                  name="reason"
                  className="input"
                  placeholder="Vacation, meeting, unavailable…"
                />
              </Field>
              <SubmitActions label="Block time" onClose={closeDialog} />
            </form>
          ) : null}

          {dialog === "booking" ? (
            <form
              key={bookingDefaults?.startAt ?? "blank"}
              onSubmit={submitDialog(onCreateBooking, true)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Service">
                  <select
                    name="serviceId"
                    className="input"
                    defaultValue={bookingServiceId}
                    required
                  >
                    <option value="">Choose a service</option>
                    {activeServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Team member">
                  <select
                    name="staffId"
                    className="input"
                    defaultValue={bookingDefaults?.staffId ?? ""}
                  >
                    <option value="">Auto assign</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <AssignmentChecklist
                label="Additional team attendees (optional)"
                name="attendeeStaffIds"
                items={inviteableStaff}
                empty="Add an email address to a team member before inviting them."
              />
              <Field label="Start time">
                <input
                  name="startAt"
                  type="datetime-local"
                  className="input"
                  defaultValue={
                    bookingDefaults
                      ? new Date(
                          new Date(bookingDefaults.startAt).getTime() -
                            new Date(
                              bookingDefaults.startAt,
                            ).getTimezoneOffset() *
                              60_000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
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
                  <input
                    name="partySize"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue="1"
                    className="input"
                    required
                  />
                </Field>
              </div>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4">
                <p className="mb-3 text-sm font-medium text-[var(--text-strong)]">
                  Recurring appointment (optional)
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Frequency">
                    <select
                      name="recurrenceFrequency"
                      className="input"
                      defaultValue=""
                    >
                      <option value="">Does not repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </Field>
                  <Field label="Every">
                    <input
                      name="recurrenceInterval"
                      type="number"
                      min="1"
                      max="12"
                      defaultValue="1"
                      className="input"
                    />
                  </Field>
                  <Field label="Occurrences">
                    <input
                      name="recurrenceCount"
                      type="number"
                      min="2"
                      max="52"
                      defaultValue="2"
                      className="input"
                    />
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
            <form
              onSubmit={submitDialog(onRescheduleBooking, true)}
              className="space-y-4"
            >
              <input
                type="hidden"
                name="bookingId"
                value={selectedBooking.id}
              />
              <div className="rounded-2xl bg-[var(--surface-card-muted)] p-4 text-sm">
                <p className="font-medium text-[var(--text-strong)]">
                  {selectedBooking.customerName}
                </p>
                <p className="mt-1 text-[var(--text-muted)]">
                  Currently {formatDateTime(selectedBooking.startAt)}
                </p>
              </div>
              <Field label="Team member">
                <select
                  name="staffId"
                  className="input"
                  defaultValue={selectedBooking.staffId}
                >
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="New start time">
                <input
                  name="startAt"
                  type="datetime-local"
                  className="input"
                  required
                />
              </Field>
              {selectedBooking.seriesId ? (
                <label className="flex items-start gap-3 rounded-xl bg-[var(--surface-card-muted)] p-4 text-sm text-[var(--text-base)]">
                  <input name="applyToFuture" type="checkbox" />
                  <span>
                    <strong className="text-[var(--text-strong)]">
                      Apply to future occurrences
                    </strong>
                    <br />
                    Move this appointment and every later occurrence by the same
                    amount.
                  </span>
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
                  calendarScope,
                  calendarScope === "staff"
                    ? String(form.get("staffId"))
                    : undefined,
                );
              }}
            >
              <Field label="How will this calendar be used?">
                <select
                  name="scope"
                  className="input"
                  value={calendarScope}
                  onChange={(event) =>
                    setCalendarScope(
                      event.target.value as "organization" | "staff",
                    )
                  }
                >
                  <option value="organization">
                    Workspace organizer — create meetings and invitations
                  </option>
                  <option value="staff">
                    Team availability — prevent scheduling conflicts
                  </option>
                </select>
              </Field>
              {calendarScope === "staff" ? (
                <Field label="Team member">
                  <select name="staffId" className="input" required>
                    <option value="">Choose a team member</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4 text-sm text-[var(--text-muted)]">
                  This account becomes the organizer for all bookings and
                  creates Google Meet or Microsoft Teams links.
                </div>
              )}
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-[var(--text-base)]">
                  Calendar provider
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { id: "google", label: "Google Calendar", mark: "G" },
                    { id: "microsoft", label: "Microsoft Outlook", mark: "M" },
                  ].map((provider) => (
                    <label
                      key={provider.id}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--border-strong)] p-4 hover:bg-[var(--surface-hover)]"
                    >
                      <input
                        type="radio"
                        name="provider"
                        value={provider.id}
                        required
                      />
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-tint)] font-bold text-[var(--accent-primary)]">
                        {provider.mark}
                      </span>
                      <span className="text-sm font-medium text-[var(--text-strong)]">
                        {provider.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="rounded-2xl bg-[var(--surface-card-muted)] p-4 text-sm text-[var(--text-muted)]">
                You’ll be sent to the provider to grant calendar access, then
                returned here automatically.
              </div>
              <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-5">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium hover:bg-[var(--surface-hover)]"
                >
                  Cancel
                </button>
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
