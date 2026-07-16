"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Repeat2, ShieldCheck, UsersRound } from "lucide-react";
import type { AppointmentBooking, AppointmentService, AppointmentSlot } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1";

type Mode = "book" | "manage" | "claim" | "preferences";
type BookingResult =
  | AppointmentBooking
  | {
      series: { id: string; manageToken: string; frequency: string; occurrenceCount: number };
      bookings: AppointmentBooking[];
    };

type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
  notes: string;
  partySize: number;
  frequency: string;
  interval: number;
  count: number;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function errorMessage(value: unknown) {
  if (typeof value === "object" && value && "message" in value) {
    const message = (value as { message?: string | string[] }).message;
    return Array.isArray(message) ? message.join(", ") : message ?? "Request failed";
  }
  return typeof value === "string" ? value : "Request failed";
}

async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) throw new Error(errorMessage(body));
  return body as T;
}

const inputClass = "input";
const panelClass = "rounded-2xl border border-[#d8e2f0] bg-white p-5 shadow-sm";

export default function PublicBookingPage() {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "book";
    const params = new URLSearchParams(window.location.search);
    if (params.has("bookingId") && params.has("token") && params.has("channel")) return "preferences";
    if (params.has("offerToken")) return "claim";
    return "book";
  });
  const [organizationId, setOrganizationId] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("organizationId") ?? params.get("org") ?? "";
  });
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [details, setDetails] = useState<CustomerDetails>({
    name: "", email: "", phone: "", notes: "", partySize: 1, frequency: "", interval: 1, count: 2,
  });
  const [result, setResult] = useState<BookingResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const seatsFit = !selectedSlot || details.partySize <= selectedSlot.seatsRemaining;
  const recentBooking = useMemo(() => {
    if (!result) return null;
    if ("bookings" in result) return result.bookings[0] ?? null;
    return result;
  }, [result]);
  const recentToken = result
    ? "bookings" in result
      ? result.series.manageToken
      : result.manageToken
    : undefined;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const org = params.get("organizationId") ?? params.get("org") ?? "";
    const timer = org ? window.setTimeout(() => void loadServicesFor(org), 0) : undefined;
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run<T>(task: () => Promise<T>, success?: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const value = await task();
      if (success) setMessage(success);
      return value;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function loadServicesFor(orgId: string) {
    const params = new URLSearchParams({ organizationId: orgId });
    const loaded = await run(() => publicApi<AppointmentService[]>(`/appointment-booking/public/services?${params}`));
    if (loaded) setServices(loaded);
  }

  async function loadServices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSlots([]);
    setSelectedSlot(null);
    await loadServicesFor(organizationId.trim());
  }

  async function searchSlots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const serviceId = String(form.get("serviceId"));
    const params = new URLSearchParams({
      organizationId,
      serviceId,
      date: String(form.get("date")),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });
    const staffId = String(form.get("staffId") || "");
    if (staffId) params.set("staffId", staffId);
    const loaded = await run(
      () =>
        Promise.all([
          publicApi<AppointmentSlot[]>(`/appointment-booking/public/availability?${params}`),
          publicApi<AppointmentSlot[]>(`/appointment-booking/public/waitlist-sessions?${params}`),
        ]),
      "Available times updated",
    );
    if (loaded) {
      setSelectedServiceId(serviceId);
      const sessions = new Map<string, AppointmentSlot>();
      for (const slot of [...loaded[1], ...loaded[0]]) {
        sessions.set(`${slot.staffId}:${slot.startAt}`, slot);
      }
      setSlots([...sessions.values()].sort((left, right) => left.startAt.localeCompare(right.startAt)));
      setSelectedSlot(null);
    }
  }

  function bookingPayload() {
    if (!selectedSlot) throw new Error("Select an appointment time first");
    if (!details.email && !details.phone) throw new Error("Add an email address or phone number");
    return {
      organizationId,
      serviceId: selectedServiceId,
      staffId: selectedSlot.staffId,
      startAt: selectedSlot.startAt,
      timezone: selectedSlot.timezone,
      customerName: details.name,
      customerEmail: details.email || undefined,
      customerPhone: details.phone || undefined,
      notes: details.notes || undefined,
      partySize: details.partySize,
      recurrence: details.frequency
        ? { frequency: details.frequency, interval: details.interval, count: details.count }
        : undefined,
    };
  }

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) return setError("Select an appointment time first");
    const created = await run(
      () => publicApi<BookingResult>("/appointment-booking/public/bookings", { method: "POST", body: JSON.stringify(bookingPayload()) }),
      details.frequency ? "Recurring appointment series confirmed" : "Appointment confirmed",
    );
    if (created) {
      setResult(created);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function joinWaitlist() {
    if (!selectedSlot) return setError("Select a preferred time first");
    const payload = bookingPayload();
    const joined = await run(
      () => publicApi<{ id: string; position: number }>("/appointment-booking/public/waitlist", {
        method: "POST",
        body: JSON.stringify({
          organizationId: payload.organizationId,
          serviceId: payload.serviceId,
          staffId: payload.staffId,
          startAt: payload.startAt,
          timezone: payload.timezone,
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          customerPhone: payload.customerPhone,
          partySize: payload.partySize,
        }),
      }),
    );
    if (joined) setMessage(`You are #${joined.position} on the waitlist. We’ll contact you when enough seats open.`);
  }

  async function manageBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = String(form.get("action"));
    const bookingId = String(form.get("bookingId"));
    const manageToken = String(form.get("manageToken"));
    const org = String(form.get("organizationId"));
    if (action === "reschedule") {
      const updated = await run(
        () => publicApi<AppointmentBooking>(`/appointment-booking/public/bookings/${bookingId}/reschedule`, {
          method: "PATCH",
          body: JSON.stringify({
            organizationId: org,
            manageToken,
            startAt: new Date(String(form.get("startAt"))).toISOString(),
            applyToFuture: form.get("applyToFuture") === "on",
          }),
        }),
        "Appointment rescheduled",
      );
      if (updated) setResult(updated);
      return;
    }
    await run(
      () => publicApi<AppointmentBooking>(`/appointment-booking/public/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ organizationId: org, manageToken, reason: String(form.get("reason")) || undefined }),
      }),
      "Appointment cancelled",
    );
  }

  async function cancelSeries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      () => publicApi(`/appointment-booking/public/series/${String(form.get("seriesId"))}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({
          organizationId: String(form.get("organizationId")),
          manageToken: String(form.get("manageToken")),
          fromOccurrenceIndex: form.get("fromOccurrenceIndex") ? Number(form.get("fromOccurrenceIndex")) : undefined,
          reason: String(form.get("reason")) || undefined,
        }),
      }),
      "Recurring series cancelled",
    );
  }

  async function claimOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const claimed = await run(
      () => publicApi<AppointmentBooking>("/appointment-booking/public/waitlist/claim", {
        method: "POST",
        body: JSON.stringify({ organizationId: String(form.get("organizationId")), offerToken: String(form.get("offerToken")) }),
      }),
      "Waitlist offer claimed — your appointment is confirmed",
    );
    if (claimed) setResult(claimed);
  }

  async function optOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      () => publicApi("/appointment-booking/public/reminders/opt-out", {
        method: "POST",
        body: JSON.stringify({
          organizationId: String(form.get("organizationId")),
          bookingId: String(form.get("bookingId")),
          token: String(form.get("token")),
          channel: String(form.get("channel")),
        }),
      }),
      "Reminder preference saved",
    );
  }

  const query = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);

  return (
    <main className="min-h-screen bg-[#f3f7fc] px-4 py-8 text-[#142033]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563eb]">AI appointment booking</p>
            <h1 className="mt-2 text-3xl font-semibold">Schedule your appointment</h1>
            <p className="mt-1 text-sm text-[#64748b]">Choose a service and time, join a waitlist, or manage an existing booking.</p>
          </div>
          <nav className="flex flex-wrap gap-1 rounded-xl border border-[#d8e2f0] bg-white p-1">
            {(["book", "manage", "claim", "preferences"] as Mode[]).map((item) => (
              <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${mode === item ? "bg-[#2563eb] text-white" : "text-[#64748b] hover:bg-[#eef4fb]"}`}>
                {item === "claim" ? "Claim offer" : item === "preferences" ? "Reminder opt-out" : item}
              </button>
            ))}
          </nav>
        </header>

        <div className="mb-4 min-h-7" aria-live="polite">
          {message ? <div className="rounded-xl bg-[#dcfae6] px-4 py-3 text-sm text-[#067647]">{message}</div> : null}
          {error ? <div className="rounded-xl bg-[#fee4e2] px-4 py-3 text-sm text-[#b42318]">{error}</div> : null}
        </div>

        {result ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#a6f4c5] bg-[#ecfdf3] p-5">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#067647]" />
            <div>
              <h2 className="font-semibold text-[#065f46]">Confirmed</h2>
              <p className="mt-1 text-sm text-[#067647]">
                {"bookings" in result
                  ? `${result.bookings.length} appointments created. First appointment: ${formatDateTime(result.bookings[0].startAt)}.`
                  : `${formatDateTime(result.startAt)} · ${result.partySize} attendee${result.partySize === 1 ? "" : "s"}.`}
              </p>
              <button type="button" onClick={() => setMode("manage")} className="mt-3 text-sm font-semibold text-[#065f46] underline">Manage this booking</button>
            </div>
          </div>
        ) : null}

        {mode === "book" ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-5">
              <form onSubmit={loadServices} className={panelClass}>
                <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-[#2563eb]" /> Booking organization</h2>
                <label className="mt-4 block text-sm font-medium text-[#314158]">Organization ID</label>
                <input value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={`${inputClass} mt-1`} required />
                <button disabled={busy} className="mt-4 h-10 w-full rounded-xl bg-[#142033] px-4 text-sm font-medium text-white disabled:opacity-50">Load services</button>
              </form>

              <form onSubmit={searchSlots} className={panelClass}>
                <h2 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5 text-[#2563eb]" /> Find a time</h2>
                <label className="mt-4 block text-sm font-medium text-[#314158]">Service</label>
                <select name="serviceId" className={`${inputClass} mt-1`} required defaultValue="">
                  <option value="">Select service</option>
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} min · up to {service.maxAttendees}</option>)}
                </select>
                <label className="mt-4 block text-sm font-medium text-[#314158]">Date</label>
                <input name="date" type="date" min={new Date().toISOString().slice(0, 10)} className={`${inputClass} mt-1`} required />
                <button disabled={busy || !services.length} className="mt-4 h-10 w-full rounded-xl bg-[#2563eb] px-4 text-sm font-medium text-white disabled:opacity-50">Search availability</button>
              </form>

              <form onSubmit={createBooking} className={panelClass}>
                <h2 className="flex items-center gap-2 font-semibold"><UsersRound className="h-5 w-5 text-[#2563eb]" /> Your details</h2>
                <div className="mt-4 space-y-3">
                  <input aria-label="Name" placeholder="Full name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} className={inputClass} required />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input aria-label="Email" type="email" placeholder="Email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} className={inputClass} />
                    <input aria-label="Phone" type="tel" placeholder="Phone" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} className={inputClass} />
                  </div>
                  <label className="block text-sm font-medium text-[#314158]">Party size</label>
                  <input type="number" min="1" max={selectedService?.maxAttendees ?? 100} value={details.partySize} onChange={(e) => setDetails({ ...details, partySize: Number(e.target.value) })} className={inputClass} required />
                  <textarea aria-label="Notes" placeholder="Notes (optional)" rows={3} value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} className={`${inputClass} resize-y`} />
                  <div className="rounded-xl bg-[#f7faff] p-3">
                    <label className="flex items-center gap-2 text-sm font-medium"><Repeat2 className="h-4 w-4" /> Repeat (optional)</label>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <select aria-label="Frequency" value={details.frequency} onChange={(e) => setDetails({ ...details, frequency: e.target.value })} className={inputClass}>
                        <option value="">Never</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                      </select>
                      <input aria-label="Interval" type="number" min="1" max="12" value={details.interval} onChange={(e) => setDetails({ ...details, interval: Number(e.target.value) })} className={inputClass} />
                      <input aria-label="Occurrences" type="number" min="2" max="52" value={details.count} onChange={(e) => setDetails({ ...details, count: Number(e.target.value) })} className={inputClass} />
                    </div>
                  </div>
                </div>
                {seatsFit ? (
                  <button disabled={busy || !selectedSlot} className="mt-4 h-11 w-full rounded-xl bg-[#142033] px-4 text-sm font-semibold text-white disabled:opacity-50">Confirm booking</button>
                ) : selectedService?.waitlistEnabled ? (
                  <button type="button" disabled={busy} onClick={() => void joinWaitlist()} className="mt-4 h-11 w-full rounded-xl bg-[#b26a00] px-4 text-sm font-semibold text-white disabled:opacity-50">Join waitlist for this party</button>
                ) : (
                  <p className="mt-4 rounded-xl bg-[#fff1d6] p-3 text-sm text-[#8a5200]">This time does not have enough seats for your party.</p>
                )}
              </form>

            </div>

            <section className="overflow-hidden rounded-2xl border border-[#d8e2f0] bg-white shadow-sm">
              <div className="border-b border-[#d8e2f0] p-5">
                <h2 className="flex items-center gap-2 font-semibold"><Clock3 className="h-5 w-5 text-[#2563eb]" /> Available times</h2>
                <p className="mt-1 text-sm text-[#64748b]">Seat availability is updated from internal and connected calendars.</p>
              </div>
              {slots.length ? (
                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                  {slots.map((slot) => {
                    const selected = selectedSlot?.staffId === slot.staffId && selectedSlot.startAt === slot.startAt;
                    return (
                      <button key={`${slot.staffId}-${slot.startAt}`} type="button" onClick={() => setSelectedSlot(slot)} className={`rounded-xl border p-4 text-left transition ${selected ? "border-[#2563eb] bg-[#edf4ff] ring-2 ring-[#2563eb]/15" : "border-[#d8e2f0] hover:border-[#2563eb] hover:bg-[#f7faff]"}`}>
                        <p className="text-sm font-semibold">{formatDateTime(slot.startAt)}</p>
                        <p className="mt-1 text-xs text-[#64748b]">{slot.staffName}</p>
                        <span className={`mt-3 inline-block rounded-full bg-white px-2.5 py-1 text-xs font-medium ${slot.seatsRemaining ? "text-[#314158]" : "text-[#b26a00]"}`}>{slot.seatsRemaining ? `${slot.seatsRemaining} seat${slot.seatsRemaining === 1 ? "" : "s"} left` : "Full · waitlist available"}</span>
                      </button>
                    );
                  })}
                </div>
              ) : <div className="p-12 text-center text-sm text-[#64748b]">Load an organization and search a date to see availability.</div>}
            </section>
          </div>
        ) : null}

        {mode === "manage" ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <form onSubmit={manageBooking} className={panelClass}>
              <h2 className="font-semibold">Manage one appointment</h2>
              <p className="mt-1 text-sm text-[#64748b]">Use the secure token sent with your confirmation.</p>
              <div className="mt-4 space-y-3">
                <input name="organizationId" placeholder="Organization ID" defaultValue={recentBooking?.organizationId ?? organizationId} className={inputClass} required />
                <input name="bookingId" placeholder="Booking ID" defaultValue={recentBooking?.id ?? ""} className={inputClass} required />
                <input name="manageToken" type="password" placeholder="Management token" defaultValue={recentToken ?? ""} className={inputClass} required />
                <input name="startAt" type="datetime-local" className={inputClass} />
                <label className="flex items-center gap-2 text-sm text-[#314158]"><input name="applyToFuture" type="checkbox" /> Apply reschedule to future occurrences</label>
                <input name="reason" placeholder="Cancellation reason (optional)" className={inputClass} />
              </div>
              <div className="mt-4 flex gap-3">
                <button name="action" value="reschedule" className="h-10 flex-1 rounded-xl bg-[#2563eb] px-4 text-sm font-medium text-white">Reschedule</button>
                <button name="action" value="cancel" className="h-10 flex-1 rounded-xl bg-[#b42318] px-4 text-sm font-medium text-white">Cancel</button>
              </div>
            </form>
            <form onSubmit={cancelSeries} className={panelClass}>
              <h2 className="font-semibold">Cancel a recurring series</h2>
              <p className="mt-1 text-sm text-[#64748b]">Cancel the whole series or start from a specific occurrence.</p>
              <div className="mt-4 space-y-3">
                <input name="organizationId" placeholder="Organization ID" defaultValue={organizationId} className={inputClass} required />
                <input name="seriesId" placeholder="Series ID" defaultValue={result && "bookings" in result ? result.series.id : recentBooking?.seriesId ?? ""} className={inputClass} required />
                <input name="manageToken" type="password" placeholder="Management token" defaultValue={recentToken ?? ""} className={inputClass} required />
                <input name="fromOccurrenceIndex" type="number" min="0" placeholder="From occurrence index (blank = all)" className={inputClass} />
                <input name="reason" placeholder="Reason (optional)" className={inputClass} />
              </div>
              <button className="mt-4 h-10 w-full rounded-xl bg-[#b42318] px-4 text-sm font-medium text-white">Cancel recurring appointments</button>
            </form>
          </div>
        ) : null}

        {mode === "claim" ? (
          <form onSubmit={claimOffer} className={`${panelClass} mx-auto max-w-xl`}>
            <h2 className="font-semibold">Claim your waitlist offer</h2>
            <p className="mt-1 text-sm text-[#64748b]">Offers expire after the time stated in your notification.</p>
            <div className="mt-4 space-y-3">
              <input name="organizationId" placeholder="Organization ID" defaultValue={query.get("organizationId") ?? organizationId} className={inputClass} required />
              <input name="offerToken" type="password" placeholder="Offer token" defaultValue={query.get("offerToken") ?? ""} className={inputClass} required />
            </div>
            <button className="mt-4 h-11 w-full rounded-xl bg-[#067647] px-4 text-sm font-semibold text-white">Claim and confirm booking</button>
          </form>
        ) : null}

        {mode === "preferences" ? (
          <form onSubmit={optOut} className={`${panelClass} mx-auto max-w-xl`}>
            <h2 className="font-semibold">Stop appointment reminders</h2>
            <p className="mt-1 text-sm text-[#64748b]">This only suppresses the selected channel for this organization.</p>
            <div className="mt-4 space-y-3">
              <input name="organizationId" placeholder="Organization ID" defaultValue={query.get("organizationId") ?? organizationId} className={inputClass} required />
              <input name="bookingId" placeholder="Booking ID" defaultValue={query.get("bookingId") ?? ""} className={inputClass} required />
              <input name="token" type="password" placeholder="Preference token" defaultValue={query.get("token") ?? ""} className={inputClass} required />
              <select name="channel" defaultValue={query.get("channel") ?? "email"} className={inputClass}>
                <option value="email">Email</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <button className="mt-4 h-11 w-full rounded-xl bg-[#142033] px-4 text-sm font-semibold text-white">Save opt-out</button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
