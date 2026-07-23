"use client";

import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Tag,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type {
  AppointmentBooking,
  AppointmentService,
  AppointmentSlot,
  Lead,
  LeadList,
  LeadPriority,
  LeadStatus,
  User,
  WidgetConfig,
} from "@/lib/types";
import { Field, StatusPill } from "./ui";

const statuses: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "disqualified",
  "archived",
];
const priorities: LeadPriority[] = ["hot", "high", "medium", "low"];

export type LeadAppointmentBookingInput = {
  leadId: string;
  serviceId: string;
  staffId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  partySize: number;
  startAt: string;
  timezone: string;
  notes?: string;
};

export function LeadsView({
  list,
  selected,
  detailId,
  notFound,
  error,
  widgets,
  users,
  loading,
  onFilter,
  onPageChange,
  onOpen,
  onUpdate,
  onAssign,
  onUpdateConsent,
  canScheduleAppointments,
  appointmentServices,
  onLoadAppointmentServices,
  onFindAppointmentSlots,
  onCreateLeadAppointment,
}: {
  list: LeadList | null;
  selected: Lead | null;
  detailId?: string | null;
  notFound: boolean;
  error: string | null;
  widgets: WidgetConfig[];
  users: User[];
  loading: boolean;
  onFilter: (filters: {
    search?: string;
    status?: string;
    priority?: string;
    minScore?: string;
    sort?: string;
    widgetConfigId?: string;
  }) => void;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
  onUpdate: (id: string, input: Partial<Lead>) => Promise<void>;
  onAssign: (id: string, ownerId: string | null) => Promise<void>;
  onUpdateConsent: (
    id: string,
    status: NonNullable<Lead["consentStatus"]>,
  ) => Promise<void>;
  canScheduleAppointments: boolean;
  appointmentServices: AppointmentService[];
  onLoadAppointmentServices: () => Promise<void>;
  onFindAppointmentSlots: (
    serviceId: string,
    date: string,
  ) => Promise<AppointmentSlot[]>;
  onCreateLeadAppointment: (
    input: LeadAppointmentBookingInput,
  ) => Promise<AppointmentBooking>;
}) {
  const router = useRouter();
  if (detailId) {
    if (selected) {
      return (
        <LeadDetail
          lead={selected}
          loading={loading}
          onUpdate={onUpdate}
          onAssign={onAssign}
          onUpdateConsent={onUpdateConsent}
          users={users}
          canScheduleAppointments={canScheduleAppointments}
          appointmentServices={appointmentServices}
          onLoadAppointmentServices={onLoadAppointmentServices}
          onFindAppointmentSlots={onFindAppointmentSlots}
          onCreateLeadAppointment={onCreateLeadAppointment}
        />
      );
    }
    if (notFound) {
      return (
        <LeadStatePanel
          title="Lead not found"
          description="This lead does not exist or is outside your current workspace."
          actionLabel="Back to leads"
          onAction={() => router.push("/leads")}
        />
      );
    }
    if (error) {
      return (
        <LeadStatePanel
          title="Could not load lead"
          description={error}
          actionLabel="Back to leads"
          onAction={() => router.push("/leads")}
        />
      );
    }
    return <LeadDetailSkeleton />;
  }

  return (
    <LeadDirectory
      list={list}
      widgets={widgets}
      loading={loading}
      error={error}
      onFilter={onFilter}
      onPageChange={onPageChange}
      onOpen={onOpen}
    />
  );
}

