"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  ListFilter,
  Plus,
  RefreshCw,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AppointmentBooking,
  AppointmentScheduleFeed,
  AppointmentService,
  AppointmentStaff,
} from "@/lib/types";
import { EmptyState, StatusPill } from "./ui";

type CalendarView = "month" | "week" | "day";
type BookingStatus = AppointmentBooking["status"] | "all";

const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const serviceColors = [
  "border-blue-300 bg-blue-50 text-blue-800",
  "border-cyan-300 bg-cyan-50 text-cyan-800",
  "border-violet-300 bg-violet-50 text-violet-800",
  "border-amber-300 bg-amber-50 text-amber-800",
  "border-emerald-300 bg-emerald-50 text-emerald-800",
  "border-rose-300 bg-rose-50 text-rose-800",
];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRange(anchor: Date, view: CalendarView) {
  if (view === "month") {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const from = addDays(first, -first.getDay());
    const to = new Date(addDays(from, 42).getTime() - 1);
    return { from, to };
  }
  if (view === "week") {
    const from = addDays(startOfDay(anchor), -anchor.getDay());
    const to = new Date(addDays(from, 7).getTime() - 1);
    return { from, to };
  }
  const from = startOfDay(anchor);
  return { from, to: new Date(addDays(from, 1).getTime() - 1) };
}

