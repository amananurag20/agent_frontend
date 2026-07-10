import type { Conversation, ConversationList, FormHandler, Message } from "@/lib/types";
import { Card, EmptyState, StatusPill } from "./ui";

export function InboxView({
  filters,
  setFilters,
  conversations,
  selectedConversation,
  onLoadConversations,
  onSelectConversation,
  onSendReply,
  onUpdateStatus,
}: {
  filters: { status: string; search: string };
  setFilters: (filters: { status: string; search: string }) => void;
  conversations: ConversationList | null;
  selectedConversation: Conversation | null;
  onLoadConversations: () => void;
  onSelectConversation: (id: string) => void;
  onSendReply: FormHandler;
  onUpdateStatus: (status: Conversation["status"]) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <div className="border-b border-[#263449] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Inbox</h2>
            <span className="text-xs text-[#8797b0]">
              {conversations?.total ?? 0} conversations
            </span>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_120px] gap-2">
            <input
              value={filters.search}
              onChange={(event) =>
                setFilters({ ...filters, search: event.target.value })
              }
              placeholder="Search visitor"
              className="input"
            />
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters({ ...filters, status: event.target.value })
              }
              className="input"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="waiting_for_agent">Waiting</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <button
            onClick={onLoadConversations}
            className="mt-3 h-9 w-full rounded-md bg-[#223047] text-sm hover:bg-[#314158]"
          >
            Apply
          </button>
        </div>
        <div className="max-h-[560px] overflow-auto">
          {conversations?.data.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`block w-full border-b border-[#223047] p-4 text-left hover:bg-[#142238] ${
                selectedConversation?.id === conversation.id ? "bg-[#172b47]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {conversation.visitorName ??
                    conversation.visitorEmail ??
                    conversation.visitorId ??
                    "Visitor"}
                </span>
                <StatusPill status={conversation.status} />
              </div>
              <p className="mt-1 truncate text-xs text-[#8797b0]">
                {conversation.messages.at(-1)?.content ?? "No messages yet"}
              </p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        {selectedConversation ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#263449] p-4">
              <div>
                <h2 className="font-semibold">
                  {selectedConversation.visitorName ?? "Visitor conversation"}
                </h2>
                <p className="text-xs text-[#8797b0]">
                  {selectedConversation.visitorEmail ?? selectedConversation.id}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateStatus("open")}
                  className="h-9 rounded-md border border-[#314158] px-3 text-sm hover:bg-[#18263b]"
                >
                  Open
                </button>
                <button
                  onClick={() => onUpdateStatus("closed")}
                  className="h-9 rounded-md bg-[#111c2e] px-3 text-sm text-white hover:bg-[#26344f]"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[520px] space-y-3 overflow-auto bg-[#111c2e] p-4">
              {selectedConversation.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
            <form
              onSubmit={onSendReply}
              className="border-t border-[#263449] p-4"
            >
              <textarea
                name="reply"
                rows={3}
                className="input min-h-24 resize-y"
                placeholder="Write an agent reply"
                required
              />
              <div className="mt-3 flex justify-end">
                <button className="h-10 rounded-md bg-[#19b8c9] px-4 text-sm font-medium text-white hover:bg-[#0f8895]">
                  Send reply
                </button>
              </div>
            </form>
          </>
        ) : (
          <EmptyState>No conversation selected.</EmptyState>
        )}
      </Card>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isVisitor = message.role === "visitor";
  const isAgent = message.role === "agent";

  return (
    <div
      className={`max-w-[80%] rounded-lg border p-3 ${
        isVisitor
          ? "ml-auto border-[#1d3a60] bg-[#172b47]"
          : isAgent
            ? "border-[#1b4338] bg-[#15352f]"
            : "border-[#263449] bg-[#111c2e]"
      }`}
    >
      <div className="mb-1 text-xs font-medium uppercase text-[#8797b0]">
        {message.role}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
      {message.role === "assistant" ? (
        <AiStatus metadata={message.metadata} />
      ) : null}
      {message.citations.length ? (
        <div className="mt-3 border-t border-[#263449] pt-2">
          <p className="text-xs font-medium text-[#a2b1c6]">Citations</p>
          {message.citations.slice(0, 2).map((citation) => (
            <p
              key={citation.chunkId}
              className="mt-1 line-clamp-2 text-xs text-[#8797b0]"
            >
              {citation.content}
            </p>
          ))}
        </div>
      ) : null}
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
