import type { FormHandler, Organization } from "@/lib/types";
import { Card, CardHeader, Field, StatusPill } from "./ui";

const products = [
  ["customer_chat", "Customer Chat"],
  ["appointment_booking", "Appointments"],
  ["whatsapp_assistant", "WhatsApp"],
  ["voice_receptionist", "Voice"],
] as const;

export function OrganizationsView({
  organizations,
  selectedOrganizationId,
  onSelect,
  onCreate,
}: {
  organizations: Organization[];
  selectedOrganizationId: string | null;
  onSelect: (organizationId: string) => void;
  onCreate: FormHandler;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[430px_minmax(320px,1fr)]">
      <form onSubmit={onCreate} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
        <h2 className="font-semibold">Create organization</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          A first organization administrator is required.
        </p>
        <div className="mt-4 space-y-4">
          <Field label="Organization name">
            <input name="name" className="input" required minLength={2} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact email">
              <input name="contactEmail" type="email" className="input" />
            </Field>
            <Field label="Contact phone">
              <input name="contactPhone" className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan">
              <select name="plan" className="input" defaultValue="free">
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </Field>
            <Field label="Deployment">
              <select name="deploymentMode" className="input" defaultValue="saas">
                <option value="saas">SaaS</option>
                <option value="local">Local</option>
              </select>
            </Field>
          </div>
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <h3 className="text-sm font-semibold">First org admin</h3>
            <div className="mt-3 space-y-3">
              <Field label="Name"><input name="adminName" className="input" required /></Field>
              <Field label="Email"><input name="adminEmail" type="email" className="input" required /></Field>
              <Field label="Temporary password"><input name="adminPassword" type="password" className="input" required minLength={8} /></Field>
            </div>
          </div>
          <fieldset className="border-t border-[var(--border-subtle)] pt-4">
            <legend className="text-sm font-semibold">Enabled products</legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {products.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="products" value={key} /> {label}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)]">
            Create organization
          </button>
        </div>
      </form>

      <Card>
        <CardHeader><h2 className="font-semibold">Organizations</h2></CardHeader>
        <div className="divide-y divide-[var(--border-subtle)]">
          {organizations.map((organization) => (
            <button
              key={organization.id}
              type="button"
              onClick={() => onSelect(organization.id)}
              className={`flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-[var(--surface-hover)] ${selectedOrganizationId === organization.id ? "bg-[var(--surface-accent)]" : ""}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{organization.name}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {organization.users?.[0]?.email ?? "No active admin shown"} · {organization._count?.users ?? 0} users
                </p>
              </div>
              <StatusPill status={organization.status} />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