function viewTitle(anchor: Date, view: CalendarView) {
  if (view === "month") {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(anchor);
  }
  if (view === "week") {
    const from = addDays(startOfDay(anchor), -anchor.getDay());
    const to = addDays(from, 6);
    return `${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(from)} – ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(to)}`;
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(anchor);
}

export function AppointmentScheduleCalendar({
  services,
  staff,
  onLoadRange,
  onCreateAt,
  onReschedule,
  onCancel,
  onCheckIn,
  onMoveBooking,
  refreshVersion,
}: {
  services: AppointmentService[];
  staff: AppointmentStaff[];
  onLoadRange: (from: Date, to: Date) => Promise<AppointmentScheduleFeed>;
  onCreateAt: (startAt?: Date) => void;
  onReschedule: (booking: AppointmentBooking) => void;
  onCancel: (id: string) => Promise<void> | void;
  onCheckIn: (id: string) => Promise<void> | void;
  onMoveBooking: (booking: AppointmentBooking, startAt: Date) => Promise<void>;
  refreshVersion: number;
}) {
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [feed, setFeed] = useState<AppointmentScheduleFeed>({
    bookings: [],
    availability: [],
    staffTimeOff: [],
    resourceTimeOff: [],
    blackouts: [],
    waitlist: [],
    externalBusy: [],
    calendarFailures: [],
  });
  const [selectedBooking, setSelectedBooking] =
    useState<AppointmentBooking | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [serviceId, setServiceId] = useState("all");
  const [staffId, setStaffId] = useState("all");
  const [status, setStatus] = useState<BookingStatus>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [layers, setLayers] = useState({
    external: true,
    timeOff: true,
    blackouts: true,
    waitlist: true,
    availability: false,
  });
  const loadRef = useRef(onLoadRange);

  useEffect(() => {
    loadRef.current = onLoadRange;
  }, [onLoadRange]);

  const range = useMemo(() => getRange(anchor, view), [anchor, view]);
  const rangeKey = `${range.from.getTime()}-${range.to.getTime()}-${reloadVersion}-${refreshVersion}`;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const loaded = await loadRef.current(range.from, range.to);
        if (!cancelled) setFeed(loaded);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load the appointment calendar",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [rangeKey, range.from, range.to]);

  const filtered = useMemo(
    () =>
      feed.bookings.filter(
        (booking) =>
          (serviceId === "all" || booking.serviceId === serviceId) &&
          (staffId === "all" || booking.staffId === staffId) &&
          (status === "all" || booking.status === status),
      ),
    [feed.bookings, serviceId, staffId, status],
  );

  const calendarFailureIds = useMemo(
    () => new Set(feed.calendarFailures.map((failure) => failure.bookingId)),
    [feed.calendarFailures],
  );

  type ScheduleMarker = {
    id: string;
    date: string;
    label: string;
    detail: string;
    kind: "external" | "timeOff" | "blackout" | "waitlist" | "availability";
    staffId?: string;
    serviceId?: string;
  };
  const scheduleMarkers = useMemo(() => {
    const markers: ScheduleMarker[] = [];
    const addInterval = (
      id: string,
      startAt: string,
      endAt: string,
      label: string,
      detail: string,
      kind: ScheduleMarker["kind"],
      extra: Pick<ScheduleMarker, "staffId" | "serviceId"> = {},
    ) => {
      let day = startOfDay(new Date(startAt));
      const last = new Date(endAt);
      while (day < last && day <= range.to) {
        if (day >= startOfDay(range.from)) {
          markers.push({ id: `${id}:${dateKey(day)}`, date: dateKey(day), label, detail, kind, ...extra });
        }
        day = addDays(day, 1);
      }
    };
    if (layers.external) {
      for (const item of feed.externalBusy) addInterval(item.id, item.startAt, item.endAt, "External busy", `${formatTime(item.startAt)} · ${item.staffName}`, "external", { staffId: item.staffId });
    }
    if (layers.timeOff) {
      for (const item of feed.staffTimeOff) addInterval(item.id, item.startAt, item.endAt, "Staff time off", `${item.staff.name}${item.reason ? ` · ${item.reason}` : ""}`, "timeOff", { staffId: item.staffId });
      for (const item of feed.resourceTimeOff) addInterval(item.id, item.startAt, item.endAt, "Resource unavailable", `${item.resource.name}${item.reason ? ` · ${item.reason}` : ""}`, "timeOff");
    }
    if (layers.blackouts) {
      for (const item of feed.blackouts) {
        if (item.annual) {
          const originalStart = new Date(item.startAt);
          const duration = new Date(item.endAt).getTime() - originalStart.getTime();
          for (let year = range.from.getUTCFullYear() - 1; year <= range.to.getUTCFullYear(); year += 1) {
            const projectedStart = new Date(Date.UTC(year, originalStart.getUTCMonth(), originalStart.getUTCDate(), originalStart.getUTCHours(), originalStart.getUTCMinutes(), originalStart.getUTCSeconds()));
            const projectedEnd = new Date(projectedStart.getTime() + duration);
            addInterval(`${item.id}:${year}`, projectedStart.toISOString(), projectedEnd.toISOString(), "Blackout", item.name, "blackout");
          }
        } else addInterval(item.id, item.startAt, item.endAt, "Blackout", item.name, "blackout");
      }
    }
    if (layers.waitlist) {
      for (const item of feed.waitlist) addInterval(item.id, item.startAt, item.endAt, "Waitlist", `${formatTime(item.startAt)} · ${item.customerName} · #${item.position}`, "waitlist", { staffId: item.staffId, serviceId: item.serviceId });
    }
    if (layers.availability) {
      for (let day = startOfDay(range.from); day <= range.to; day = addDays(day, 1)) {
        for (const item of feed.availability.filter((rule) => rule.dayOfWeek === day.getDay())) markers.push({ id: `${item.id}:${dateKey(day)}`, date: dateKey(day), label: "Available", detail: `${item.startTime}–${item.endTime} · ${item.staff.name}`, kind: "availability", staffId: item.staffId });
      }
    }
    return markers.filter((marker) => (staffId === "all" || !marker.staffId || marker.staffId === staffId) && (serviceId === "all" || !marker.serviceId || marker.serviceId === serviceId));
  }, [feed, layers, range.from, range.to, serviceId, staffId]);

  const markersByDate = useMemo(() => {
    const grouped = new Map<string, ScheduleMarker[]>();
    for (const marker of scheduleMarkers) grouped.set(marker.date, [...(grouped.get(marker.date) ?? []), marker]);
    return grouped;
  }, [scheduleMarkers]);

  const byDate = useMemo(() => {
    const grouped = new Map<string, AppointmentBooking[]>();
    for (const booking of filtered) {
      const key = dateKey(booking.startAt);
      grouped.set(key, [...(grouped.get(key) ?? []), booking]);
    }
    return grouped;
  }, [filtered]);

  const stats = useMemo(() => {
    const today = dateKey(new Date());
    return {
      total: filtered.length,
      today: filtered.filter((booking) => dateKey(booking.startAt) === today)
        .length,
      confirmed: filtered.filter((booking) => booking.status === "confirmed")
        .length,
      attended: filtered.filter(
        (booking) => Boolean(booking.checkedInAt) || booking.status === "completed",
      ).length,
    };
  }, [filtered]);

  const monthDays = useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(range.from, index)),
    [range.from],
  );
  const weekDays = useMemo(() => {
    const first = addDays(startOfDay(anchor), -anchor.getDay());
    return Array.from({ length: 7 }, (_, index) => addDays(first, index));
  }, [anchor]);

  const serviceName = (id: string) =>
    services.find((service) => service.id === id)?.name ?? "Service";
  const staffName = (id: string) =>
    staff.find((member) => member.id === id)?.name ?? "Unassigned";
  const eventColor = (booking: AppointmentBooking) => {
    const index = Math.max(
      0,
      services.findIndex((service) => service.id === booking.serviceId),
    );
    if (booking.status === "cancelled")
      return "border-slate-300 bg-slate-100 text-slate-500 line-through";
    if (booking.status === "no_show")
      return "border-rose-300 bg-rose-50 text-rose-800";
    return serviceColors[index % serviceColors.length];
  };

  const navigate = (direction: number) => {
    const next = new Date(anchor);
    if (view === "month") next.setMonth(next.getMonth() + direction);
    else next.setDate(next.getDate() + direction * (view === "week" ? 7 : 1));
    setAnchor(next);
  };

  const openDay = (date: Date, openModal = false) => {
    setSelectedDate(dateKey(date));
    setAnchor(date);
    if (openModal) setDayModalOpen(true);
  };

  const createOnDate = (date: Date) => {
    const startAt = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      9,
      0,
    );
    onCreateAt(startAt);
  };

  const dropBooking = async (date: Date) => {
    const booking = feed.bookings.find((item) => item.id === draggingId);
    setDraggingId(null);
    if (!booking) return;
    const previous = new Date(booking.startAt);
    const next = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      previous.getHours(),
      previous.getMinutes(),
    );
    if (dateKey(previous) === dateKey(next)) return;
    if (!window.confirm(`Move ${booking.customerName} to ${formatDateTime(next.toISOString())}?`)) return;
    setLoading(true);
    try {
      await onMoveBooking(booking, next);
      setReloadVersion((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to move appointment");
    } finally {
      setLoading(false);
    }
  };

  const markerColor: Record<ScheduleMarker["kind"], string> = {
    external: "border-slate-400 bg-slate-100 text-slate-700",
    timeOff: "border-zinc-400 bg-zinc-100 text-zinc-700",
    blackout: "border-rose-400 bg-rose-100 text-rose-800",
    waitlist: "border-amber-400 bg-amber-100 text-amber-800",
    availability: "border-emerald-400 bg-emerald-50 text-emerald-800",
  };
  const renderMarker = (marker: ScheduleMarker) => (
    <div key={marker.id} className={`block w-full truncate rounded-lg border-l-[3px] px-2 py-1.5 text-left text-[10px] ${markerColor[marker.kind]}`} title={`${marker.label} · ${marker.detail}`}>
      <span className="font-semibold">{marker.label}</span> · {marker.detail}
    </div>
  );

  const renderEvent = (booking: AppointmentBooking, compact = false) => (
    <button
      key={booking.id}
      type="button"
      draggable={!['cancelled', 'completed', 'no_show'].includes(booking.status)}
      onDragStart={(event) => {
        event.stopPropagation();
        setDraggingId(booking.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => setDraggingId(null)}
      onClick={(event) => {
        event.stopPropagation();
        setSelectedBooking(booking);
      }}
      className={`block w-full truncate rounded-lg border-l-[3px] px-2 py-1.5 text-left text-[11px] font-medium transition hover:brightness-95 ${eventColor(booking)}`}
      title={`${formatTime(booking.startAt)} · ${booking.customerName} · ${serviceName(booking.serviceId)}`}
    >
      <span className="font-semibold">{formatTime(booking.startAt)}</span>{calendarFailureIds.has(booking.id) ? " ⚠" : ""}
      {!compact ? ` · ${booking.customerName}` : ` ${booking.customerName}`}
    </button>
  );

  const selectedDayBookings = byDate.get(selectedDate) ?? [];
  const isToday = (date: Date) => dateKey(date) === dateKey(new Date());

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-strong)]">
            Appointment calendar
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            View and manage the complete team schedule in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
          </p>
        </div>
        <button
          type="button"
          onClick={() => onCreateAt(anchor)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]"
        >
          <Plus className="h-4 w-4" /> New appointment
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: `Total this ${view}`, value: stats.total, icon: CalendarDays },
          { label: "Today", value: stats.today, icon: Clock3 },
          { label: "Confirmed", value: stats.confirmed, icon: CheckCircle2 },
          { label: "Attended", value: stats.attended, icon: UserCheck },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-[var(--text-strong)]">{item.value}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{item.label}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-tint)] text-[var(--accent-primary)]"><Icon className="h-5 w-5" /></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-[var(--surface-card)] p-1">
              {(["month", "week", "day"] as CalendarView[]).map((item) => (
                <button key={item} type="button" onClick={() => setView(item)} className={`h-9 rounded-lg px-3 text-sm font-medium capitalize ${view === item ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"}`}>{item}</button>
              ))}
            </div>
            <button type="button" onClick={() => navigate(-1)} aria-label="Previous period" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)]"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setAnchor(new Date())} className="h-9 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 text-sm font-medium hover:bg-[var(--surface-hover)]">Today</button>
            <button type="button" onClick={() => navigate(1)} aria-label="Next period" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)]"><ChevronRight className="h-4 w-4" /></button>
            <h3 className="ml-1 text-base font-semibold text-[var(--text-strong)]">{viewTitle(anchor, view)}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ListFilter className="h-4 w-4 text-[var(--text-soft)]" />
            <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="input !w-auto min-w-36"><option value="all">All services</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select>
            <select value={staffId} onChange={(event) => setStaffId(event.target.value)} className="input !w-auto min-w-36"><option value="all">All staff</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
            <select value={status} onChange={(event) => setStatus(event.target.value as BookingStatus)} className="input !w-auto min-w-32"><option value="all">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="no_show">No-show</option><option value="cancelled">Cancelled</option></select>
            <button type="button" onClick={() => setReloadVersion((value) => value + 1)} aria-label="Refresh calendar" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)]"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
          <span className="mr-1 text-xs font-semibold text-[var(--text-muted)]">Schedule layers</span>
          {([
            ["external", "External busy"],
            ["timeOff", "Time off"],
            ["blackouts", "Blackouts"],
            ["waitlist", "Waitlist"],
            ["availability", "Availability"],
          ] as const).map(([key, label]) => (
            <label key={key} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 text-xs text-[var(--text-base)]">
              <input type="checkbox" checked={layers[key]} onChange={(event) => setLayers((current) => ({ ...current, [key]: event.target.checked }))} />
              {label}
            </label>
          ))}
          {feed.calendarFailures.length ? <span className="ml-auto rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800">⚠ {feed.calendarFailures.length} calendar sync issue{feed.calendarFailures.length === 1 ? "" : "s"}</span> : null}
        </div>
      </div>

      {error ? <div className="rounded-xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">{error}</div> : null}

      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)]">
        {loading ? <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--surface-card)]/80 backdrop-blur-sm"><div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 text-sm text-[var(--text-muted)]"><RefreshCw className="h-4 w-4 animate-spin" /> Loading schedule…</div></div> : null}

        {view === "month" ? (
          <div className="min-w-[900px] overflow-x-auto">
            <div className="grid grid-cols-7 border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)]">{dayLabels.map((day) => <div key={day} className="px-3 py-2 text-center text-[10px] font-semibold tracking-[0.15em] text-[var(--text-soft)]">{day}</div>)}</div>
            <div className="grid grid-cols-7">
              {monthDays.map((date) => {
                const key = dateKey(date);
                const items = byDate.get(key) ?? [];
                const currentMonth = date.getMonth() === anchor.getMonth();
                return (
                  <div key={key} role="button" tabIndex={0} onClick={() => openDay(date, true)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openDay(date, true); }} onDragOver={(event) => { if (draggingId) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }} onDrop={(event) => { event.preventDefault(); void dropBooking(date); }} className={`min-h-32 border-b border-r border-[var(--border-subtle)] p-2 text-left align-top hover:bg-[var(--surface-hover)] ${currentMonth ? "bg-[var(--surface-card)]" : "bg-[var(--surface-card-muted)] opacity-65"} ${selectedDate === key ? "ring-2 ring-inset ring-[var(--accent-primary)]" : ""} ${draggingId ? "hover:ring-2 hover:ring-inset hover:ring-[var(--accent-primary)]" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${isToday(date) ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-base)]"}`}>{date.getDate()}</span>
                      <button type="button" aria-label={`Add appointment on ${date.toLocaleDateString()}`} title="Add appointment" onClick={(event) => { event.stopPropagation(); createOnDate(date); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-soft)] hover:bg-[var(--surface-tint)] hover:text-[var(--accent-primary)]"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="mt-1 space-y-1">{items.slice(0, 3).map((booking) => renderEvent(booking, true))}{(markersByDate.get(key) ?? []).slice(0, Math.max(0, 3 - items.length)).map(renderMarker)}{items.length + (markersByDate.get(key)?.length ?? 0) > 3 ? <span className="block px-2 text-[10px] font-medium text-[var(--text-muted)]">+{items.length + (markersByDate.get(key)?.length ?? 0) - 3} more</span> : null}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {view === "week" ? (
          <div className="min-w-[900px] overflow-x-auto">
            <div className="grid grid-cols-7">
              {weekDays.map((date) => {
                const key = dateKey(date);
                const items = byDate.get(key) ?? [];
                return (
                  <div key={key} onDragOver={(event) => { if (draggingId) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); void dropBooking(date); }} className="min-h-[520px] border-r border-[var(--border-subtle)] last:border-r-0">
                    <button type="button" onClick={() => openDay(date)} className="w-full border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-3 py-3 text-center hover:bg-[var(--surface-hover)]"><span className="block text-[10px] font-semibold tracking-[0.14em] text-[var(--text-soft)]">{dayLabels[date.getDay()]}</span><span className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${isToday(date) ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-strong)]"}`}>{date.getDate()}</span></button>
                    <div className="space-y-2 p-2">{items.map((booking) => renderEvent(booking))}{(markersByDate.get(key) ?? []).map(renderMarker)}{!items.length && !(markersByDate.get(key)?.length) ? <p className="py-8 text-center text-xs text-[var(--text-soft)]">Clear</p> : null}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {view === "day" ? (
          <div className="p-5">
            {(byDate.get(dateKey(anchor)) ?? []).length || (markersByDate.get(dateKey(anchor)) ?? []).length ? <div className="space-y-3">{(byDate.get(dateKey(anchor)) ?? []).map((booking) => <button key={booking.id} type="button" onClick={() => setSelectedBooking(booking)} className="flex w-full flex-wrap items-center gap-4 rounded-2xl border border-[var(--border-subtle)] p-4 text-left hover:bg-[var(--surface-hover)]"><div className="w-24 shrink-0"><p className="font-semibold text-[var(--text-strong)]">{formatTime(booking.startAt)}{calendarFailureIds.has(booking.id) ? " ⚠" : ""}</p><p className="mt-1 text-xs text-[var(--text-soft)]">{Math.round((new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / 60000)} min</p></div><div className={`h-12 w-1 rounded-full ${eventColor(booking).split(" ")[1]}`} /><div className="min-w-0 flex-1"><p className="font-medium text-[var(--text-strong)]">{booking.customerName}</p><p className="mt-1 text-sm text-[var(--text-muted)]">{serviceName(booking.serviceId)} · {staffName(booking.staffId)} · Party of {booking.partySize}</p></div><StatusPill status={booking.status} /></button>)}{(markersByDate.get(dateKey(anchor)) ?? []).map(renderMarker)}</div> : <EmptyState>No schedule items for this day.</EmptyState>}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-muted)]">
        <span className="font-medium text-[var(--text-strong)]">Service colors</span>
        {services.slice(0, serviceColors.length).map((service, index) => <span key={service.id} className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full border ${serviceColors[index]}`} />{service.name}</span>)}
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" />No-show</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />Cancelled</span>
      </div>

      {dayModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setDayModalOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="selected-day-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent-primary)]">Day schedule</p><h2 id="selected-day-title" className="mt-2 text-xl font-semibold text-[var(--text-strong)]">{new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(new Date(`${selectedDate}T12:00:00`))}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{selectedDayBookings.length} appointment{selectedDayBookings.length === 1 ? "" : "s"}</p></div>
              <button type="button" onClick={() => setDayModalOpen(false)} aria-label="Close day details" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"><X className="h-4 w-4" /></button>
            </div>
            <button type="button" onClick={() => { setDayModalOpen(false); createOnDate(new Date(`${selectedDate}T12:00:00`)); }} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]"><Plus className="h-4 w-4" /> Add appointment</button>
            <div className="mt-5 space-y-3">
              {selectedDayBookings.map((booking) => <button key={booking.id} type="button" onClick={() => { setDayModalOpen(false); setSelectedBooking(booking); }} className="flex w-full items-center gap-4 rounded-2xl border border-[var(--border-subtle)] p-4 text-left hover:bg-[var(--surface-hover)]"><div className="w-20 shrink-0"><p className="font-semibold text-[var(--text-strong)]">{formatTime(booking.startAt)}</p><p className="mt-1 text-xs text-[var(--text-soft)]">{Math.round((new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / 60000)} min</p></div><div className="min-w-0 flex-1"><p className="truncate font-medium text-[var(--text-strong)]">{booking.customerName}{calendarFailureIds.has(booking.id) ? " ⚠" : ""}</p><p className="mt-1 truncate text-sm text-[var(--text-muted)]">{serviceName(booking.serviceId)} · {staffName(booking.staffId)}</p></div><StatusPill status={booking.status} /></button>)}
              {(markersByDate.get(selectedDate) ?? []).map(renderMarker)}
              {!selectedDayBookings.length && !(markersByDate.get(selectedDate)?.length) ? <EmptyState>No meetings or schedule items on this date yet.</EmptyState> : null}
            </div>
          </section>
        </div>
      ) : null}

      {selectedBooking ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSelectedBooking(null)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent-primary)]">Appointment details</p><h2 className="mt-2 text-xl font-semibold text-[var(--text-strong)]">{selectedBooking.customerName}</h2></div><button type="button" onClick={() => setSelectedBooking(null)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"><X className="h-4 w-4" /></button></div>
            <div className="mt-5"><StatusPill status={selectedBooking.status} /></div>
            <dl className="mt-6 space-y-4 text-sm">
              <div><dt className="text-xs text-[var(--text-soft)]">Date and time</dt><dd className="mt-1 font-medium text-[var(--text-strong)]">{formatDateTime(selectedBooking.startAt)}</dd><dd className="mt-1 text-xs text-[var(--text-muted)]">Timezone: {selectedBooking.timezone}</dd></div>
              <div><dt className="text-xs text-[var(--text-soft)]">Service</dt><dd className="mt-1 text-[var(--text-strong)]">{serviceName(selectedBooking.serviceId)}</dd></div>
              <div><dt className="text-xs text-[var(--text-soft)]">Team member</dt><dd className="mt-1 text-[var(--text-strong)]">{staffName(selectedBooking.staffId)}</dd></div>
              <div>
                <dt className="text-xs text-[var(--text-soft)]">Meeting</dt>
                <dd className="mt-1 text-[var(--text-strong)]">
                  {selectedBooking.meetingUrl ? (
                    <a href={selectedBooking.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--accent-primary)] hover:underline">Join online meeting <ExternalLink className="h-3.5 w-3.5" /></a>
                  ) : selectedBooking.meetingType === "online" ? "Meeting link is being prepared" : selectedBooking.location ?? (selectedBooking.meetingType === "phone" ? "Phone call" : "In person")}
                </dd>
              </div>
              <div><dt className="text-xs text-[var(--text-soft)]">Customer contact</dt><dd className="mt-1 text-[var(--text-strong)]">{selectedBooking.customerEmail ?? selectedBooking.customerPhone ?? "No contact provided"}</dd></div>
              <div><dt className="text-xs text-[var(--text-soft)]">Attendance</dt><dd className="mt-1 flex items-center gap-2 text-[var(--text-strong)]"><UsersRound className="h-4 w-4" /> Party of {selectedBooking.partySize}{selectedBooking.checkedInAt ? " · Checked in" : ""}</dd></div>
              {selectedBooking.seriesId ? <div><dt className="text-xs text-[var(--text-soft)]">Recurring series</dt><dd className="mt-1 text-[var(--text-strong)]">Occurrence {(selectedBooking.occurrenceIndex ?? 0) + 1}</dd></div> : null}
              {selectedBooking.notes ? <div><dt className="text-xs text-[var(--text-soft)]">Notes</dt><dd className="mt-1 rounded-xl bg-[var(--surface-card-muted)] p-3 text-[var(--text-base)]">{selectedBooking.notes}</dd></div> : null}
            </dl>
            {!['cancelled', 'completed', 'no_show'].includes(selectedBooking.status) ? <div className="mt-8 grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-5">{!selectedBooking.checkedInAt ? <button type="button" onClick={async () => { await onCheckIn(selectedBooking.id); setSelectedBooking(null); setReloadVersion((value) => value + 1); }} className="h-10 rounded-xl border border-[var(--border-strong)] text-sm font-medium text-[var(--success-text)] hover:bg-[var(--success-bg)]">Check in</button> : null}<button type="button" onClick={() => { onReschedule(selectedBooking); setSelectedBooking(null); }} className="h-10 rounded-xl border border-[var(--border-strong)] text-sm font-medium hover:bg-[var(--surface-hover)]">Reschedule</button><button type="button" onClick={async () => { await onCancel(selectedBooking.id); setSelectedBooking(null); setReloadVersion((value) => value + 1); }} className="col-span-2 h-10 rounded-xl text-sm font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)]">Cancel appointment</button></div> : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
