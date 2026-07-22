"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Inbox,
  RotateCcw,
  Search,
  Send,
  UserCheck,
  Users,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import type { Conversation, ConversationList, Message, User } from "@/lib/types";
import { EmptyState, StatusPill } from "./ui";

export type InboxFilters = {
  status: string;
  search: string;
  assignedAgentId: string;
  assignment: string;
  page: number;
  limit: number;
};

type QueueKey = "waiting" | "mine" | "unassigned" | "all";

export function InboxView({
  filters,
  conversations,
  selectedConversation,
  currentUser,
  users,
  canManageAgents,
  onLoadConversations,
  onSelectConversation,
  onSendReply,
  onAssign,
  onUpdateStatus,
}: {
  filters: InboxFilters;
  conversations: ConversationList | null;
  selectedConversation: Conversation | null;
  currentUser: User;
  users: User[];
  canManageAgents: boolean;
  onLoadConversations: (filters: InboxFilters) => Promise<void>;
  onSelectConversation: (id: string) => Promise<void>;
  onSendReply: (content: string) => Promise<boolean>;
  onAssign: (assignedAgentId: string | null) => Promise<boolean>;
  onUpdateStatus: (status: Conversation["status"]) => Promise<boolean>;
}) {
  const [searchDraft, setSearchDraft] = useState({
    source: filters.search,
    value: filters.search,
  });
  const [replyDraft, setReplyDraft] = useState<{
    conversationId: string | null;
    value: string;
  }>({ conversationId: selectedConversation?.id ?? null, value: "" });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showConversationMobile, setShowConversationMobile] = useState(() =>
    typeof window === "undefined"
      ? false
      : new URLSearchParams(window.location.search).has("conversation"),
  );

  const search =
    searchDraft.source === filters.search ? searchDraft.value : filters.search;
  const reply =
    replyDraft.conversationId === (selectedConversation?.id ?? null)
      ? replyDraft.value
      : "";

  const activeQueue = getActiveQueue(filters, currentUser.id);
  const totalPages = conversations
    ? Math.max(1, Math.ceil(conversations.total / conversations.limit))
    : 1;
  const availableAgents = useMemo(() => {
    const eligible = users.filter(
      (candidate) =>
        candidate.isActive !== false &&
        candidate.roles.some((role) => role === "agent" || role === "org_admin"),
    );
    if (!eligible.some((candidate) => candidate.id === currentUser.id)) {
      eligible.unshift(currentUser);
    }
    return eligible;
  }, [currentUser, users]);

  const selectedAssignee = selectedConversation?.assignedAgentId
    ? availableAgents.find(
        (candidate) => candidate.id === selectedConversation.assignedAgentId,
      )
    : null;
  const isMine = selectedConversation?.assignedAgentId === currentUser.id;
  const isClosed = selectedConversation?.status === "closed";
  const canReply = Boolean(selectedConversation && !isClosed && isMine);

  async function changeQueue(queue: QueueKey) {
    await onLoadConversations(filtersForQueue(filters, queue, currentUser.id));
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLoadConversations({ ...filters, search: search.trim(), page: 1 });
  }

  async function selectConversation(id: string) {
    setShowConversationMobile(true);
    await onSelectConversation(id);
  }

  async function runAction(label: string, action: () => Promise<boolean>) {
    if (busyAction) return;
    setBusyAction(label);
    try {
      await action();
    } finally {
      setBusyAction(null);
    }
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = reply.trim();
    if (!content || !canReply || busyAction) return;
    setBusyAction("reply");
    try {
      if (await onSendReply(content)) {
        setReplyDraft({
          conversationId: selectedConversation?.id ?? null,
          value: "",
        });
      }
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="grid min-h-0 grid-cols-1 gap-4 xl:h-[calc(100vh-190px)] xl:min-h-[620px] xl:grid-cols-[400px_minmax(0,1fr)]">
      <section
        className={`${showConversationMobile ? "hidden xl:flex" : "flex"} min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]`}
        aria-label="Conversation queue"
      >
        <div className="border-b border-[var(--border-subtle)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[var(--text-strong)]">Inbox</h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {conversations?.total ?? 0} matching conversations
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-tint)] text-[var(--accent-primary)]">
              <Inbox size={17} />
            </span>
          </div>

          <form onSubmit={submitSearch} className="relative mt-3">
            <label htmlFor="inbox-search" className="sr-only">
              Search conversations
            </label>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--text-soft)]" />
            <input
              id="inbox-search"
              value={search}
              onChange={(event) =>
                setSearchDraft({ source: filters.search, value: event.target.value })
              }
              placeholder="Search name, email, or visitor ID"
              className="input h-10 pl-9 pr-20"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 h-7 rounded-md px-2.5 text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--surface-hover)]"
            >
              Search
            </button>
          </form>

          <div className="mt-3 grid grid-cols-4 rounded-lg bg-[var(--surface-tint)] p-1" role="tablist" aria-label="Inbox queues">
            {(["waiting", "mine", "unassigned", "all"] as QueueKey[]).map(
              (queue) => (
                <button
                  key={queue}
                  type="button"
                  role="tab"
                  aria-selected={activeQueue === queue}
                  onClick={() => void changeQueue(queue)}
                  className={`rounded-md px-2 py-2 text-xs font-medium capitalize transition-colors ${
                    activeQueue === queue
                      ? "bg-[var(--surface-card)] text-[var(--text-strong)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                  }`}
                >
                  {queue}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations?.data.length ? (
            conversations.data.map((conversation) => {
              const latestMessage = conversation.messages.at(-1);
              const waitingSince =
                conversation.handoffRequestedAt ?? conversation.updatedAt;
              const waitingMinutes = minutesSince(waitingSince);
              const urgent =
                conversation.status === "waiting_for_agent" && waitingMinutes >= 15;
              const displayName = conversationName(conversation);
              const assignee = conversation.assignedAgentId
                ? availableAgents.find(
                    (candidate) => candidate.id === conversation.assignedAgentId,
                  )
                : null;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => void selectConversation(conversation.id)}
                  aria-current={selectedConversation?.id === conversation.id}
                  className={`group block w-full border-b border-[var(--border-subtle)] px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface-hover)] ${
                    selectedConversation?.id === conversation.id
                      ? "bg-[var(--surface-accent)]"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-tint)] text-xs font-semibold text-[var(--accent-primary)]">
                      {initials(displayName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--text-strong)]">
                          {displayName}
                        </span>
                        <span
                          className={`shrink-0 text-[10px] ${urgent ? "font-semibold text-[var(--danger-text)]" : "text-[var(--text-soft)]"}`}
                          title={formatDateTime(conversation.lastMessageAt ?? conversation.updatedAt)}
                        >
                          {conversation.status === "waiting_for_agent"
                            ? `waiting ${relativeTime(waitingSince)}`
                            : relativeTime(
                                conversation.lastMessageAt ?? conversation.updatedAt,
                              )}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                        {latestMessage?.content ?? "No messages yet"}
                      </span>
                      <span className="mt-2 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-[var(--text-soft)]">
                          {conversation.assignedAgentId ? (
                            <UserCheck size={12} />
                          ) : (
                            <Users size={12} />
                          )}
                          <span className="truncate">
                            {conversation.assignedAgentId
                              ? userLabel(assignee) || "Assigned agent"
                              : "Unassigned"}
                            {conversation.widgetName
                              ? ` · ${conversation.widgetName}`
                              : " · Web chat"}
                          </span>
                        </span>
                        <StatusPill status={conversation.status} />
                      </span>
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <EmptyState>
              <div className="py-8 text-center">
                <p className="font-medium text-[var(--text-strong)]">No conversations found</p>
                <p className="mt-1">Try another queue or search term.</p>
              </div>
            </EmptyState>
          )}
        </div>

        {conversations && conversations.total > conversations.limit ? (
          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-3">
            <span className="text-xs text-[var(--text-muted)]">
              Page {conversations.page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={conversations.page <= 1}
                onClick={() =>
                  void onLoadConversations({
                    ...filters,
                    page: Math.max(1, conversations.page - 1),
                  })
                }
                className="h-8 rounded-md border border-[var(--border-strong)] px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={conversations.page >= totalPages}
                onClick={() =>
                  void onLoadConversations({
                    ...filters,
                    page: Math.min(totalPages, conversations.page + 1),
                  })
                }
                className="h-8 rounded-md border border-[var(--border-strong)] px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section
        className={`${showConversationMobile ? "flex" : "hidden xl:flex"} min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]`}
        aria-label="Selected conversation"
      >
        {selectedConversation ? (
          <>
            <header className="border-b border-[var(--border-subtle)] px-4 py-3.5 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConversationMobile(false)}
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-hover)] xl:hidden"
                    aria-label="Back to conversation queue"
                  >
                    <ArrowLeft size={17} />
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold text-[var(--text-strong)]">
                        {conversationName(selectedConversation)}
                      </h2>
                      <StatusPill status={selectedConversation.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                      {selectedConversation.visitorEmail ??
                        `Visitor ID: ${selectedConversation.visitorId ?? selectedConversation.id}`}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-soft)]">
                      <span className="inline-flex items-center gap-1">
                        <UserCheck size={12} />
                        {selectedConversation.assignedAgentId
                          ? isMine
                            ? "Assigned to you"
                            : `Assigned to ${userLabel(selectedAssignee) || "another agent"}`
                          : "Unassigned"}
                      </span>
                      {selectedConversation.status === "waiting_for_agent" ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          Waiting {relativeTime(selectedConversation.handoffRequestedAt ?? selectedConversation.updatedAt)}
                        </span>
                      ) : null}
                      <span>{selectedConversation.widgetName ?? "Web chat"}</span>
                    </p>
                    {selectedConversation.status === "waiting_for_agent" ? (
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        Handoff: {handoffReason(selectedConversation)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {!isClosed && !selectedConversation.assignedAgentId ? (
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        void runAction("claim", () => onAssign(currentUser.id))
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent-primary)] px-3 text-sm font-medium text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50"
                    >
                      <UserCheck size={15} />
                      {busyAction === "claim" ? "Taking…" : "Take conversation"}
                    </button>
                  ) : null}

                  {canManageAgents && !isClosed ? (
                    <label className="sr-only" htmlFor="conversation-assignee">
                      Reassign conversation
                    </label>
                  ) : null}
                  {canManageAgents && !isClosed ? (
                    <select
                      id="conversation-assignee"
                      value={selectedConversation.assignedAgentId ?? ""}
                      disabled={Boolean(busyAction)}
                      onChange={(event) => {
                        const next = event.target.value || null;
                        void runAction("assign", () => onAssign(next));
                      }}
                      className="input h-9 w-auto max-w-44 py-0 text-xs"
                      aria-label="Reassign conversation"
                    >
                      <option value="">Unassigned</option>
                      {availableAgents.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.id === currentUser.id
                            ? "Assign to me"
                            : userLabel(candidate)}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {isClosed ? (
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        void runAction("reopen", () => onUpdateStatus("open"))
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border-strong)] px-3 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      {busyAction === "reopen" ? "Reopening…" : "Reopen"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        void runAction("resolve", () => onUpdateStatus("closed"))
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border-strong)] px-3 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      {busyAction === "resolve" ? "Resolving…" : "Resolve"}
                    </button>
                  )}
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--surface-card-muted)] px-4 py-5 sm:px-6">
              {selectedConversation.messages.map((message, index) => {
                const previous = selectedConversation.messages[index - 1];
                const showDate =
                  !previous || !isSameDay(previous.createdAt, message.createdAt);
                return (
                  <div key={message.id}>
                    {showDate ? <DateSeparator value={message.createdAt} /> : null}
                    <MessageBubble message={message} />
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
              {isClosed ? (
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-tint)] px-4 py-3 text-center">
                  <p className="text-sm font-medium text-[var(--text-strong)]">
                    This conversation is resolved
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Reopen it before sending another reply.
                  </p>
                </div>
              ) : !selectedConversation.assignedAgentId ? (
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-tint)] px-4 py-3 text-center">
                  <p className="text-sm font-medium text-[var(--text-strong)]">
                    Take this conversation to reply
                  </p>
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() =>
                      void runAction("claim", () => onAssign(currentUser.id))
                    }
                    className="mt-2 text-xs font-semibold text-[var(--accent-primary)] hover:underline disabled:opacity-50"
                  >
                    Assign it to me
                  </button>
                </div>
              ) : !isMine ? (
                <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--warning-bg)] px-4 py-3 text-center text-sm text-[var(--warning-text)]">
                  This conversation is owned by {userLabel(selectedAssignee) || "another agent"}.
                  {canManageAgents ? " Reassign it to yourself to reply." : ""}
                </div>
              ) : (
                <form onSubmit={submitReply}>
                  <label htmlFor="agent-reply" className="sr-only">
                    Agent reply
                  </label>
                  <textarea
                    id="agent-reply"
                    value={reply}
                    onChange={(event) =>
                      setReplyDraft({
                        conversationId: selectedConversation.id,
                        value: event.target.value,
                      })
                    }
                    onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    rows={3}
                    maxLength={2000}
                    className="input min-h-24 resize-y"
                    placeholder="Write a reply…"
                    required
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-[var(--text-soft)]">
                      {reply.length}/2000 · ⌘/Ctrl + Enter to send
                    </span>
                    <button
                      type="submit"
                      disabled={!reply.trim() || Boolean(busyAction)}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent-secondary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-secondary-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={15} />
                      {busyAction === "reply" ? "Sending…" : "Send reply"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        ) : (
          <EmptyState>
            <div className="py-20 text-center">
              <Inbox className="mx-auto h-8 w-8 text-[var(--text-soft)]" />
              <p className="mt-3 font-medium text-[var(--text-strong)]">
                Select a conversation
              </p>
              <p className="mt-1">Choose an item from the queue to see its history.</p>
            </div>
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "system") {
    return (
      <div className="my-4 flex justify-center">
        <div className="max-w-[90%] rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 text-center text-xs text-[var(--text-muted)]">
          {message.content} · {formatTime(message.createdAt)}
        </div>
      </div>
    );
  }

  const isAgent = message.role === "agent";
  const label =
    message.role === "visitor"
      ? "Visitor"
      : message.role === "assistant"
        ? "AI assistant"
        : typeof message.metadata.agentEmail === "string"
          ? message.metadata.agentEmail
          : "Agent";

  return (
    <div className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl border px-3.5 py-2.5 sm:max-w-[72%] ${
          isAgent
            ? "rounded-br-md border-[var(--accent-secondary)] bg-[var(--success-bg)]"
            : message.role === "visitor"
              ? "rounded-bl-md border-[var(--border-subtle)] bg-[var(--surface-card)]"
              : "rounded-bl-md border-[var(--accent-primary)] bg-[var(--surface-accent)]"
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-4 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">
          <span>{label}</span>
          <time dateTime={message.createdAt} title={formatDateTime(message.createdAt)}>
            {formatTime(message.createdAt)}
          </time>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-strong)]">
          {message.content}
        </p>
        {message.role === "assistant" ? <AiStatus metadata={message.metadata} /> : null}
        {message.citations.length ? (
          <details className="mt-3 border-t border-[var(--border-subtle)] pt-2">
            <summary className="cursor-pointer text-xs font-medium text-[var(--text-base)]">
              {message.citations.length} source{message.citations.length === 1 ? "" : "s"}
            </summary>
            {message.citations.slice(0, 3).map((citation) => (
              <p
                key={citation.chunkId}
                className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]"
              >
                {citation.content}
              </p>
            ))}
          </details>
        ) : null}
      </div>
    </div>
  );
}

function AiStatus({ metadata }: { metadata: Record<string, unknown> }) {
  const usedFallback = metadata.usedFallback === true;
  const provider = typeof metadata.provider === "string" ? metadata.provider : "local";
  return (
    <span
      className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${
        usedFallback
          ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
          : "bg-[var(--success-bg)] text-[var(--success-text)]"
      }`}
    >
      {usedFallback ? "AI fallback" : `AI · ${provider}`}
    </span>
  );
}

function DateSeparator({ value }: { value: string }) {
  return (
    <div className="my-4 flex items-center gap-3" aria-label={formatDate(value)}>
      <span className="h-px flex-1 bg-[var(--border-subtle)]" />
      <time className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-soft)]">
        {formatDate(value)}
      </time>
      <span className="h-px flex-1 bg-[var(--border-subtle)]" />
    </div>
  );
}

