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
    <form onSubmit={onSubmit} className="rounded-lg border border-[#d8dde6] bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Widget Config</h2>
          <p className="mt-1 text-xs text-[#667085]">
            Widget key: {config?.widgetKey ?? "Not loaded"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="enabled" type="checkbox" defaultChecked={config?.enabled} />
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
  );
}
