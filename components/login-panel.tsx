import type { ApiState, FormHandler } from "@/lib/types";
import { type ReactNode, useState } from "react";
import { Field, StateMessage } from "./ui";

type AuthMode = "login" | "reset-request" | "reset-confirm" | "invite";

export function LoginPanel({
  onSubmit,
  onRequestPasswordReset,
  onResetPassword,
  onAcceptInvite,
  state,
}: {
  onSubmit: FormHandler;
  onRequestPasswordReset: FormHandler;
  onResetPassword: FormHandler;
  onAcceptInvite: FormHandler;
  state: ApiState;
}) {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-[#263449] bg-[#111c2e] p-5 shadow-sm">
        <div className="flex rounded-md border border-[#263449] bg-[#142238] p-1">
          <AuthModeButton
            active={mode === "login"}
            onClick={() => setMode("login")}
          >
            Sign in
          </AuthModeButton>
          <AuthModeButton
            active={mode === "reset-request" || mode === "reset-confirm"}
            onClick={() => setMode("reset-request")}
          >
            Reset
          </AuthModeButton>
          <AuthModeButton
            active={mode === "invite"}
            onClick={() => setMode("invite")}
          >
            Invite
          </AuthModeButton>
        </div>

        {mode === "login" ? (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <h2 className="text-lg font-semibold">Sign in</h2>
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
            <button className="h-10 w-full rounded-md bg-[#4f7cff] text-sm font-medium text-white hover:bg-[#26344f]">
              Sign in
            </button>
          </form>
        ) : null}

        {mode === "reset-request" ? (
          <form onSubmit={onRequestPasswordReset} className="mt-5 space-y-4">
            <h2 className="text-lg font-semibold">Request reset</h2>
            <Field label="Email">
              <input
                name="email"
                type="email"
                className="input"
                required
              />
            </Field>
            <button className="h-10 w-full rounded-md bg-[#4f7cff] text-sm font-medium text-white hover:bg-[#26344f]">
              Create reset token
            </button>
            <button
              type="button"
              onClick={() => setMode("reset-confirm")}
              className="h-9 w-full rounded-md border border-[#314158] text-sm hover:bg-[#18263b]"
            >
              I have a reset token
            </button>
          </form>
        ) : null}

        {mode === "reset-confirm" ? (
          <form onSubmit={onResetPassword} className="mt-5 space-y-4">
            <h2 className="text-lg font-semibold">Set new password</h2>
            <Field label="Reset token">
              <textarea name="token" className="input min-h-24" required />
            </Field>
            <Field label="New password">
              <input
                name="password"
                type="password"
                className="input"
                required
                minLength={8}
              />
            </Field>
            <button className="h-10 w-full rounded-md bg-[#4f7cff] text-sm font-medium text-white hover:bg-[#26344f]">
              Reset password
            </button>
          </form>
        ) : null}

        {mode === "invite" ? (
          <form onSubmit={onAcceptInvite} className="mt-5 space-y-4">
            <h2 className="text-lg font-semibold">Accept invite</h2>
            <Field label="Invite token">
              <textarea name="token" className="input min-h-24" required />
            </Field>
            <Field label="Name">
              <input name="name" className="input" required minLength={2} />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type="password"
                className="input"
                required
                minLength={8}
              />
            </Field>
            <button className="h-10 w-full rounded-md bg-[#4f7cff] text-sm font-medium text-white hover:bg-[#26344f]">
              Join organization
            </button>
          </form>
        ) : null}

        <div className="mt-4">
          <StateMessage state={state} />
        </div>
      </div>
    </div>
  );
}

function AuthModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 flex-1 rounded text-sm ${
        active ? "bg-[#111c2e] shadow-sm" : "text-[#8797b0]"
      }`}
    >
      {children}
    </button>
  );
}
