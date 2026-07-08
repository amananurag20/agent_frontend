import type { FormHandler, WidgetConfig } from "@/lib/types";
import { Field } from "./ui";

export function WidgetView({
  config,
  onSubmit,
}: {
  config: WidgetConfig | null;
  onSubmit: FormHandler;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-[#d8dde6] bg-white p-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Widget Config</h2>
            <p className="mt-1 text-xs text-[#667085]">
              Widget key: {config?.widgetKey ?? "Not loaded"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={config?.enabled}
            />
            Enabled
          </label>
        </div>
        <div className="mt-5 grid gap-4">
          <Field label="Greeting">
            <input
              key={config?.greetingText}
              name="greetingText"
              defaultValue={config?.greetingText}
              className="input"
            />
          </Field>
          <Field label="Allowed domains">
            <textarea
              key={config?.allowedDomains.join("\n")}
              name="allowedDomains"
              rows={5}
              defaultValue={config?.allowedDomains.join("\n")}
              className="input resize-y"
            />
          </Field>
          <button className="h-10 w-fit rounded-md bg-[#101828] px-4 text-sm font-medium text-white">
            Save widget
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="rounded-lg border border-[#d8dde6] bg-white p-4">
          <h2 className="font-semibold">Preview</h2>
          <div className="mt-4 rounded-lg border border-[#e4e7ec] bg-[#fbfcfe] p-4">
            <div className="ml-auto w-64 rounded-lg border border-[#d8dde6] bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-[#667085]">AgentCore</p>
              <p className="mt-2 text-sm">
                {config?.greetingText ?? "Hi! How can I help you today?"}
              </p>
              <div className="mt-3 rounded-md bg-[#eff7ff] p-2 text-xs text-[#175cd3]">
                Ask about services, policies, pricing, or booking.
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#101828] text-white">
                AI
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#d8dde6] bg-white p-4">
          <h2 className="font-semibold">Install Data</h2>
          <p className="mt-2 text-xs text-[#667085]">
            Use this widget key when we add the final embeddable visitor script.
          </p>
          <pre className="mt-3 overflow-auto rounded-md bg-[#101828] p-3 text-xs text-white">
            {`data-widget-key="${config?.widgetKey ?? "WIDGET_KEY"}"`}
          </pre>
        </div>
      </div>
    </div>
  );
}
