import type { AIProvider, FormHandler } from "@/lib/types";
import { Card, CardHeader, Field, StatusPill } from "./ui";

export function AIProvidersView({
  providers,
  onCreate,
}: {
  providers: AIProvider[];
  onCreate: FormHandler;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={onCreate} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
        <h2 className="font-semibold">Add AI Provider</h2>
        <div className="mt-4 space-y-4">
          <Field label="Provider">
            <select name="provider" className="input" defaultValue="openai">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="local">Local</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          <Field label="Adapter">
            <select name="adapter" className="input" defaultValue="openai">
              <option value="openai">OpenAI</option>
              <option value="openai_compatible">OpenAI-compatible</option>
              <option value="mistral">Mistral</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama / local</option>
            </select>
          </Field>
          <Field label="Name">
            <input name="name" className="input" defaultValue="Default OpenAI" required />
          </Field>
          <Field label="Base URL">
            <input
              name="baseUrl"
              className="input"
              placeholder="https://api.openai.com/v1"
            />
          </Field>
          <Field label="API key">
            <input name="apiKey" type="password" className="input" />
          </Field>
          <Field label="Chat model">
            <input name="chatModel" className="input" defaultValue="gpt-4.1-mini" />
          </Field>
          <Field label="Embedding model">
            <input name="embeddingModel" className="input" defaultValue="text-embedding-3-small" />
          </Field>
          <button className="h-10 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)]">
            Save provider
          </button>
        </div>
      </form>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Providers</h2>
        </CardHeader>
        <div className="divide-y divide-[var(--border-subtle)]">
          {providers.map((provider) => (
            <div key={provider.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{provider.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {provider.provider} · {provider.chatModel ?? "no chat model"} · key{" "}
                  {provider.hasApiKey ? "set" : "missing"}
                </p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  {(provider.settings?.adapter as string | undefined) ?? "auto"} ·{" "}
                  {provider.baseUrl ?? "default endpoint"}
                </p>
              </div>
              <StatusPill status={provider.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
