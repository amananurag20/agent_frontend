"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Tag,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Lead, LeadList, LeadStatus, WidgetConfig } from "@/lib/types";
import { Field, StatusPill } from "./ui";

const statuses: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "disqualified",
  "archived",
];

export function LeadsView({
  list,
  selected,
  detailId,
  notFound,
  error,
  widgets,
  loading,
  onFilter,
  onPageChange,
  onOpen,
  onUpdate,
}: {
  list: LeadList | null;
  selected: Lead | null;
  detailId?: string | null;
  notFound: boolean;
  error: string | null;
  widgets: WidgetConfig[];
  loading: boolean;
  onFilter: (filters: { search?: string; status?: string; widgetConfigId?: string }) => void;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
  onUpdate: (id: string, input: Partial<Lead>) => Promise<void>;
}) {
  const router = useRouter();
  if (detailId) {
    if (selected) {
      return <LeadDetail lead={selected} loading={loading} onUpdate={onUpdate} />;
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
  onFilter: (filters: { search?: string; status?: string; widgetConfigId?: string }) => void;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
}) {
  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onFilter({
      search: String(form.get("search") || "").trim() || undefined,
      status: String(form.get("status") || "") || undefined,
      widgetConfigId: String(form.get("widgetConfigId") || "") || undefined,
    });
  }

  const data = list?.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">Captured leads</h2>
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
          className="grid gap-3 border-b border-[var(--border-subtle)] p-4 md:grid-cols-[minmax(240px,1fr)_180px_220px_auto]"
        >
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
            <input name="search" className="input pl-9" placeholder="Search name, email or phone" />
          </label>
          <select name="status" className="input" defaultValue="">
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{formatLabel(status)}</option>
            ))}
          </select>
          <select name="widgetConfigId" className="input" defaultValue="">
            <option value="">All widgets</option>
            {widgets.map((widget) => (
              <option key={widget.id} value={widget.id}>{widget.name}</option>
            ))}
          </select>
          <button className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-white disabled:opacity-60" disabled={loading}>
            Apply
          </button>
        </form>

        {error ? (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <h3 className="font-semibold text-[var(--danger-text)]">Could not load leads</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{error}</p>
            </div>
          </div>
        ) : loading && !list ? (
          <div className="space-y-3 p-5" role="status" aria-label="Loading leads">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-16 animate-pulse rounded-md bg-[var(--surface-card-muted)]" />
            ))}
          </div>
        ) : data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[var(--surface-card-muted)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-soft)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Conversations</th>
                  <th className="px-4 py-3 font-medium">Status</th>
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
                            {lead.name || lead.email || lead.phone || "Anonymous lead"}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-[var(--text-soft)]">{lead.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--text-base)]">
                      <p>{lead.email || "No email"}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{lead.phone || "No phone"}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--text-base)]">
                      {lead.widgetConfig?.name ?? "Deleted widget"}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--text-base)]">
                      {lead._count?.conversations ?? 0}
                    </td>
                    <td className="px-4 py-4"><StatusPill status={lead.status} /></td>
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
              <h3 className="mt-3 font-semibold text-[var(--text-strong)]">No leads found</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Configure lead fields on a widget, then start a new visitor conversation.
              </p>
            </div>
          </div>
        )}

        {list ? (
          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-5 py-3">
            <span className="text-xs text-[var(--text-muted)]">Page {list.page} of {list.totalPages}</span>
            <div className="flex gap-2">
              <button type="button" className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-strong)] disabled:opacity-40" disabled={list.page <= 1 || loading} onClick={() => onPageChange(list.page - 1)} aria-label="Previous leads page"><ChevronLeft size={15} /></button>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-strong)] disabled:opacity-40" disabled={list.page >= list.totalPages || loading} onClick={() => onPageChange(list.page + 1)} aria-label="Next leads page"><ChevronRight size={15} /></button>
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
}: {
  lead: Lead;
  loading: boolean;
  onUpdate: (id: string, input: Partial<Lead>) => Promise<void>;
}) {
  const router = useRouter();
  const [tags, setTags] = useState((lead.tags ?? []).join(", "));
  return (
    <div className="space-y-4">
      <button type="button" onClick={() => router.push("/leads")} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-strong)]">
        <ArrowLeft size={16} /> Back to leads
      </button>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--border-subtle)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-strong)]">{lead.name || "Anonymous lead"}</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Captured by {lead.widgetConfig?.name ?? "a deleted widget"}</p>
              </div>
              <StatusPill status={lead.status} />
            </div>
          </div>
          <form
            className="space-y-5 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void onUpdate(lead.id, {
                name: String(form.get("name") || ""),
                email: String(form.get("email") || "") || null,
                phone: String(form.get("phone") || "") || null,
                status: String(form.get("status")) as LeadStatus,
                notes: String(form.get("notes") || ""),
                tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
              });
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name"><input name="name" className="input" defaultValue={lead.name ?? ""} /></Field>
              <Field label="Status">
                <select name="status" className="input" defaultValue={lead.status}>
                  {statuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
                </select>
              </Field>
              <Field label="Email"><input name="email" type="email" className="input" defaultValue={lead.email ?? ""} /></Field>
              <Field label="Phone"><input name="phone" type="tel" pattern="\+[1-9][0-9 ()-]{7,24}" title="Use an international number including country code, for example +1 650 253 0000" className="input" defaultValue={lead.phone ?? ""} /></Field>
            </div>
            <Field label="Tags">
              <div className="relative"><Tag className="absolute left-3 top-3 h-4 w-4 text-[var(--text-soft)]" /><input className="input pl-9" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="sales, enterprise, follow-up" /></div>
            </Field>
            <Field label="Internal notes"><textarea name="notes" rows={5} className="input resize-y" defaultValue={lead.notes ?? ""} /></Field>
            <button disabled={loading} className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-white disabled:opacity-60">{loading ? "Saving..." : "Save lead"}</button>
          </form>
        </section>

        <div className="space-y-4">
          <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-semibold text-[var(--text-strong)]">Contact snapshot</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Info icon={Mail} label="Email" value={lead.email || "Not provided"} />
              <Info icon={Phone} label="Phone" value={lead.phone || "Not provided"} />
              <Info icon={MessageSquare} label="Conversations" value={String(lead._count?.conversations ?? 0)} />
            </div>
          </section>
          <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-semibold text-[var(--text-strong)]">Captured fields</h3>
            <dl className="mt-4 divide-y divide-[var(--border-subtle)]">
              {Object.entries(lead.fieldValues ?? {}).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[120px_1fr] gap-3 py-3 text-sm">
                  <dt className="text-[var(--text-muted)]">{formatLabel(key)}</dt>
                  <dd className="break-words text-[var(--text-strong)]">{formatCapturedValue(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-semibold text-[var(--text-strong)]">Conversation history</h3>
            <div className="mt-3 space-y-2">
              {(lead.conversations ?? []).map((conversation) => (
                <button key={conversation.id} type="button" onClick={() => router.push(`/inbox?conversation=${conversation.id}`)} className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--border-subtle)] px-3 py-3 text-left hover:bg-[var(--surface-hover)]">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-[var(--text-strong)]">{conversation.id}</span><span className="mt-1 block text-xs text-[var(--text-muted)]">{formatDate(conversation.lastMessageAt)}</span></span>
                  <StatusPill status={conversation.status} />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 text-[var(--accent-primary)]" /><div className="min-w-0"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-0.5 break-words text-[var(--text-strong)]">{value}</p></div></div>;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatCapturedValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "Not provided";
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
        <h2 className="mt-3 text-lg font-semibold text-[var(--text-strong)]">{title}</h2>
        <p className="mt-1 max-w-md text-sm text-[var(--text-muted)]">{description}</p>
        <button type="button" onClick={onAction} className="mt-5 h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-white">
          {actionLabel}
        </button>
      </div>
    </section>
  );
}

function LeadDetailSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]" role="status" aria-label="Loading lead">
      <div className="h-[560px] animate-pulse rounded-lg bg-[var(--surface-card-muted)]" />
      <div className="h-[360px] animate-pulse rounded-lg bg-[var(--surface-card-muted)]" />
    </div>
  );
}
