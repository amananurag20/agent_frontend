"use client";

import { FormEvent, useState } from "react";
import type {
  AppointmentBooking,
  AppointmentService,
  AppointmentSlot,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export default function PublicBookingPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(task: () => Promise<T>, success?: string) {
    setError(null);
    setMessage(null);

    try {
      const result = await task();
      if (success) setMessage(success);
      return result;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something failed");
      return null;
    }
  }

  async function loadServices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const orgId = String(form.get("organizationId"));
    setOrganizationId(orgId);
    setSelectedSlot(null);
    setSlots([]);

    const params = new URLSearchParams({ organizationId: orgId });
    const result = await run(
      () =>
        publicApi<AppointmentService[]>(
          `/appointment-booking/public/services?${params}`,
        ),
      "Services loaded",
    );

    if (result) setServices(result);
  }

  async function searchSlots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const serviceId = String(form.get("serviceId"));
    setSelectedServiceId(serviceId);
    setSelectedSlot(null);

    const params = new URLSearchParams({
      organizationId,
      serviceId,
      date: String(form.get("date")),
    });
    const result = await run(
      () =>
        publicApi<AppointmentSlot[]>(
          `/appointment-booking/public/availability?${params}`,
        ),
      "Slots loaded",
    );

    if (result) setSlots(result);
  }

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) {
      setError("Select a slot first");
      return;
    }

    const form = new FormData(event.currentTarget);
    const result = await run(
      () =>
        publicApi<AppointmentBooking>("/appointment-booking/public/bookings", {
          method: "POST",
          body: JSON.stringify({
            organizationId,
            serviceId: selectedServiceId,
            staffId: selectedSlot.staffId,
            startAt: selectedSlot.startAt,
            customerName: String(form.get("customerName")),
            customerEmail: String(form.get("customerEmail")) || undefined,
            customerPhone: String(form.get("customerPhone")) || undefined,
            notes: String(form.get("notes")) || undefined,
          }),
        }),
      "Booking created",
    );

    if (result) {
      event.currentTarget.reset();
      setSelectedSlot(null);
      setSlots((current) =>
        current.filter((slot) => slot.startAt !== result.startAt),
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-4 py-8 text-[#111827]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Book Appointment</h1>
          <p className="mt-1 text-sm text-[#667085]">
            Public booking test page for enabled organizations.
          </p>
        </div>

        <div className="mb-4 min-h-6">
          {message ? <p className="text-sm text-[#067647]">{message}</p> : null}
          {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <form
              onSubmit={loadServices}
              className="rounded-lg border border-[#d8dde6] bg-white p-4"
            >
              <h2 className="font-semibold">Organization</h2>
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-[#344054]">
                  Organization ID
                </span>
                <input name="organizationId" className="input" required />
              </label>
              <button className="mt-4 h-10 rounded-md bg-[#101828] px-4 text-sm font-medium text-white">
                Load services
              </button>
            </form>

            <form
              onSubmit={searchSlots}
              className="rounded-lg border border-[#d8dde6] bg-white p-4"
            >
              <h2 className="font-semibold">Find Time</h2>
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-[#344054]">
                  Service
                </span>
                <select name="serviceId" className="input" required>
                  <option value="">Select service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-[#344054]">
                  Date
                </span>
                <input name="date" type="date" className="input" required />
              </label>
              <button className="mt-4 h-10 rounded-md bg-[#116466] px-4 text-sm font-medium text-white">
                Search slots
              </button>
            </form>

            <form
              onSubmit={createBooking}
              className="rounded-lg border border-[#d8dde6] bg-white p-4"
            >
              <h2 className="font-semibold">Your Details</h2>
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-[#344054]">
                  Name
                </span>
                <input name="customerName" className="input" required />
              </label>
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-[#344054]">
                  Email
                </span>
                <input name="customerEmail" type="email" className="input" />
              </label>
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-[#344054]">
                  Phone
                </span>
                <input name="customerPhone" className="input" />
              </label>
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-[#344054]">
                  Notes
                </span>
                <textarea name="notes" rows={3} className="input resize-y" />
              </label>
              <button className="mt-4 h-10 rounded-md bg-[#101828] px-4 text-sm font-medium text-white">
                Confirm booking
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-[#d8dde6] bg-white">
            <div className="border-b border-[#e4e7ec] p-4">
              <h2 className="font-semibold">Available Slots</h2>
            </div>
            {slots.length ? (
              <div className="divide-y divide-[#eef2f6]">
                {slots.map((slot) => (
                  <button
                    key={`${slot.staffId}-${slot.startAt}`}
                    onClick={() => setSelectedSlot(slot)}
                    className={`flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-[#f8fafc] ${
                      selectedSlot?.staffId === slot.staffId &&
                      selectedSlot?.startAt === slot.startAt
                        ? "bg-[#eff7ff]"
                        : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {formatDateTime(slot.startAt)}
                      </p>
                      <p className="text-xs text-[#667085]">
                        {slot.staffName} · {slot.timezone}
                      </p>
                    </div>
                    <span className="text-xs text-[#667085]">Select</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-sm text-[#667085]">
                Search for a date to see slots.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