function LeadDirectory({
  list,
  widgets,
  loading,
  error,
  onFilter,
  onPageChange,
  onOpen,
}: {
  list: LeadList | null;
  widgets: WidgetConfig[];
  loading: boolean;
  error: string | null;
  onFilter: (filters: {
    search?: string;
    status?: string;
    priority?: string;
    minScore?: string;
    sort?: string;
    widgetConfigId?: string;
  }) => void;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
}) {
  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onFilter({
      search: String(form.get("search") || "").trim() || undefined,
      status: String(form.get("status") || "") || undefined,
      priority: String(form.get("priority") || "") || undefined,
      minScore: String(form.get("minScore") || "") || undefined,
      sort: String(form.get("sort") || "score"),
      widgetConfigId: String(form.get("widgetConfigId") || "") || undefined,
    });
  }

  const data = list?.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">
            Captured leads
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Contacts collected before customer-chat conversations begin.
          </p>
        </div>
        <span className="text-sm font-medium text-[var(--text-muted)]">
          {list?.total ?? 0} total
        </span>
      </div>

      <section className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <form
          onSubmit={submitFilters}
          className="grid gap-3 border-b border-[var(--border-subtle)] p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_140px_110px_160px_200px_auto]"
        >
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
            <input
              name="search"
              className="input pl-9"
              placeholder="Search name, email or phone"
            />
          </label>
          <select name="status" className="input" defaultValue="">
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </select>
          <select name="priority" className="input" defaultValue="">
            <option value="">All priorities</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {formatLabel(priority)}
              </option>
            ))}
          </select>
          <input
            name="minScore"
            type="number"
            min={0}
            max={100}
            className="input"
            placeholder="Min score"
          />
          <select name="sort" className="input" defaultValue="score">
            <option value="score">Highest score</option>
            <option value="lastActivity">Latest activity</option>
          </select>
          <select name="widgetConfigId" className="input" defaultValue="">
            <option value="">All widgets</option>
            {widgets.map((widget) => (
              <option key={widget.id} value={widget.id}>
                {widget.name}
              </option>
            ))}
          </select>
          <button
            className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-white disabled:opacity-60"
            disabled={loading}
          >
            Apply
          </button>
        </form>

        {error ? (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <h3 className="font-semibold text-[var(--danger-text)]">
                Could not load leads
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{error}</p>
            </div>
          </div>
        ) : loading && !list ? (
          <div
            className="space-y-3 p-5"
            role="status"
            aria-label="Loading leads"
          >
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="h-16 animate-pulse rounded-md bg-[var(--surface-card-muted)]"
              />
            ))}
          </div>
        ) : data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead className="bg-[var(--surface-card-muted)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-soft)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Conversations</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Response SLA</th>
                  <th className="px-5 py-3 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {data.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => onOpen(lead.id)}
                    className="cursor-pointer hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--surface-accent)] text-[var(--accent-primary)]">
                          <UserRound size={17} />
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-56 truncate text-sm font-semibold text-[var(--text-strong)]">
                            {lead.name ||
                              lead.email ||
                              lead.phone ||
                              "Anonymous lead"}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-[var(--text-soft)]">
                            {lead.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--text-base)]">
                      <p>{lead.email || "No email"}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {lead.phone || "No phone"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--text-base)]">
                      {lead.widgetConfig?.name ?? "Deleted widget"}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--text-base)]">
                      {lead._count?.conversations ?? 0}
                    </td>
                    <td className="px-4 py-4">
                      <LeadScoreBadge lead={lead} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={lead.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--text-base)]">
                      {lead.owner?.name ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {lead.firstRespondedAt ? (
                        <span className="text-[var(--success-text)]">Met</span>
                      ) : lead.slaBreachedAt ? (
                        <span className="font-medium text-[var(--danger-text)]">
                          Breached
                        </span>
                      ) : lead.firstResponseDueAt ? (
                        <span className="text-[var(--text-muted)]">
                          {formatDate(lead.firstResponseDueAt)}
                        </span>
                      ) : (
                        <span className="text-[var(--text-soft)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {formatDate(lead.lastActivityAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <UserRound className="mx-auto h-8 w-8 text-[var(--text-soft)]" />
              <h3 className="mt-3 font-semibold text-[var(--text-strong)]">
                No leads found
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Configure lead fields on a widget, then start a new visitor
                conversation.
              </p>
            </div>
          </div>
        )}

        {list ? (
          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-5 py-3">
            <span className="text-xs text-[var(--text-muted)]">
              Page {list.page} of {list.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-strong)] disabled:opacity-40"
                disabled={list.page <= 1 || loading}
                onClick={() => onPageChange(list.page - 1)}
                aria-label="Previous leads page"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-strong)] disabled:opacity-40"
                disabled={list.page >= list.totalPages || loading}
                onClick={() => onPageChange(list.page + 1)}
                aria-label="Next leads page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function LeadDetail({
  lead,
  loading,
  onUpdate,
  onAssign,
  onUpdateConsent,
  users,
  canScheduleAppointments,
  appointmentServices,
  onLoadAppointmentServices,
  onFindAppointmentSlots,
  onCreateLeadAppointment,
}: {
  lead: Lead;
  loading: boolean;
  onUpdate: (id: string, input: Partial<Lead>) => Promise<void>;
  onAssign: (id: string, ownerId: string | null) => Promise<void>;
  onUpdateConsent: (
    id: string,
    status: NonNullable<Lead["consentStatus"]>,
  ) => Promise<void>;
  users: User[];
  canScheduleAppointments: boolean;
  appointmentServices: AppointmentService[];
  onLoadAppointmentServices: () => Promise<void>;
  onFindAppointmentSlots: (
    serviceId: string,
    date: string,
  ) => Promise<AppointmentSlot[]>;
  onCreateLeadAppointment: (
    input: LeadAppointmentBookingInput,
  ) => Promise<AppointmentBooking>;
}) {
  const router = useRouter();
  const [tags, setTags] = useState((lead.tags ?? []).join(", "));
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentServicesLoading, setAppointmentServicesLoading] =
    useState(false);
  const originalAdjustment = Number(
    lead.qualification.manualScoreAdjustment ?? 0,
  );
  const [scoreOverride, setScoreOverride] = useState(
    lead.scoreOverride === null || lead.scoreOverride === undefined
      ? ""
      : String(lead.scoreOverride),
  );
  const [manualAdjustment, setManualAdjustment] = useState(
    String(originalAdjustment),
  );
  const parsedOverride = scoreOverride === "" ? null : Number(scoreOverride);
  const parsedAdjustment = Number(manualAdjustment || 0);
  const scoreChanged =
    parsedOverride !== (lead.scoreOverride ?? null) ||
    parsedAdjustment !== originalAdjustment;
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => router.push("/leads")}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-strong)]"
      >
        <ArrowLeft size={16} /> Back to leads
      </button>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--border-subtle)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-strong)]">
                  {lead.name || "Anonymous lead"}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Captured by {lead.widgetConfig?.name ?? "a deleted widget"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LeadScoreBadge lead={lead} />
                <StatusPill status={lead.status} />
                {canScheduleAppointments ? (
                  <button
                    type="button"
                    disabled={appointmentServicesLoading}
                    onClick={async () => {
                      setAppointmentServicesLoading(true);
                      try {
                        await onLoadAppointmentServices();
                        setShowAppointmentModal(true);
                      } finally {
                        setAppointmentServicesLoading(false);
                      }
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-primary-strong)]"
                  >
                    <CalendarPlus size={16} />
                    {appointmentServicesLoading
                      ? "Loading services..."
                      : "Schedule meeting"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <form
            className="space-y-5 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const update: Partial<Lead> = {
                name: String(form.get("name") || ""),
                email: String(form.get("email") || "") || null,
                phone: String(form.get("phone") || "") || null,
                status: String(form.get("status")) as LeadStatus,
                notes: String(form.get("notes") || ""),
                tags: tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              };
              if (scoreChanged) {
                update.scoreOverride = parsedOverride;
                update.manualScoreAdjustment = parsedAdjustment;
                update.scoreChangeReason = String(
                  form.get("scoreChangeReason") || "",
                ).trim();
              }
              void onUpdate(lead.id, update);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <input
                  name="name"
                  className="input"
                  defaultValue={lead.name ?? ""}
                />
              </Field>
              <Field label="Status">
                <select
                  name="status"
                  className="input"
                  defaultValue={lead.status}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Lead owner">
                <select
                  className="input"
                  value={lead.ownerId ?? ""}
                  disabled={loading}
                  onChange={(event) =>
                    void onAssign(lead.id, event.target.value || null)
                  }
                >
                  <option value="">Unassigned</option>
                  {users
                    .filter(
                      (user) =>
                        user.orgId === lead.organizationId && user.isActive,
                    )
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} · {user.email}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Contact consent">
                <select
                  className="input"
                  value={lead.consentStatus ?? "unknown"}
                  disabled={loading}
                  onChange={(event) =>
                    void onUpdateConsent(
                      lead.id,
                      event.target.value as NonNullable<Lead["consentStatus"]>,
                    )
                  }
                >
                  <option value="unknown">Unknown</option>
                  <option value="granted">Granted</option>
                  <option value="denied">Denied</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </Field>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  className="input"
                  defaultValue={lead.email ?? ""}
                />
              </Field>
              <Field label="Phone">
                <input
                  name="phone"
                  type="tel"
                  pattern="\+[1-9][0-9 ()-]{7,24}"
                  title="Use an international number including country code, for example +1 650 253 0000"
                  className="input"
                  defaultValue={lead.phone ?? ""}
                />
              </Field>
              <Field label="Manual adjustment">
                <input
                  name="manualScoreAdjustment"
                  type="number"
                  min={-100}
                  max={100}
                  className="input"
                  value={manualAdjustment}
                  onChange={(event) => setManualAdjustment(event.target.value)}
                  placeholder="For example, +10 or -15"
                />
              </Field>
              <Field label="Locked score override">
                <input
                  name="scoreOverride"
                  type="number"
                  min={0}
                  max={100}
                  className="input"
                  value={scoreOverride}
                  onChange={(event) => setScoreOverride(event.target.value)}
                  placeholder={`Automatic: ${lead.automaticScore}`}
                />
              </Field>
              <Field label="Reason for score change">
                <input
                  name="scoreChangeReason"
                  minLength={3}
                  maxLength={500}
                  required={scoreChanged}
                  disabled={!scoreChanged}
                  className="input disabled:opacity-50"
                  placeholder="Required when adjustment or override changes"
                />
              </Field>
            </div>
            <Field label="Tags">
              <div className="relative">
                <Tag className="absolute left-3 top-3 h-4 w-4 text-[var(--text-soft)]" />
                <input
                  className="input pl-9"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="sales, enterprise, follow-up"
                />
              </div>
            </Field>
            <Field label="Internal notes">
              <textarea
                name="notes"
                rows={5}
                className="input resize-y"
                defaultValue={lead.notes ?? ""}
              />
            </Field>
            <button
              disabled={loading}
              className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save lead"}
            </button>
          </form>
        </section>

        <div className="space-y-4">
          {lead.alerts?.some((alert) => !alert.readAt) ? (
            <section className="rounded-lg border border-[var(--danger-text)]/30 bg-[var(--danger-bg)] p-5">
              <h3 className="font-semibold text-[var(--danger-text)]">
                Lead alerts
              </h3>
              <div className="mt-3 space-y-2">
                {lead.alerts
                  .filter((alert) => !alert.readAt)
                  .map((alert) => (
                    <div key={alert.id} className="text-sm">
                      <p className="font-medium text-[var(--text-strong)]">
                        {alert.message}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {formatDate(alert.createdAt)}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}
          <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-semibold text-[var(--text-strong)]">
              Ownership & response SLA
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              <Info
                icon={UserRound}
                label="Owner"
                value={lead.owner?.name || "Unassigned"}
              />
              <Info
                icon={CalendarCheck}
                label="Response due"
                value={
                  lead.firstResponseDueAt
                    ? formatDate(lead.firstResponseDueAt)
                    : "Not configured"
                }
              />
              <Info
                icon={MessageSquare}
                label="First response"
                value={
                  lead.firstRespondedAt
                    ? formatDate(lead.firstRespondedAt)
                    : lead.slaBreachedAt
                      ? "Overdue"
                      : "Waiting"
                }
              />
            </div>
          </section>
          <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[var(--text-strong)]">
                  Qualification score
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {lead.scoreOverride !== null &&
                  lead.scoreOverride !== undefined
                    ? `Locked override · automatic score ${lead.automaticScore}`
                    : originalAdjustment
                      ? `${originalAdjustment > 0 ? "+" : ""}${originalAdjustment} manual adjustment · automatic score ${lead.automaticScore}`
                      : "Automatically calculated from profile and intent"}
                </p>
              </div>
              <LeadScoreBadge lead={lead} />
            </div>
            <div className="mt-4 space-y-2">
              {(lead.qualification.reasons ?? []).slice(0, 8).map((reason) => (
                <div
                  key={reason.key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-[var(--text-muted)]">
                    {formatLabel(reason.key)}
                  </span>
                  <span
                    className={
                      reason.points >= 0
                        ? "font-medium text-[var(--success-text)]"
                        : "font-medium text-[var(--danger-text)]"
                    }
                  >
                    {reason.points >= 0 ? "+" : ""}
                    {reason.points}
                  </span>
                </div>
              ))}
              {originalAdjustment ? (
                <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-2 text-sm">
                  <span className="text-[var(--text-muted)]">
                    Manual adjustment
                  </span>
                  <span
                    className={
                      originalAdjustment >= 0
                        ? "font-medium text-[var(--success-text)]"
                        : "font-medium text-[var(--danger-text)]"
                    }
                  >
                    {originalAdjustment > 0 ? "+" : ""}
                    {originalAdjustment}
                  </span>
                </div>
              ) : null}
              {!lead.qualification.reasons?.length ? (
                <p className="text-sm text-[var(--text-muted)]">
                  More profile or conversation signals are needed.
                </p>
              ) : null}
            </div>
            {lead.qualification.signalEvidence?.length ? (
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  Intent evidence
                </p>
                <div className="mt-2 space-y-2">
                  {lead.qualification.signalEvidence
                    .slice()
                    .sort((left, right) =>
                      right.lastSeenAt.localeCompare(left.lastSeenAt),
                    )
                    .slice(0, 6)
                    .map((item) => (
                      <div
                        key={`${item.signal}-${item.source}`}
                        className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-[var(--text-strong)]">
                            {formatLabel(item.signal)}
                          </span>
                          <span className="text-[var(--text-soft)]">
                            {item.source.toUpperCase()} ·{" "}
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </div>
                        {item.evidence ? (
                          <p className="mt-1 line-clamp-2 text-[var(--text-muted)]">
                            “{item.evidence}”
                          </p>
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </section>
          <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-semibold text-[var(--text-strong)]">
              Lead activity
            </h3>
            <div className="mt-3 space-y-2">
              {(lead.lifecycleEvents ?? []).slice(0, 12).map((event) => (
                <div
                  key={event.id}
                  className="rounded-md border border-[var(--border-subtle)] px-3 py-2"
                >
                  <p className="text-sm font-medium text-[var(--text-strong)]">
                    {formatLabel(event.type.replace(/^lead\./, ""))}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {formatDate(event.createdAt)}
                  </p>
                </div>
              ))}
              {!lead.lifecycleEvents?.length ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No lifecycle events recorded yet.
                </p>
              ) : null}
            </div>
          </section>
          <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-semibold text-[var(--text-strong)]">
              Contact snapshot
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              <Info
                icon={Mail}
                label="Email"
                value={lead.email || "Not provided"}
              />
              <Info
                icon={Phone}
                label="Phone"
                value={lead.phone || "Not provided"}
              />
              <Info
                icon={MessageSquare}
                label="Conversations"
                value={String(lead._count?.conversations ?? 0)}
              />
            </div>
          </section>
          <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-semibold text-[var(--text-strong)]">
              Captured fields
            </h3>
            <dl className="mt-4 divide-y divide-[var(--border-subtle)]">
              {Object.entries(lead.fieldValues ?? {}).map(([key, value]) => (
                <div
                  key={key}
                  className="grid grid-cols-[120px_1fr] gap-3 py-3 text-sm"
                >
                  <dt className="text-[var(--text-muted)]">
                    {formatLabel(key)}
                  </dt>
                  <dd className="break-words text-[var(--text-strong)]">
                    {formatCapturedValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[var(--text-strong)]">
                Appointments
              </h3>
              <span className="text-xs text-[var(--text-muted)]">
                {lead._count?.appointments ?? lead.appointments?.length ?? 0}{" "}
                total
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {(lead.appointments ?? []).map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={() => router.push("/appointments")}
                  className="flex w-full items-start justify-between gap-3 rounded-md border border-[var(--border-subtle)] px-3 py-3 text-left hover:bg-[var(--surface-hover)]"
                >
                  <span className="flex min-w-0 gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[var(--text-strong)]">
                        {appointment.service.name}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--text-muted)]">
                        {formatDate(appointment.startAt)} ·{" "}
                        {appointment.staff.name}
                      </span>
                    </span>
                  </span>
                  <StatusPill status={appointment.status} />
                </button>
              ))}
              {!lead.appointments?.length ? (
                <p className="rounded-md border border-dashed border-[var(--border-subtle)] px-3 py-4 text-sm text-[var(--text-muted)]">
                  No meetings scheduled for this lead yet.
                </p>
              ) : null}
            </div>
          </section>
          <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-semibold text-[var(--text-strong)]">
              Conversation history
            </h3>
            <div className="mt-3 space-y-2">
              {(lead.conversations ?? []).map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() =>
                    router.push(`/inbox?conversation=${conversation.id}`)
                  }
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--border-subtle)] px-3 py-3 text-left hover:bg-[var(--surface-hover)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[var(--text-strong)]">
                      {conversation.id}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                      {formatDate(conversation.lastMessageAt)}
                    </span>
                  </span>
                  <StatusPill status={conversation.status} />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
      {showAppointmentModal ? (
        <LeadAppointmentModal
          lead={lead}
          services={appointmentServices}
          onFindSlots={onFindAppointmentSlots}
          onCreate={onCreateLeadAppointment}
          onClose={() => setShowAppointmentModal(false)}
        />
      ) : null}
    </div>
  );
}

function LeadAppointmentModal({
  lead,
  services,
  onFindSlots,
  onCreate,
  onClose,
}: {
  lead: Lead;
  services: AppointmentService[];
  onFindSlots: (serviceId: string, date: string) => Promise<AppointmentSlot[]>;
  onCreate: (input: LeadAppointmentBookingInput) => Promise<AppointmentBooking>;
  onClose: () => void;
}) {
  const activeServices = services.filter(
    (service) => service.status === "active",
  );
  const [serviceId, setServiceId] = useState("");
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(
    null,
  );
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] =
    useState<AppointmentBooking | null>(null);
  const selectedService = activeServices.find(
    (service) => service.id === serviceId,
  );

  async function findSlots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get("date") || "");
    setSearching(true);
    setError(null);
    setSelectedSlot(null);
    setHasSearched(true);
    try {
      setSlots(await onFindSlots(serviceId, date));
    } catch (searchError) {
      setSlots([]);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Could not load available times",
      );
    } finally {
      setSearching(false);
    }
  }

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot || !selectedService) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const booking = await onCreate({
        leadId: lead.id,
        serviceId: selectedService.id,
        staffId: selectedSlot.staffId,
        customerName: String(form.get("customerName") || "").trim(),
        customerEmail:
          String(form.get("customerEmail") || "").trim() || undefined,
        customerPhone:
          String(form.get("customerPhone") || "").trim() || undefined,
        partySize: Number(form.get("partySize") || 1),
        startAt: selectedSlot.startAt,
        timezone: selectedSlot.timezone,
        notes: String(form.get("notes") || "").trim() || undefined,
      });
      setCreatedBooking(booking);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not schedule the meeting",
      );
    } finally {
      setSaving(false);
    }
  }

  const step = createdBooking ? 3 : selectedSlot ? 2 : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              Schedule meeting
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {lead.name || lead.email || lead.phone || "Lead"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close schedule meeting"
            className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-86px)] overflow-y-auto px-6 py-5">
          <div className="mb-5 grid grid-cols-3 gap-2 text-xs">
            {["Find a time", "Meeting details", "Confirmed"].map(
              (label, index) => (
                <div
                  key={label}
                  className={`rounded-lg px-3 py-2 text-center font-medium ${step === index + 1 ? "bg-[var(--accent-primary)] text-white" : step > index + 1 ? "bg-[var(--success-bg)] text-[var(--success-text)]" : "bg-[var(--surface-card-muted)] text-[var(--text-muted)]"}`}
                >
                  {index + 1}. {label}
                </div>
              ),
            )}
          </div>

          {createdBooking ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--success-bg)] text-[var(--success-text)]">
                <CalendarCheck size={28} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-strong)]">
                Meeting scheduled
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {selectedService?.name} with {selectedSlot?.staffName}
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--text-strong)]">
                {formatDate(createdBooking.startAt)}
              </p>
              {createdBooking.meetingUrl ? (
                <a
                  href={createdBooking.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-primary)] hover:underline"
                >
                  Join online meeting <ExternalLink size={14} />
                </a>
              ) : createdBooking.meetingType === "online" ? (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  The calendar invitation with the join link is being prepared.
                </p>
              ) : createdBooking.location ? (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {createdBooking.meetingType === "in_person"
                    ? "Location"
                    : "Call details"}
                  : {createdBooking.location}
                </p>
              ) : null}
              <p className="mx-auto mt-4 max-w-md text-xs text-[var(--text-muted)]">
                The booking is linked to this lead and now appears in its
                appointment history. Confirmation, reminders, and calendar
                synchronization will run normally.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 h-10 rounded-md bg-[var(--accent-primary)] px-5 text-sm font-medium text-white hover:bg-[var(--accent-primary-strong)]"
              >
                Done
              </button>
            </div>
          ) : selectedSlot && selectedService ? (
            <form onSubmit={createBooking} className="space-y-4">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--text-strong)]">
                      {selectedService.name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {formatDate(selectedSlot.startAt)} ·{" "}
                      {selectedSlot.staffName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Customer name">
                  <input
                    name="customerName"
                    className="input"
                    minLength={2}
                    defaultValue={lead.name ?? ""}
                    required
                  />
                </Field>
                <Field label="Customer email">
                  <input
                    name="customerEmail"
                    type="email"
                    className="input"
                    defaultValue={lead.email ?? ""}
                  />
                </Field>
                <Field label="Customer phone">
                  <input
                    name="customerPhone"
                    type="tel"
                    className="input"
                    defaultValue={lead.phone ?? ""}
                  />
                </Field>
                <Field label="Party size">
                  <input
                    name="partySize"
                    type="number"
                    min="1"
                    max={selectedService.maxAttendees}
                    defaultValue="1"
                    className="input"
                    required
                  />
                </Field>
              </div>
              <Field label="Notes">
                <textarea
                  name="notes"
                  rows={3}
                  className="input resize-y"
                  placeholder="Purpose, preparation, or internal context…"
                />
              </Field>
              {error ? (
                <p className="text-sm text-[var(--danger-text)]">{error}</p>
              ) : null}
              <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving ? "Scheduling…" : "Confirm meeting"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <form
                onSubmit={findSlots}
                className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
              >
                <Field label="Service">
                  <select
                    value={serviceId}
                    onChange={(event) => {
                      setServiceId(event.target.value);
                      setSlots([]);
                      setHasSearched(false);
                    }}
                    className="input"
                    required
                  >
                    <option value="">Choose a service</option>
                    {activeServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} · {service.durationMinutes} min
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date">
                  <input
                    name="date"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    className="input"
                    required
                  />
                </Field>
                <button
                  disabled={searching || !activeServices.length}
                  className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-white disabled:opacity-60"
                >
                  {searching ? "Checking…" : "Find times"}
                </button>
              </form>
              {!activeServices.length ? (
                <p className="rounded-lg border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-muted)]">
                  No active appointment services are configured for this
                  workspace.
                </p>
              ) : null}
              {error ? (
                <p className="text-sm text-[var(--danger-text)]">{error}</p>
              ) : null}
              {slots.length ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                    Available times
                  </p>
                  <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
                    {slots.map((slot) => (
                      <button
                        key={`${slot.staffId}-${slot.startAt}`}
                        type="button"
                        onClick={() => {
                          setSelectedSlot(slot);
                          setError(null);
                        }}
                        className="rounded-lg border border-[var(--border-subtle)] p-3 text-left hover:border-[var(--accent-primary)] hover:bg-[var(--surface-hover)]"
                      >
                        <p className="text-sm font-medium text-[var(--text-strong)]">
                          {formatDate(slot.startAt)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {slot.staffName} · {slot.seatsRemaining} seat
                          {slot.seatsRemaining === 1 ? "" : "s"} left
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : hasSearched && !searching && !error ? (
                <p className="rounded-lg border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-muted)]">
                  No available times were found for that date. Try another date
                  or service.
                </p>
              ) : serviceId ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Choose a date and search to see available times.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-[var(--accent-primary)]" />
      <div className="min-w-0">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="mt-0.5 break-words text-[var(--text-strong)]">{value}</p>
      </div>
    </div>
  );
}

function LeadScoreBadge({ lead }: { lead: Pick<Lead, "score" | "priority"> }) {
  const styles: Record<LeadPriority, string> = {
    hot: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/35 dark:text-red-300",
    high: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/35 dark:text-orange-300",
    medium:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-300",
    low: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[lead.priority]}`}
    >
      <span>{lead.score}</span>
      <span className="font-medium opacity-75">
        {formatLabel(lead.priority)}
      </span>
    </span>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCapturedValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "")
    return "Not provided";
  return String(value);
}

function LeadStatePanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <section className="grid min-h-96 place-items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center shadow-[var(--shadow-card)]">
      <div>
        <UserRound className="mx-auto h-9 w-9 text-[var(--text-soft)]" />
        <h2 className="mt-3 text-lg font-semibold text-[var(--text-strong)]">
          {title}
        </h2>
        <p className="mt-1 max-w-md text-sm text-[var(--text-muted)]">
          {description}
        </p>
        <button
          type="button"
          onClick={onAction}
          className="mt-5 h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-white"
        >
          {actionLabel}
        </button>
      </div>
    </section>
  );
}

function LeadDetailSkeleton() {
  return (
    <div
      className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]"
      role="status"
      aria-label="Loading lead"
    >
      <div className="h-[560px] animate-pulse rounded-lg bg-[var(--surface-card-muted)]" />
      <div className="h-[360px] animate-pulse rounded-lg bg-[var(--surface-card-muted)]" />
    </div>
  );
}
