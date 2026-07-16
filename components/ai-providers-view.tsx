"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  Settings2,
  Star,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import type { AIProvider } from "@/lib/types";
import { Field, StatusPill } from "./ui";

type CostSettings = {
  monthlyBudgetUsd?: number;
  budgetMode?: "tracking" | "warn" | "block";
  pricingOverrideEnabled?: boolean;
  pricing?: {
    chatInputPerMillionUsd?: number;
    chatOutputPerMillionUsd?: number;
    embeddingInputPerMillionUsd?: number;
  };
};

type Props = {
  providers: AIProvider[];
  onCreate: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onTest: (id: string) => Promise<void>;
  onSetStatus: (id: string, status: "active" | "inactive") => Promise<void>;
  onSetPrimary: (id: string) => Promise<void>;
  onUpdate: (id: string, event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onUpdateCostSettings: (
    id: string,
    event: FormEvent<HTMLFormElement>,
  ) => Promise<void>;
};

type RunAction = (key: string, action: () => Promise<void>) => Promise<void>;

const compact = new Intl.NumberFormat("en", { notation: "compact" });
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
});

export function AIProvidersView({
  providers,
  onCreate,
  onTest,
  onSetStatus,
  onSetPrimary,
  onUpdate,
  onDelete,
  onUpdateCostSettings,
}: Props) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<AIProvider | null>(
    null,
  );
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(
    null,
  );
  const runAction: RunAction = async (key, action) => {
    if (pendingAction) return;
    setPendingAction(key);
    try {
      await action();
    } finally {
      setPendingAction(null);
    }
  };
  const primaryChatId = useMemo(
    () =>
      providers.find(
        (provider) => provider.status === "active" && provider.chatModel,
      )?.id ?? null,
    [providers],
  );
  const totals = providers.reduce(
    (sum, provider) => ({
      requests: sum.requests + (provider.usage?.requests ?? 0),
      tokens: sum.tokens + (provider.usage?.totalTokens ?? 0),
      cost: sum.cost + (provider.usage?.estimatedCostUsd ?? 0),
    }),
    { requests: 0, tokens: 0, cost: 0 },
  );

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              Provider registry
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              The primary active provider handles chat. Other active providers
              remain available and can be promoted explicitly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]"
          >
            <Plus className="h-4 w-4" /> Add provider
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric
            icon={Bot}
            label="Configured"
            value={String(providers.length)}
          />
          <Metric
            icon={CheckCircle2}
            label="Verified"
            value={String(
              providers.filter((item) => item.validationStatus === "verified")
                .length,
            )}
          />
          <Metric
            icon={Activity}
            label="Requests this month"
            value={compact.format(totals.requests)}
          />
          <Metric
            icon={CircleDollarSign}
            label="Estimated spend"
            value={usd.format(totals.cost)}
          />
        </div>

        <div className="overflow-visible rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[var(--surface-card-muted)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-soft)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Provider</th>
                  <th className="px-5 py-3 font-medium">Models</th>
                  <th className="px-5 py-3 font-medium">Routing</th>
                  <th className="px-5 py-3 font-medium">API health</th>
                  <th className="px-5 py-3 font-medium">Month usage</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {providers.map((provider) => {
                  const expanded = expandedId === provider.id;
                  const isPrimary = provider.id === primaryChatId;
                  return (
                    <ProviderRows
                      key={provider.id}
                      provider={provider}
                      expanded={expanded}
                      isPrimary={isPrimary}
                      onToggle={() =>
                        setExpandedId(expanded ? null : provider.id)
                      }
                      onTest={onTest}
                      onSetStatus={onSetStatus}
                      onSetPrimary={onSetPrimary}
                      onRequestEdit={setEditingProvider}
                      onRequestDelete={setDeletingProvider}
                      onUpdateCostSettings={onUpdateCostSettings}
                      pendingAction={pendingAction}
                      runAction={runAction}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          {providers.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Bot className="mx-auto h-8 w-8 text-[var(--text-soft)]" />
              <h3 className="mt-3 font-semibold">No providers configured</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Add and validate a provider before enabling AI traffic.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {isCreateOpen ? (
        <CreateProviderModal
          onClose={() => setIsCreateOpen(false)}
          onCreate={(event) => {
            void runAction("create", async () => {
              if (await onCreate(event)) setIsCreateOpen(false);
            });
          }}
          loading={pendingAction === "create"}
        />
      ) : null}
      {deletingProvider ? (
        <DeleteProviderDialog
          provider={deletingProvider}
          loading={pendingAction === `delete:${deletingProvider.id}`}
          onCancel={() => setDeletingProvider(null)}
          onConfirm={() =>
            void runAction(`delete:${deletingProvider.id}`, async () => {
              if (await onDelete(deletingProvider.id)) {
                setDeletingProvider(null);
                if (expandedId === deletingProvider.id) setExpandedId(null);
              }
            })
          }
        />
      ) : null}
      {editingProvider ? (
        <EditProviderModal
          provider={editingProvider}
          loading={pendingAction === `edit:${editingProvider.id}`}
          onClose={() => setEditingProvider(null)}
          onUpdate={(event) => {
            void runAction(`edit:${editingProvider.id}`, async () => {
              if (await onUpdate(editingProvider.id, event)) {
                setEditingProvider(null);
              }
            });
          }}
        />
      ) : null}
    </>
  );
}

function ProviderRows({
  provider,
  expanded,
  isPrimary,
  onToggle,
  onTest,
  onSetStatus,
  onSetPrimary,
  onRequestEdit,
  onRequestDelete,
  onUpdateCostSettings,
  pendingAction,
  runAction,
}: {
  provider: AIProvider;
  expanded: boolean;
  isPrimary: boolean;
  onToggle: () => void;
  onTest: Props["onTest"];
  onSetStatus: Props["onSetStatus"];
  onSetPrimary: Props["onSetPrimary"];
  onRequestEdit: (provider: AIProvider) => void;
  onRequestDelete: (provider: AIProvider) => void;
  onUpdateCostSettings: Props["onUpdateCostSettings"];
  pendingAction: string | null;
  runAction: RunAction;
}) {
  const usage = provider.usage;
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer transition hover:bg-[var(--surface-hover)]"
      >
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-tint)] text-[var(--accent-primary)]">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--text-strong)]">
                {provider.name}
              </p>
              <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                {provider.provider} ·{" "}
                {(provider.settings.adapter as string | undefined) ??
                  "automatic"}
              </p>
            </div>
          </div>
        </td>
        <td className="px-5 py-4">
          <p className="max-w-48 truncate text-[var(--text-base)]">
            {provider.chatModel ?? "No chat model"}
          </p>
          <p className="mt-1 max-w-48 truncate text-xs text-[var(--text-muted)]">
            {provider.embeddingModel ?? "No embedding model"}
          </p>
        </td>
        <td className="px-5 py-4">
          {isPrimary ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              <Star className="h-3.5 w-3.5 fill-current" /> Primary chat
            </span>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">
              Secondary · priority {provider.priority}
            </span>
          )}
        </td>
        <td className="px-5 py-4">
          <Health provider={provider} />
        </td>
        <td className="px-5 py-4">
          <p className="font-medium">
            {compact.format(usage?.totalTokens ?? 0)} tokens
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {compact.format(usage?.requests ?? 0)} requests ·{" "}
            {usage?.pricingConfigured
              ? usd.format(usage.estimatedCostUsd)
              : "pricing needed"}
          </p>
        </td>
        <td className="px-5 py-4">
          <StatusPill status={provider.status} />
        </td>
        <td
          className="px-5 py-4 text-right"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex justify-end gap-1">
            <ActionIcon
              icon={Pencil}
              label="Edit provider"
              disabled={Boolean(pendingAction)}
              onClick={() => onRequestEdit(provider)}
            />
            <ActionIcon
              icon={Activity}
              label="Test API"
              loading={pendingAction === `test:${provider.id}`}
              disabled={Boolean(pendingAction)}
              onClick={() =>
                void runAction(`test:${provider.id}`, () => onTest(provider.id))
              }
            />
            {!isPrimary ? (
              <ActionIcon
                icon={Star}
                label="Make primary"
                loading={pendingAction === `primary:${provider.id}`}
                disabled={Boolean(pendingAction)}
                onClick={() =>
                  void runAction(`primary:${provider.id}`, () =>
                    onSetPrimary(provider.id),
                  )
                }
              />
            ) : null}
            <ActionIcon
              icon={Power}
              label={
                provider.status === "active"
                  ? "Disable provider"
                  : "Activate provider"
              }
              loading={pendingAction === `status:${provider.id}`}
              disabled={Boolean(pendingAction)}
              onClick={() =>
                void runAction(`status:${provider.id}`, () =>
                  onSetStatus(
                    provider.id,
                    provider.status === "active" ? "inactive" : "active",
                  ),
                )
              }
            />
            <ActionIcon
              icon={Trash2}
              label="Delete provider"
              danger
              disabled={Boolean(pendingAction)}
              onClick={() => onRequestDelete(provider)}
            />
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr>
          <td colSpan={7} className="bg-[var(--surface-card-muted)] p-0">
            <ProviderDetails
              provider={provider}
              onEdit={() => onRequestEdit(provider)}
              onTest={onTest}
              onUpdateCostSettings={onUpdateCostSettings}
              pendingAction={pendingAction}
              runAction={runAction}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function ProviderDetails({
  provider,
  onEdit,
  onTest,
  onUpdateCostSettings,
  pendingAction,
  runAction,
}: {
  provider: AIProvider;
  onEdit: () => void;
  onTest: Props["onTest"];
  onUpdateCostSettings: Props["onUpdateCostSettings"];
  pendingAction: string | null;
  runAction: RunAction;
}) {
  const usage = provider.usage;
  const settings = provider.settings as CostSettings;
  const pricing = settings.pricing ?? {};
  const configuredModels = [provider.chatModel, provider.embeddingModel].filter(
    Boolean,
  ) as string[];
  const chatRate = usage?.modelPricing.find(
    (item) => item.capability === "chat",
  );
  const embeddingRate = usage?.modelPricing.find(
    (item) => item.capability === "embedding",
  );
  const inheritedOverride = (usage?.modelPricing ?? []).some((item) =>
    ["workspace_override", "workspace_default"].includes(item.source),
  );
  const [pricingOverrideEnabled, setPricingOverrideEnabled] = useState(
    settings.pricingOverrideEnabled ?? inheritedOverride,
  );
  const embeddingInputRate = embeddingRate?.inputPerMillionUsd;
  const chatInputRate = chatRate?.inputPerMillionUsd;
  const chatOutputRate = chatRate?.outputPerMillionUsd;
  const estimateEmbedding = (pages: number, tokensPerPage: number) =>
    embeddingInputRate == null
      ? null
      : (pages * tokensPerPage * embeddingInputRate) / 1_000_000;
  const estimateChat = (
    replies: number,
    inputTokensPerReply: number,
    outputTokensPerReply: number,
  ) =>
    chatInputRate == null || chatOutputRate == null
      ? null
      : (replies * inputTokensPerReply * chatInputRate) / 1_000_000 +
        (replies * outputTokensPerReply * chatOutputRate) / 1_000_000;
  const planningRows = [
    {
      workload: "Knowledge embedding",
      volume: "1,000 pages",
      assumption: "400 / 600 / 800 tokens per page",
      low: estimateEmbedding(1_000, 400),
      expected: estimateEmbedding(1_000, 600),
      high: estimateEmbedding(1_000, 800),
    },
    {
      workload: "Knowledge embedding",
      volume: "5,000 pages",
      assumption: "400 / 600 / 800 tokens per page",
      low: estimateEmbedding(5_000, 400),
      expected: estimateEmbedding(5_000, 600),
      high: estimateEmbedding(5_000, 800),
    },
    {
      workload: "Customer chat",
      volume: "1,000 replies",
      assumption: "1K+200 / 2.5K+500 / 5K+1K tokens",
      low: estimateChat(1_000, 1_000, 200),
      expected: estimateChat(1_000, 2_500, 500),
      high: estimateChat(1_000, 5_000, 1_000),
    },
    {
      workload: "Customer chat",
      volume: "10,000 replies",
      assumption: "1K+200 / 2.5K+500 / 5K+1K tokens",
      low: estimateChat(10_000, 1_000, 200),
      expected: estimateChat(10_000, 2_500, 500),
      high: estimateChat(10_000, 5_000, 1_000),
    },
  ];
  const estimateLabel = (value: number | null) =>
    value == null ? "Rate needed" : usd.format(value);
  return (
    <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Connection and models</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {provider.baseUrl ?? "Provider default endpoint"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={Boolean(pendingAction)}
              onClick={onEdit}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 text-sm font-medium hover:bg-[var(--surface-hover)] disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" /> Edit provider
            </button>
            <button
              type="button"
              disabled={Boolean(pendingAction)}
              onClick={() =>
                void runAction(`test:${provider.id}`, () => onTest(provider.id))
              }
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 text-sm font-medium hover:bg-[var(--surface-hover)] disabled:opacity-60"
            >
              {pendingAction === `test:${provider.id}` ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Activity className="h-4 w-4" />
              )}{" "}
              Test API
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {configuredModels.map((model) => (
            <span
              key={model}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-2.5 py-1.5 text-xs"
            >
              <CheckCircle2
                className={`h-3.5 w-3.5 ${provider.validatedModels?.includes(model) ? "text-emerald-600" : "text-[var(--text-soft)]"}`}
              />
              {model}
            </span>
          ))}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <Detail
            label="Credential"
            value={provider.hasApiKey ? "Key stored" : "No key"}
          />
          <Detail
            label="Last test"
            value={
              provider.lastValidatedAt
                ? new Date(provider.lastValidatedAt).toLocaleString()
                : "Never"
            }
          />
          <Detail
            label="Latency"
            value={
              provider.validationLatency
                ? `${provider.validationLatency} ms`
                : "Not measured"
            }
          />
          <Detail
            label="Average call"
            value={`${usage?.averageLatencyMs ?? 0} ms`}
          />
        </dl>
        {provider.validationError ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {provider.validationError}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Knowledge embeddings use the provider selected under Knowledge
          Processing. If none is selected, provider priority is used.
        </p>
        <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h4 className="font-semibold">Workload cost estimates</h4>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Calculated from the effective model rates configured for this
                workspace.
              </p>
            </div>
            <span className="rounded-full bg-[var(--surface-card-muted)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">
              Planning estimate
            </span>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-[var(--surface-card-muted)] text-[10px] uppercase tracking-[0.12em] text-[var(--text-soft)]">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Workload</th>
                  <th className="px-3 py-2.5 font-medium">Volume</th>
                  <th className="px-3 py-2.5 text-right font-medium">Low</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Expected total
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">High</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {planningRows.map((row) => (
                  <tr key={`${row.workload}:${row.volume}`}>
                    <td className="px-3 py-3 font-medium">{row.workload}</td>
                    <td className="px-3 py-3">
                      <p>{row.volume}</p>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        {row.assumption}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {estimateLabel(row.low)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-[var(--text-strong)]">
                      {estimateLabel(row.expected)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {estimateLabel(row.high)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10px] leading-4 text-[var(--text-muted)]">
            Page estimates assume extracted text with normal chunk overlap and
            exclude OCR charges. Chat estimates include prompt/RAG input plus
            model output; actual usage depends on context size and response
            length.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
        <h3 className="font-semibold">Usage and cost controls</h3>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-2xl font-semibold">
              {usage?.pricingConfigured
                ? usd.format(usage.estimatedCostUsd)
                : "$0.00"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Estimated this month
            </p>
          </div>
          <p className="text-sm">
            {usage?.remainingBudgetUsd == null
              ? "No budget set"
              : `${usd.format(usage.remainingBudgetUsd)} remaining`}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-card-muted)]">
          <div
            className="h-full rounded-full bg-[var(--accent-primary)]"
            style={{ width: `${usage?.budgetUsedPercent ?? 0}%` }}
          />
        </div>
        <div className="mt-5 overflow-hidden rounded-md border border-[var(--border-subtle)]">
          <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] bg-[var(--surface-card-muted)] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">
            <span>Model and source</span>
            <span>Input / 1M</span>
            <span>Output / 1M</span>
          </div>
          {(usage?.modelPricing ?? []).map((item) => (
            <div
              key={`${item.capability}:${item.model}`}
              className="grid grid-cols-[minmax(0,1fr)_90px_90px] items-center border-t border-[var(--border-subtle)] px-3 py-2.5 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.model}</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                  {item.capability} · {item.source.replaceAll("_", " ")}
                  {item.catalogUpdatedAt
                    ? ` · catalog ${item.catalogUpdatedAt}`
                    : ""}
                </p>
                {item.catalogSourceUrl ? (
                  <a
                    href={item.catalogSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-[10px] text-[var(--accent-primary)] hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Official pricing source
                  </a>
                ) : null}
              </div>
              <span>
                {item.inputPerMillionUsd == null
                  ? "Not set"
                  : usd.format(item.inputPerMillionUsd)}
              </span>
              <span>
                {item.outputPerMillionUsd == null
                  ? "Not set"
                  : usd.format(item.outputPerMillionUsd)}
              </span>
            </div>
          ))}
        </div>
        <form
          onSubmit={(event) =>
            void runAction(`cost:${provider.id}`, () =>
              onUpdateCostSettings(provider.id, event),
            )
          }
          className="mt-5 grid grid-cols-2 gap-3"
        >
          <label className="col-span-2 flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-3">
            <input
              name="pricingOverrideEnabled"
              type="checkbox"
              checked={pricingOverrideEnabled}
              onChange={(event) =>
                setPricingOverrideEnabled(event.currentTarget.checked)
              }
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium">
                Use custom pricing for AgentCore estimates
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                This never changes the provider&apos;s bill. Leave it off to use
                the official catalog rate shown above.
              </span>
            </span>
          </label>
          <Field label="Monthly budget">
            <input
              name="monthlyBudgetUsd"
              type="number"
              min="0"
              step="0.01"
              className="input"
              defaultValue={settings.monthlyBudgetUsd ?? ""}
            />
          </Field>
          <Field label="Budget behavior">
            <select
              name="budgetMode"
              className="input"
              defaultValue={settings.budgetMode ?? "tracking"}
            >
              <option value="tracking">Track only</option>
              <option value="warn">Warn when reached</option>
              <option value="block">Block new AI calls</option>
            </select>
          </Field>
          <Field label={`${provider.embeddingModel ?? "Embedding"} input / 1M`}>
            <input
              name="embeddingInputRate"
              type="number"
              min="0"
              step="0.0001"
              className="input disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[var(--surface-card-muted)] disabled:text-[var(--text-muted)] disabled:opacity-100"
              disabled={!pricingOverrideEnabled}
              defaultValue={
                embeddingRate?.inputPerMillionUsd ??
                pricing.embeddingInputPerMillionUsd ??
                ""
              }
            />
          </Field>
          <Field label={`${provider.chatModel ?? "Chat"} input / 1M`}>
            <input
              name="chatInputRate"
              type="number"
              min="0"
              step="0.0001"
              className="input disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[var(--surface-card-muted)] disabled:text-[var(--text-muted)] disabled:opacity-100"
              disabled={!pricingOverrideEnabled}
              defaultValue={
                chatRate?.inputPerMillionUsd ??
                pricing.chatInputPerMillionUsd ??
                ""
              }
            />
          </Field>
          <Field label={`${provider.chatModel ?? "Chat"} output / 1M`}>
            <input
              name="chatOutputRate"
              type="number"
              min="0"
              step="0.0001"
              className="input disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[var(--surface-card-muted)] disabled:text-[var(--text-muted)] disabled:opacity-100"
              disabled={!pricingOverrideEnabled}
              defaultValue={
                chatRate?.outputPerMillionUsd ??
                pricing.chatOutputPerMillionUsd ??
                ""
              }
            />
          </Field>
          <button
            disabled={Boolean(pendingAction)}
            className="col-span-2 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] disabled:opacity-60"
          >
            {pendingAction === `cost:${provider.id}` ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : null}
            {pendingAction === `cost:${provider.id}`
              ? "Saving…"
              : pricingOverrideEnabled
                ? "Save custom pricing and budget"
                : "Save budget and use catalog pricing"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateProviderModal({
  onClose,
  onCreate,
  loading,
}: {
  onClose: () => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
}) {
  const [pricingOverrideEnabled, setPricingOverrideEnabled] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold">Add AI provider</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Configure credentials and models. Known OpenAI model prices are
              filled from the catalog and can be overridden here.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close add provider dialog"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-strong)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={onCreate}
          className="max-h-[calc(92vh-84px)] space-y-5 overflow-y-auto px-6 py-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
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
            <div className="md:col-span-2">
              <Field label="Display name">
                <input
                  name="name"
                  className="input"
                  placeholder="Primary OpenAI"
                  required
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Base URL">
                <input
                  name="baseUrl"
                  type="url"
                  className="input"
                  placeholder="https://api.openai.com/v1"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="API key">
                <input
                  name="apiKey"
                  type="password"
                  className="input"
                  autoComplete="new-password"
                />
              </Field>
            </div>
            <Field label="Chat model">
              <input
                name="chatModel"
                className="input"
                defaultValue="gpt-4.1-mini"
              />
            </Field>
            <Field label="Embedding model">
              <input
                name="embeddingModel"
                className="input"
                defaultValue="text-embedding-3-small"
              />
            </Field>
          </div>
          <details className="rounded-lg border border-[var(--border-subtle)] p-4">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4" /> Budget and pricing
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Monthly budget (USD)">
                <input
                  name="monthlyBudgetUsd"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                />
              </Field>
              <Field label="Budget behavior">
                <select name="budgetMode" className="input" defaultValue="tracking">
                  <option value="tracking">Track only</option>
                  <option value="warn">Warn when reached</option>
                  <option value="block">Block new AI calls</option>
                </select>
              </Field>
              <label className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-3">
                <input
                  name="pricingOverrideEnabled"
                  type="checkbox"
                  checked={pricingOverrideEnabled}
                  onChange={(event) =>
                    setPricingOverrideEnabled(event.currentTarget.checked)
                  }
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-medium">
                    Override catalog pricing
                  </span>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Only affects local estimates.
                  </span>
                </span>
              </label>
              {pricingOverrideEnabled ? (
                <>
                  <Field label="Embedding / 1M tokens">
                    <input
                      name="embeddingInputRate"
                      type="number"
                      min="0"
                      step="0.0001"
                      className="input"
                    />
                  </Field>
                  <Field label="Chat input / 1M tokens">
                    <input
                      name="chatInputRate"
                      type="number"
                      min="0"
                      step="0.0001"
                      className="input"
                    />
                  </Field>
                  <Field label="Chat output / 1M tokens">
                    <input
                      name="chatOutputRate"
                      type="number"
                      min="0"
                      step="0.0001"
                      className="input"
                    />
                  </Field>
                </>
              ) : null}
            </div>
          </details>
          <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {loading ? "Saving provider…" : "Save provider"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProviderModal({
  provider,
  loading,
  onClose,
  onUpdate,
}: {
  provider: AIProvider;
  loading: boolean;
  onClose: () => void;
  onUpdate: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const adapter = (provider.settings.adapter as string | undefined) ?? "openai";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold">Edit {provider.name}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Connection and model changes reset API validation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close edit provider dialog"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-strong)] disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={onUpdate}
          className="max-h-[calc(92vh-84px)] space-y-5 overflow-y-auto px-6 py-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Provider">
              <select
                name="provider"
                className="input"
                defaultValue={provider.provider}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="local">Local</option>
                <option value="custom">Custom</option>
              </select>
            </Field>
            <Field label="Adapter">
              <select name="adapter" className="input" defaultValue={adapter}>
                <option value="openai">OpenAI</option>
                <option value="openai_compatible">OpenAI-compatible</option>
                <option value="mistral">Mistral</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama / local</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Display name">
                <input
                  name="name"
                  className="input"
                  defaultValue={provider.name}
                  required
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Base URL">
                <input
                  name="baseUrl"
                  type="url"
                  className="input"
                  defaultValue={provider.baseUrl ?? ""}
                  placeholder="Leave empty for the provider default"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Replace API key">
                <input
                  name="apiKey"
                  type="password"
                  className="input"
                  autoComplete="new-password"
                  placeholder="Leave empty to keep the stored key"
                />
              </Field>
            </div>
            <Field label="Chat model">
              <input
                name="chatModel"
                className="input"
                defaultValue={provider.chatModel ?? ""}
              />
            </Field>
            <Field label="Embedding model">
              <input
                name="embeddingModel"
                className="input"
                defaultValue={provider.embeddingModel ?? ""}
              />
            </Field>
          </div>
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="leading-5">
              Changing the embedding model can change vector dimensions. If this
              provider is active for Knowledge, AgentCore queues re-embedding so
              existing documents remain searchable.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {loading ? "Saving changes…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteProviderDialog({
  provider,
  loading,
  onCancel,
  onConfirm,
}: {
  provider: AIProvider;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-provider-title"
        aria-describedby="delete-provider-description"
        className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
      >
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-700">
          <Trash2 className="h-5 w-5" />
        </div>
        <h2 id="delete-provider-title" className="mt-4 text-lg font-semibold">
          Delete {provider.name}?
        </h2>
        <p
          id="delete-provider-description"
          className="mt-2 text-sm leading-6 text-[var(--text-muted)]"
        >
          This permanently removes its stored credential, validation history,
          and usage records. Deletion is blocked while the provider is selected
          for Knowledge embeddings.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Deleting…" : "Delete provider"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Health({ provider }: { provider: AIProvider }) {
  const failed = provider.validationStatus === "failed";
  const verified = provider.validationStatus === "verified";
  const Icon = failed ? TriangleAlert : verified ? CheckCircle2 : Clock3;
  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${failed ? "text-red-700" : verified ? "text-emerald-700" : "text-amber-700"}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {provider.validationStatus}
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 font-medium text-[var(--text-strong)]">{value}</dd>
    </div>
  );
}
function ActionIcon({
  icon: Icon,
  label,
  onClick,
  danger = false,
  loading = false,
  disabled = false,
}: {
  icon: typeof Bot;
  label: string;
  onClick: () => void;
  danger?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-busy={loading}
      className={`grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--surface-hover)] disabled:cursor-wait disabled:opacity-45 ${danger ? "text-red-700" : "text-[var(--text-muted)]"}`}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
    </button>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <Icon className="h-4 w-4 text-[var(--accent-primary)]" />
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
