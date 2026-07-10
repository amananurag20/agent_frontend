import type {
  FormHandler,
  Organization,
  ProductKey,
  User,
} from "@/lib/types";
import { Card, CardHeader, Field, StatusPill } from "./ui";

const productOptions: Array<[ProductKey, string]> = [
  ["customer_chat", "Customer Chat"],
  ["appointment_booking", "Appointments"],
  ["whatsapp_assistant", "WhatsApp"],
  ["voice_receptionist", "Voice"],
];

export function UsersView({
  users,
  organizations,
  selectedOrganizationId,
  isSuperAdmin,
  onCreate,
  onInvite,
  onUpdateAccess,
  onToggleStatus,
}: {
  users: User[];
  organizations: Organization[];
  selectedOrganizationId: string | null;
  isSuperAdmin: boolean;
  onCreate: FormHandler;
  onInvite: FormHandler;
  onUpdateAccess: (
    user: User,
    role: string,
    productKeys: ProductKey[],
    clearanceLevel: number,
  ) => void;
  onToggleStatus: (user: User) => void;
}) {
  const visibleUsers = selectedOrganizationId
    ? users.filter((user) => user.orgId === selectedOrganizationId)
    : users;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <UserForm
          title="Invite user"
          submitLabel="Create invite"
          onSubmit={onInvite}
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          isSuperAdmin={isSuperAdmin}
        />
        <UserForm
          title="Create user directly"
          submitLabel="Create user"
          onSubmit={onCreate}
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          isSuperAdmin={isSuperAdmin}
          includePassword
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Users</h2>
            <span className="text-xs text-[#667085]">{visibleUsers.length} accounts</span>
          </div>
        </CardHeader>
        <div className="divide-y divide-[#eef2f6]">
          {visibleUsers.map((user) => (
            <UserAccessRow
              key={user.id}
              user={user}
              onUpdateAccess={onUpdateAccess}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function UserForm({
  title,
  submitLabel,
  onSubmit,
  organizations,
  selectedOrganizationId,
  isSuperAdmin,
  includePassword = false,
}: {
  title: string;
  submitLabel: string;
  onSubmit: FormHandler;
  organizations: Organization[];
  selectedOrganizationId: string | null;
  isSuperAdmin: boolean;
  includePassword?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-[#d8dde6] bg-white p-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name"><input name="name" className="input" required={includePassword} /></Field>
        <Field label="Email"><input name="email" type="email" className="input" required /></Field>
        {includePassword ? (
          <Field label="Temporary password"><input name="password" type="password" className="input" required minLength={8} /></Field>
        ) : null}
        <Field label="Role">
          <select name="role" className="input" defaultValue="agent">
            <option value="org_admin">Org Admin</option>
            <option value="product_admin">Product Admin</option>
            <option value="agent">Agent</option>
            <option value="user">User</option>
          </select>
        </Field>
        <Field label="Clearance level">
          <select name="clearanceLevel" className="input" defaultValue="0">
            {[0, 1, 2, 3, 4].map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </Field>
        {isSuperAdmin ? (
          <Field label="Organization">
            <select name="orgId" className="input" defaultValue={selectedOrganizationId ?? ""} required>
              <option value="" disabled>Select organization</option>
              {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            </select>
          </Field>
        ) : null}
      </div>
      <ProductChecks />
      <button className="mt-4 h-10 rounded-md bg-[#101828] px-4 text-sm font-medium text-white">
        {submitLabel}
      </button>
    </form>
  );
}

function ProductChecks({ selected = [] }: { selected?: ProductKey[] }) {
  return (
    <fieldset className="mt-4 border-t border-[#e4e7ec] pt-4">
      <legend className="text-sm font-medium text-[#344054]">Product access</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {productOptions.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="productKeys" value={key} defaultChecked={selected.includes(key)} /> {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function UserAccessRow({
  user,
  onUpdateAccess,
  onToggleStatus,
}: {
  user: User;
  onUpdateAccess: (user: User, role: string, productKeys: ProductKey[], clearanceLevel: number) => void;
  onToggleStatus: (user: User) => void;
}) {
  const selectedRole = ["super_admin", "org_admin", "product_admin", "agent", "user"].find((role) => user.roles.includes(role)) ?? "user";
  const selectedProducts = user.productAccess?.map((access) => access.productKey) ?? [];

  return (
    <form
      className="p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onUpdateAccess(
          user,
          String(form.get("role")),
          form.getAll("productKeys") as ProductKey[],
          Number(form.get("clearanceLevel")),
        );
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
          <p className="text-xs text-[#667085]">{user.email}</p>
        </div>
        <StatusPill status={user.isActive === false ? "inactive" : "active"} />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[180px_140px_minmax(0,1fr)_auto_auto] md:items-end">
        <Field label="Role">
          <select name="role" className="input" defaultValue={selectedRole} disabled={selectedRole === "super_admin"}>
            {selectedRole === "super_admin" ? <option value="super_admin">Super Admin</option> : null}
            <option value="org_admin">Org Admin</option>
            <option value="product_admin">Product Admin</option>
            <option value="agent">Agent</option>
            <option value="user">User</option>
          </select>
        </Field>
        <Field label="Clearance">
          <select name="clearanceLevel" className="input" defaultValue={user.clearanceLevel ?? 0}>
            {[0, 1, 2, 3, 4].map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 pb-2">
          {productOptions.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="productKeys" value={key} defaultChecked={selectedProducts.includes(key)} /> {label}
            </label>
          ))}
        </div>
        <button className="h-10 rounded-md border border-[#cfd6e2] px-3 text-sm hover:bg-[#f2f4f7]">Save access</button>
        <button type="button" onClick={() => onToggleStatus(user)} className="h-10 rounded-md border border-[#cfd6e2] px-3 text-sm hover:bg-[#f2f4f7]">
          {user.isActive === false ? "Activate" : "Deactivate"}
        </button>
      </div>
    </form>
  );
}
