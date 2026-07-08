import type { FormHandler, User } from "@/lib/types";
import { Card, CardHeader, Field, StatusPill } from "./ui";

export function UsersView({
  users,
  onCreate,
  onToggleStatus,
}: {
  users: User[];
  onCreate: FormHandler;
  onToggleStatus: (user: User) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={onCreate} className="rounded-lg border border-[#d8dde6] bg-white p-4">
        <h2 className="font-semibold">Create User</h2>
        <div className="mt-4 space-y-4">
          <Field label="Name">
            <input name="name" className="input" required />
          </Field>
          <Field label="Email">
            <input name="email" type="email" className="input" required />
          </Field>
          <Field label="Password">
            <input name="password" type="password" className="input" required />
          </Field>
          <Field label="Role">
            <select name="role" className="input" defaultValue="agent">
              <option value="agent">Agent</option>
              <option value="org_admin">Org Admin</option>
              <option value="user">User</option>
            </select>
          </Field>
          <button className="h-10 rounded-md bg-[#101828] px-4 text-sm font-medium text-white">
            Create user
          </button>
        </div>
      </form>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Users</h2>
        </CardHeader>
        <div className="divide-y divide-[#eef2f6]">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
                <p className="text-xs text-[#667085]">
                  {user.email} · {user.roles.join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={user.isActive === false ? "inactive" : "active"} />
                <button
                  onClick={() => onToggleStatus(user)}
                  className="h-9 rounded-md border border-[#cfd6e2] px-3 text-sm hover:bg-[#f2f4f7]"
                >
                  {user.isActive === false ? "Activate" : "Deactivate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
