import type { Conversation, FormHandler, WidgetConfig } from "@/lib/types";
import { Field } from "./ui";

export function WidgetView({
  config,
  onSubmit,
  testConversation,
  onSendTestMessage,
}: {
  config: WidgetConfig | null;
  onSubmit: FormHandler;
  testConversation: Conversation | null;
  onSendTestMessage: FormHandler;
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

        <form
          onSubmit={onSendTestMessage}
          className="rounded-lg border border-[#d8dde6] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Test Visitor Chat</h2>
              <p className="mt-1 text-xs text-[#667085]">
                Sends through the real public widget API and appears in Inbox.
              </p>
            </div>
            {testConversation ? (
              <span className="rounded-full bg-[#ecfdf3] px-2 py-1 text-xs text-[#027a48]">
                live
              </span>
            ) : null}
          </div>

          <div className="mt-4 max-h-72 space-y-3 overflow-auto rounded-lg border border-[#e4e7ec] bg-[#fbfcfe] p-3">
            {testConversation?.messages.length ? (
              testConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-md p-3 text-sm ${
                    message.role === "visitor"
                      ? "ml-8 bg-[#101828] text-white"
                      : "mr-8 bg-white text-[#101828]"
                  }`}
                >
                  <p className="text-xs font-medium opacity-70">
                    {message.role}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                  {message.citations.length ? (
                    <p className="mt-2 text-xs opacity-70">
                      {message.citations.length} citation
                      {message.citations.length === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-[#667085]">
                Ask a visitor question to test the widget and RAG response.
              </p>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              name="message"
              required
              placeholder="Ask about CampusX courses..."
              className="input min-w-0 flex-1"
              disabled={!config?.enabled || !config?.widgetKey}
            />
            <button
              className="h-10 rounded-md bg-[#101828] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!config?.enabled || !config?.widgetKey}
            >
              Send
            </button>
          </div>
        </form>

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
