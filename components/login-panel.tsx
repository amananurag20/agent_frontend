import type { ApiState, FormHandler } from "@/lib/types";
import { Field, StateMessage } from "./ui";

export function LoginPanel({
  onSubmit,
  state,
}: {
  onSubmit: FormHandler;
  state: ApiState;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-[#d8dde6] bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Sign in</h2>
        <div className="mt-5 space-y-4">
          <Field label="Email">
            <input
              name="email"
              type="email"
              defaultValue="admin@agentcore.local"
              className="input"
              required
            />
          </Field>
          <Field label="Password">
            <input
              name="password"
              type="password"
              defaultValue="Admin@12345"
              className="input"
              required
            />
          </Field>
          <button className="h-10 w-full rounded-md bg-[#101828] text-sm font-medium text-white hover:bg-[#26344f]">
            Sign in
          </button>
          <StateMessage state={state} />
        </div>
      </form>
    </div>
  );
}
