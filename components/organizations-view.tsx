import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[var(--text-strong)]">Organizations</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Existing tenants, plans, deployments, and primary contacts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]"
              >
                <Plus className="h-4 w-4" />
                Add organization
              </button>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[var(--surface-card-muted)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-soft)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Deployment</th>
                  <th className="px-5 py-3 font-medium">Primary admin</th>
                  <th className="px-5 py-3 font-medium">Users</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {organizations.map((organization) => {
                  const isSelected = organization.id === selectedOrganizationId;
                  return (
                    <tr
                      key={organization.id}
                      onClick={() => {
                        onSelect(organization.id);
                        router.push(`/organizations/${organization.id}`);
                      }}
                      className={`cursor-pointer transition hover:bg-[var(--surface-hover)] ${
                        isSelected ? "bg-[var(--surface-accent)]" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-tint)] text-[var(--accent-primary)]">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--text-strong)]">
                              {organization.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                              {organization.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[var(--text-base)]">
                        {formatBadgeValue(organization.plan)}
                      </td>
                      <td className="px-5 py-4 text-[var(--text-base)]">
                        {formatBadgeValue(organization.deploymentMode)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-[var(--text-strong)]">
                            {organization.users?.[0]?.name ?? "No admin name"}
                          </p>
                          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                            {organization.users?.[0]?.email ?? "No admin email"}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[var(--text-base)]">
                        {organization._count?.users ?? 0}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={organization.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                  Create organization
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Create the tenant and its first organization administrator together.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5">
              <form
                onSubmit={(event) => {
                  void onCreate(event);
                  setIsCreateOpen(false);
                }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Field label="Organization name">
                      <input name="name" className="input" required minLength={2} />
                    </Field>
                  </div>
                  <Field label="Contact email">
                    <input name="contactEmail" type="email" className="input" />
                  </Field>
                  <Field label="Contact phone">
                    <input name="contactPhone" className="input" />
                  </Field>
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

                <div className="border-t border-[var(--border-subtle)] pt-5">
                  <h3 className="text-sm font-semibold text-[var(--text-strong)]">First org admin</h3>
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Name">
                      <input name="adminName" className="input" required />
                    </Field>
                    <Field label="Email">
                      <input name="adminEmail" type="email" className="input" required />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Temporary password">
                        <input
                          name="adminPassword"
                          type="password"
                          className="input"
                          required
                          minLength={8}
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                <fieldset className="border-t border-[var(--border-subtle)] pt-5">
                  <legend className="text-sm font-semibold text-[var(--text-strong)]">
                    Enabled products
                  </legend>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {products.map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-4 py-3 text-sm text-[var(--text-base)]"
                      >
                        <input type="checkbox" name="products" value={key} />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-5">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
                  >
                    Cancel
                  </button>
                  <button className="h-10 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
                    Create organization
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatBadgeValue(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
