import type {
  AppointmentBooking,
  AppointmentService,
  AppointmentSlot,
  AppointmentStaff,
  FormHandler,
} from "@/lib/types";
import { Card, CardHeader, EmptyState, Field, StatusPill } from "./ui";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AppointmentsView({
  services,
  staff,
  slots,
  bookings,
  onCreateService,
  onCreateStaff,
  onCreateAvailability,
  onCreateTimeOff,
  onSearchSlots,
  onCreateBooking,
  onRescheduleBooking,
  onCancelBooking,
}: {
  services: AppointmentService[];
  staff: AppointmentStaff[];
  slots: AppointmentSlot[];
  bookings: AppointmentBooking[];
  onCreateService: FormHandler;
  onCreateStaff: FormHandler;
  onCreateAvailability: FormHandler;
  onCreateTimeOff: FormHandler;
  onSearchSlots: FormHandler;
  onCreateBooking: FormHandler;
  onRescheduleBooking: FormHandler;
  onCancelBooking: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <form
          onSubmit={onCreateService}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
        >
          <h2 className="font-semibold">Service</h2>
          <div className="mt-4 space-y-4">
            <Field label="Name">
              <input name="name" className="input" required />
            </Field>
            <Field label="Duration minutes">
              <input
                name="durationMinutes"
                type="number"
                min="5"
                defaultValue="30"
                className="input"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Buffer before">
                <input
                  name="bufferBeforeMinutes"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="input"
                />
              </Field>
              <Field label="Buffer after">
                <input
                  name="bufferAfterMinutes"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="input"
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea name="description" rows={3} className="input resize-y" />
            </Field>
            <button className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
              Create service
            </button>
          </div>
        </form>

        <form
          onSubmit={onCreateStaff}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
        >
          <h2 className="font-semibold">Staff / Resource</h2>
          <div className="mt-4 space-y-4">
            <Field label="Name">
              <input name="name" className="input" required />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className="input" />
            </Field>
            <Field label="Timezone">
              <input name="timezone" className="input" defaultValue="UTC" />
            </Field>
            <Field label="Service">
              <select name="serviceId" className="input" required>
                <option value="">Select service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </Field>
            <button className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
              Create staff
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <form
            onSubmit={onCreateAvailability}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
          >
            <h2 className="font-semibold">Weekly Availability</h2>
            <div className="mt-4 space-y-4">
              <Field label="Staff">
                <select name="staffId" className="input" required>
                  <option value="">Select staff</option>
                  {staff.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Day">
                  <select name="dayOfWeek" className="input" defaultValue="1">
                    <option value="0">Sun</option>
                    <option value="1">Mon</option>
                    <option value="2">Tue</option>
                    <option value="3">Wed</option>
                    <option value="4">Thu</option>
                    <option value="5">Fri</option>
                    <option value="6">Sat</option>
                  </select>
                </Field>
                <Field label="Start">
                  <input
                    name="startTime"
                    type="time"
                    defaultValue="09:00"
                    className="input"
                    required
                  />
                </Field>
                <Field label="End">
                  <input
                    name="endTime"
                    type="time"
                    defaultValue="17:00"
                    className="input"
                    required
                  />
                </Field>
              </div>
              <button className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
                Add availability
              </button>
            </div>
          </form>

          <form
            onSubmit={onCreateTimeOff}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
          >
            <h2 className="font-semibold">Time Off</h2>
            <div className="mt-4 space-y-4">
              <Field label="Staff">
                <select name="staffId" className="input" required>
                  <option value="">Select staff</option>
                  {staff.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start">
                <input
                  name="startAt"
                  type="datetime-local"
                  className="input"
                  required
                />
              </Field>
              <Field label="End">
                <input
                  name="endAt"
                  type="datetime-local"
                  className="input"
                  required
                />
              </Field>
              <Field label="Reason">
                <input name="reason" className="input" />
              </Field>
              <button className="h-10 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-base)] hover:bg-[var(--surface-hover)]">
                Add blockout
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4">
          <form
            onSubmit={onSearchSlots}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
          >
            <h2 className="font-semibold">Find Slots</h2>
            <div className="mt-4 space-y-4">
              <Field label="Service">
                <select name="serviceId" className="input" required>
                  <option value="">Select service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input name="date" type="date" className="input" required />
              </Field>
              <button className="h-10 rounded-md bg-[var(--accent-secondary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-secondary-strong)]">
                Search slots
              </button>
            </div>
          </form>

          <form
            onSubmit={onCreateBooking}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
          >
            <h2 className="font-semibold">Create Booking</h2>
            <div className="mt-4 space-y-4">
              <Field label="Service">
                <select name="serviceId" className="input" required>
                  <option value="">Select service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Staff">
                <select name="staffId" className="input">
                  <option value="">Auto assign</option>
                  {staff.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start">
                <input
                  name="startAt"
                  type="datetime-local"
                  className="input"
                  required
                />
              </Field>
              <Field label="Customer name">
                <input name="customerName" className="input" required />
              </Field>
              <Field label="Customer email">
                <input name="customerEmail" type="email" className="input" />
              </Field>
              <Field label="Notes">
                <textarea name="notes" rows={3} className="input resize-y" />
              </Field>
              <button className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
                Create booking
              </button>
            </div>
          </form>

          <form
            onSubmit={onRescheduleBooking}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4"
          >
            <h2 className="font-semibold">Reschedule Booking</h2>
            <div className="mt-4 space-y-4">
              <Field label="Booking">
                <select name="bookingId" className="input" required>
                  <option value="">Select booking</option>
                  {bookings
                    .filter((booking) => booking.status !== "cancelled")
                    .map((booking) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.customerName} · {formatDateTime(booking.startAt)}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Staff">
                <select name="staffId" className="input">
                  <option value="">Keep current / auto</option>
                  {staff.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="New start">
                <input
                  name="startAt"
                  type="datetime-local"
                  className="input"
                  required
                />
              </Field>
              <button className="h-10 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-base)] hover:bg-[var(--surface-hover)]">
                Reschedule
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Available Slots</h2>
            </CardHeader>
            {slots.length ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {slots.map((slot) => (
                  <div
                    key={`${slot.staffId}-${slot.startAt}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {formatDateTime(slot.startAt)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {slot.staffName} · {slot.timezone}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Ends {formatDateTime(slot.endAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No slots loaded.</EmptyState>
            )}
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">Bookings</h2>
            </CardHeader>
            {bookings.length ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {bookings.map((booking) => {
                  const service = services.find(
                    (item) => item.id === booking.serviceId,
                  );
                  const staffMember = staff.find(
                    (item) => item.id === booking.staffId,
                  );

                  return (
                    <div
                      key={booking.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {booking.customerName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDateTime(booking.startAt)} ·{" "}
                          {service?.name ?? "Service"} ·{" "}
                          {staffMember?.name ?? "Staff"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={booking.status} />
                        {booking.status !== "cancelled" ? (
                          <button
                            onClick={() => onCancelBooking(booking.id)}
                            className="h-9 rounded-md border border-[var(--border-strong)] px-3 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState>No bookings yet.</EmptyState>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
