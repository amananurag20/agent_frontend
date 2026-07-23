import type { TabId } from "@/lib/types";

const pulse =
  "animate-pulse rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)]";

export function ConsoleSectionSkeleton({
  section,
  detail = false,
}: {
  section: TabId;
  detail?: boolean;
}) {
  return (
    <div role="status" aria-label={`Loading ${section}`} className="space-y-4">
      {section === "dashboard" ? <DashboardSkeleton /> : null}
      {section === "inbox" || section === "whatsapp" || section === "voice" ? (
        <ConversationSkeleton />
      ) : null}
      {section === "leads" ? (
        detail ? <DetailSkeleton /> : <TableSkeleton filters columns={6} />
      ) : null}
      {section === "appointments" ? <AppointmentsSkeleton /> : null}
      {section === "knowledge" || section === "widget" ? (
        <WorkspaceSkeleton />
      ) : null}
      {["organizations", "users", "products", "ai", "audit"].includes(
        section,
      ) ? (
        <TableSkeleton
          filters={section === "users" || section === "ai"}
          columns={section === "products" ? 4 : 6}
        />
      ) : null}
      <span className="sr-only">Loading {section}…</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className={`${pulse} h-28`} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className={`${pulse} h-[360px]`} />
        <div className="space-y-4">
          <div className={`${pulse} h-44`} />
          <div className={`${pulse} h-40`} />
        </div>
      </div>
    </>
  );
}

function ConversationSkeleton() {
  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="border-b border-[var(--border-subtle)] p-4 lg:border-b-0 lg:border-r">
        <div className={`${pulse} h-10`} />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className={`${pulse} h-20`} />
          ))}
        </div>
      </div>
      <div className="flex flex-col p-5">
        <div className={`${pulse} h-16`} />
        <div className="flex flex-1 flex-col justify-end gap-4 py-8">
          <div className={`${pulse} h-16 w-2/3`} />
          <div className={`${pulse} ml-auto h-20 w-3/5`} />
          <div className={`${pulse} h-14 w-1/2`} />
        </div>
        <div className={`${pulse} h-24`} />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className={`${pulse} h-8 w-32`} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <div className={`${pulse} h-[620px]`} />
        <div className="space-y-4">
          <div className={`${pulse} h-52`} />
          <div className={`${pulse} h-44`} />
          <div className={`${pulse} h-40`} />
        </div>
      </div>
    </>
  );
}

function AppointmentsSkeleton() {
  return (
    <>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className={`${pulse} h-10 w-28`} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className={`${pulse} h-[600px]`} />
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
          <div className={`${pulse} h-12`} />
          <div className="mt-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, item) => (
              <div key={item} className={`${pulse} h-20`} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
        <div className={`${pulse} h-10`} />
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className={`${pulse} h-12`} />
        ))}
      </div>
      <div className="space-y-4">
        <div className={`${pulse} h-24`} />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className={`${pulse} h-44`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TableSkeleton({
  filters = false,
  columns,
}: {
  filters?: boolean;
  columns: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)]">
      {filters ? (
        <div className="grid gap-3 border-b border-[var(--border-subtle)] p-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className={`${pulse} h-10`} />
          ))}
        </div>
      ) : null}
      <div
        className="grid gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }, (_, item) => (
          <div key={item} className={`${pulse} h-4 border-0`} />
        ))}
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {[0, 1, 2, 3, 4, 5, 6].map((row) => (
          <div
            key={row}
            className="grid gap-3 p-4"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }, (_, column) => (
              <div
                key={column}
                className={`${pulse} h-5 border-0`}
                style={{ width: `${55 + ((row + column) % 4) * 12}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