function getActiveQueue(filters: InboxFilters, currentUserId: string): QueueKey {
  if (filters.assignedAgentId === currentUserId) return "mine";
  if (filters.assignment === "unassigned") return "unassigned";
  if (filters.status === "waiting_for_agent") return "waiting";
  return "all";
}

function filtersForQueue(
  current: InboxFilters,
  queue: QueueKey,
  currentUserId: string,
): InboxFilters {
  const base = {
    ...current,
    page: 1,
    status: "",
    assignedAgentId: "",
    assignment: "",
  };
  if (queue === "waiting") return { ...base, status: "waiting_for_agent" };
  if (queue === "mine") return { ...base, assignedAgentId: currentUserId };
  if (queue === "unassigned") {
    return { ...base, status: "waiting_for_agent", assignment: "unassigned" };
  }
  return base;
}

function conversationName(conversation: Conversation) {
  if (conversation.visitorName) return conversation.visitorName;
  if (conversation.visitorEmail) return conversation.visitorEmail;
  const identifier = conversation.visitorId ?? conversation.id;
  return `Visitor …${identifier.slice(-8)}`;
}

function userLabel(user?: User | null) {
  return user?.name?.trim() || user?.email || "";
}

function handoffReason(conversation: Conversation) {
  const explicitReason =
    conversation.metadata.handoffReason ?? conversation.metadata.reason;
  if (typeof explicitReason === "string" && explicitReason.trim()) {
    return explicitReason.trim().replaceAll("_", " ");
  }
  const handoffMessage = [...conversation.messages]
    .reverse()
    .find(
      (message) =>
        message.metadata.handoffRequested === true ||
        typeof message.metadata.failureCode === "string",
    );
  if (handoffMessage?.metadata.failureCode === "automatic_reply_failed") {
    return "The automatic reply could not be completed";
  }
  if (handoffMessage?.metadata.handoffRequested === true) {
    return "The AI assistant requested human help";
  }
  return "The visitor needs a human response";
}

function initials(value: string) {
  const parts = value.replace("…", " ").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "V";
}

function minutesSince(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp)
    ? Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
    : 0;
}

function relativeTime(value: string) {
  const minutes = minutesSince(value);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (isSameDay(value, today.toISOString())) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(value, yesterday.toISOString())) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

function isSameDay(first: string, second: string) {
  const left = new Date(first);
  const right = new Date(second);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
