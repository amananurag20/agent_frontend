"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, MessageSquareText, Volume2, VolumeX } from "lucide-react";
import type { Conversation } from "@/lib/types";

export function HandoffNotifications({
  notifications,
  total,
  storageKey,
  soundEnabled,
  onToggleSound,
  onSelect,
}: {
  notifications: Conversation[];
  total: number;
  storageKey: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSelect: (conversation: Conversation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [seenVersions, setSeenVersions] = useState<Record<string, string>>({});
  const [restoredStorageKey, setRestoredStorageKey] = useState<string | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadCount = useMemo(
    () =>
      restoredStorageKey === storageKey
        ? notifications.filter(
            (notification) =>
              !seenVersions[notification.id] ||
              seenVersions[notification.id] < notification.updatedAt,
          ).length
        : 0,
    [notifications, restoredStorageKey, seenVersions, storageKey],
  );

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const storedVersions = JSON.parse(
          window.localStorage.getItem(storageKey) ?? "[]",
        ) as unknown;
        if (Array.isArray(storedVersions)) {
          const migratedAt = new Date().toISOString();
          setSeenVersions(
            Object.fromEntries(
              storedVersions
                .filter((id): id is string => typeof id === "string")
                .map((id) => [id, migratedAt]),
            ),
          );
        } else if (storedVersions && typeof storedVersions === "object") {
          setSeenVersions(
            Object.fromEntries(
              Object.entries(storedVersions).filter(
                (entry): entry is [string, string] =>
                  typeof entry[1] === "string",
              ),
            ),
          );
        } else {
          setSeenVersions({});
        }
      } catch {
        setSeenVersions({});
      } finally {
        setRestoredStorageKey(storageKey);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [storageKey]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function togglePanel() {
    setOpen((current) => {
      const nextOpen = !current;
      if (nextOpen && notifications.length) {
        setSeenVersions((currentSeenVersions) => {
          const nextSeenVersions = { ...currentSeenVersions };
          notifications.forEach((notification) => {
            nextSeenVersions[notification.id] = notification.updatedAt;
          });
          const recentEntries = Object.entries(nextSeenVersions)
            .sort((left, right) => left[1].localeCompare(right[1]))
            .slice(-500);
          const persistedVersions = Object.fromEntries(recentEntries);
          window.localStorage.setItem(
            storageKey,
            JSON.stringify(persistedVersions),
          );
          return persistedVersions;
        });
      }
      return nextOpen;
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={togglePanel}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
        aria-label={`${unreadCount} unread agent handoff notification${unreadCount === 1 ? "" : "s"}`}
        aria-expanded={open}
        title="Agent handoffs"
      >
        <Bell className="h-4 w-4" />
        {unreadCount ? (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[var(--surface-header)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section className="fixed right-4 top-16 z-50 w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)] sm:absolute sm:right-0 sm:top-11">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-strong)]">
                Agent handoffs
              </h2>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {total
                  ? `${total} waiting for a response`
                  : "No customers waiting"}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleSound}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
              aria-label={soundEnabled ? "Mute handoff sounds" : "Enable handoff sounds"}
              title={soundEnabled ? "Mute notification sound" : "Enable notification sound"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length ? (
              notifications.map((conversation) => {
                const latestMessage = conversation.messages.at(-1);
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onSelect(conversation);
                    }}
                    className="flex w-full gap-3 border-b border-[var(--border-subtle)] px-4 py-3 text-left last:border-b-0 hover:bg-[var(--surface-hover)]"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/35 dark:text-red-300">
                      <MessageSquareText size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-[var(--text-strong)]">
                          {conversation.visitorName ??
                            conversation.visitorEmail ??
                            conversation.visitorId ??
                            "Website visitor"}
                        </span>
                        <span className="shrink-0 text-[10px] text-[var(--text-soft)]">
                          {relativeTime(conversation.updatedAt)}
                        </span>
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
                        {latestMessage?.content ?? "Requested help from an agent"}
                      </span>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                        Waiting for agent
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-tint)] text-[var(--accent-primary)]">
                  <Bell size={18} />
                </div>
                <p className="mt-3 text-sm font-medium text-[var(--text-strong)]">
                  You are all caught up
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  New customer handoffs will appear here in real time.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
