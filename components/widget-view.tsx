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
        className="rounded-lg border border-[#263449] bg-[#111c2e] p-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Widget Config</h2>
            <p className="mt-1 text-xs text-[#8797b0]">
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
          <button className="h-10 w-fit rounded-md bg-[#4f7cff] px-4 text-sm font-medium text-white">
            Save widget
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="rounded-lg border border-[#263449] bg-[#111c2e] p-4">
          <h2 className="font-semibold">Preview</h2>
          <div className="mt-4 rounded-lg border border-[#263449] bg-[#111c2e] p-4">
            <div className="ml-auto w-64 rounded-lg border border-[#263449] bg-[#111c2e] p-3 shadow-sm">
              <p className="text-xs font-medium text-[#8797b0]">AgentCore</p>
              <p className="mt-2 text-sm">
                {config?.greetingText ?? "Hi! How can I help you today?"}
              </p>
              <div className="mt-3 rounded-md bg-[#172b47] p-2 text-xs text-[#6ba3ff]">
                Ask about services, policies, pricing, or booking.
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111c2e] text-white">
                AI
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={onSendTestMessage}
          className="rounded-lg border border-[#263449] bg-[#111c2e] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Test Visitor Chat</h2>
              <p className="mt-1 text-xs text-[#8797b0]">
                Sends through the real public widget API and appears in Inbox.
              </p>
            </div>
            {testConversation ? (
              <span className="rounded-full bg-[#15352f] px-2 py-1 text-xs text-[#5ee2c3]">
                live
              </span>
            ) : null}
          </div>

          <div className="mt-4 max-h-72 space-y-3 overflow-auto rounded-lg border border-[#263449] bg-[#111c2e] p-3">
            {testConversation?.messages.length ? (
              testConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-md p-3 text-sm ${
                    message.role === "visitor"
                      ? "ml-8 bg-[#111c2e] text-white"
                      : "mr-8 bg-[#111c2e] text-[#111c2e]"
                  }`}
                >
                  <p className="text-xs font-medium opacity-70">
                    {message.role}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                  {message.role === "assistant" ? (
                    <AiStatus metadata={message.metadata} />
                  ) : null}
                  {message.citations.length ? (
                    <p className="mt-2 text-xs opacity-70">
                      {message.citations.length} citation
                      {message.citations.length === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-[#8797b0]">
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
              className="h-10 rounded-md bg-[#4f7cff] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!config?.enabled || !config?.widgetKey}
            >
              Send
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-[#263449] bg-[#111c2e] p-4">
          <h2 className="font-semibold">Install Data</h2>
          <p className="mt-2 text-xs text-[#8797b0]">
            Use this widget key when we add the final embeddable visitor script.
          </p>
          <pre className="mt-3 overflow-auto rounded-md bg-[#111c2e] p-3 text-xs text-white">
            {`data-widget-key="${config?.widgetKey ?? "WIDGET_KEY"}"`}
          </pre>
        </div>
      </div>
    </div>
  );
}

function AiStatus({ metadata }: { metadata: Record<string, unknown> }) {
  const usedFallback = metadata.usedFallback === true;
  const provider =
    typeof metadata.provider === "string" ? metadata.provider : "local";

  return (
    <p
      className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs ${
        usedFallback
          ? "bg-[#3a2b18] text-[#f6b95f]"
          : "bg-[#15352f] text-[#5ee2c3]"
      }`}
    >
      {usedFallback ? "fallback" : `AI ${provider}`}
    </p>
  );
}
