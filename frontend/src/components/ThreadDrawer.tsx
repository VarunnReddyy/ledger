import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  formatDateTime,
  formatDueness,
  initialsFromName,
  roleLabel,
} from "@/lib/formatters";
import { usePostThreadMessage, type RoleScopedParams } from "@/lib/queries";
import type { MessageOut, RequestOut, ThreadOut, Visibility } from "@/lib/types";

interface ThreadDrawerProps {
  open: boolean;
  onClose: () => void;
  threads: ThreadOut[];
  scope: RoleScopedParams | null;
  isFirmSide: boolean;
}

export function ThreadDrawer({
  open,
  onClose,
  threads,
  scope,
  isFirmSide,
}: ThreadDrawerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("internal");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const postMessage = usePostThreadMessage(scope);

  const selected =
    threads.find((thread) => thread.id === selectedId) ?? threads[0] ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedId((current) => {
      if (current && threads.some((thread) => thread.id === current)) {
        return current;
      }
      return threads[0]?.id ?? null;
    });
  }, [open, threads]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setBody("");
    setVisibility(isFirmSide ? "internal" : "client_visible");
    setComposerError(null);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, isFirmSide]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!open) {
    return null;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !scope) {
      return;
    }
    const trimmed = body.trim();
    if (!trimmed) {
      setComposerError("Write a message before sending.");
      return;
    }
    setComposerError(null);
    postMessage.mutate(
      {
        threadId: selected.id,
        body: {
          body: trimmed,
          visibility: isFirmSide ? visibility : "client_visible",
        },
      },
      {
        onSuccess: () => {
          setBody("");
          setToast("Message sent");
        },
        onError: (error) => {
          setComposerError(
            error instanceof ApiError
              ? error.message
              : "Message could not be sent. Try again.",
          );
        },
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30"
        aria-label="Close discussion"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full max-w-md flex-col border-l border-rule bg-paper shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-rule px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              Discussion
            </h2>
            <p className="mt-0.5 text-xs text-ink/60">
              {threads.length === 0
                ? "No threads on this object yet"
                : `${threads.length} thread${threads.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-sm border border-rule p-1.5 text-ink/70 hover:bg-ledger/50 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {threads.length > 1 ? (
          <div className="flex gap-1 overflow-x-auto border-b border-rule px-3 py-2">
            {threads.map((thread) => {
              const active = selected?.id === thread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedId(thread.id)}
                  className={`shrink-0 rounded-sm px-2.5 py-1.5 text-xs ${
                    active
                      ? "bg-ledger text-ink"
                      : "text-ink/60 hover:bg-ledger/50 hover:text-ink"
                  }`}
                >
                  {thread.subject}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {selected ? (
            <ThreadBody thread={selected} />
          ) : (
            <div className="px-4 py-8 text-sm text-ink/60">
              <p className="font-medium text-ink">No discussion yet</p>
              <p className="mt-1">
                When someone opens a thread on this object, it will show up here.
              </p>
            </div>
          )}
        </div>

        {selected && scope ? (
          <form onSubmit={onSubmit} className="border-t border-rule px-4 py-3">
            {isFirmSide ? (
              <div
                className="mb-2 flex gap-1"
                role="group"
                aria-label="Message visibility"
              >
                <VisibilityToggle
                  value="internal"
                  selected={visibility}
                  onSelect={setVisibility}
                  label="Internal"
                />
                <VisibilityToggle
                  value="client_visible"
                  selected={visibility}
                  onSelect={setVisibility}
                  label="Client"
                />
              </div>
            ) : null}
            <label htmlFor="thread-composer" className="sr-only">
              Message
            </label>
            <textarea
              id="thread-composer"
              rows={3}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write a message…"
              className="w-full resize-none rounded-sm border border-rule bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
            />
            {composerError ? (
              <p className="mt-2 text-sm text-flag" role="alert">
                {composerError}
              </p>
            ) : null}
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={postMessage.isPending}
                className="rounded-sm bg-seal px-3 py-2 text-sm text-paper hover:bg-seal/90 disabled:opacity-60"
              >
                {postMessage.isPending ? "Sending…" : "Send message"}
              </button>
            </div>
          </form>
        ) : null}

        {toast ? (
          <div
            role="status"
            className="absolute bottom-24 left-4 right-4 rounded-sm border border-seal/30 bg-paper px-3 py-2 text-sm text-seal shadow-sm"
          >
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ThreadBodyProps {
  thread: ThreadOut;
}

function ThreadBody({ thread }: ThreadBodyProps) {
  const requests = thread.requests;

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <h3 className="text-sm font-medium text-ink">{thread.subject}</h3>
        {thread.awaiting_role ? (
          <span className="mt-2 inline-flex items-center rounded-sm bg-pending/15 px-2 py-0.5 text-xs font-medium text-pending">
            Waiting on {roleLabel(thread.awaiting_role)}
          </span>
        ) : null}
      </div>

      {requests.length > 0 ? (
        <section aria-label="Request checklist" className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-ink/50">
            Requests
          </h4>
          <ul className="space-y-2">
            {requests.map((req) => (
              <RequestRow key={req.id} request={req} />
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="Messages" className="space-y-3">
        {thread.messages.length === 0 ? (
          <p className="text-sm text-ink/60">No messages yet. Start the conversation below.</p>
        ) : (
          thread.messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))
        )}
      </section>
    </div>
  );
}

interface RequestRowProps {
  request: RequestOut;
}

function RequestRow({ request }: RequestRowProps) {
  const dueness = formatDueness(request.due_date);
  const fulfilled = request.status === "fulfilled";
  const waived = request.status === "waived";
  const checked = fulfilled || waived;

  return (
    <li className="flex items-start gap-2 rounded-sm border border-rule bg-ledger/30 px-3 py-2 text-sm">
      <span
        className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${
          checked
            ? "border-seal bg-seal text-paper"
            : "border-rule bg-paper"
        }`}
        aria-hidden
      >
        {checked ? (
          <span className="text-[0.55rem] font-bold leading-none">✓</span>
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className={checked ? "text-ink/60 line-through" : "text-ink"}>
          {request.label}
        </p>
        {fulfilled ? (
          <p className="mt-0.5 text-xs text-seal">Received</p>
        ) : waived ? (
          <p className="mt-0.5 text-xs text-ink/50">Waived</p>
        ) : request.due_date ? (
          <p className={`mt-0.5 font-tabular text-xs ${dueness.className}`}>
            {dueness.label}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-ink/50">No due date</p>
        )}
      </div>
    </li>
  );
}

interface MessageRowProps {
  message: MessageOut;
}

function MessageRow({ message }: MessageRowProps) {
  const initials = initialsFromName(message.author_name);
  return (
    <article className="flex gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-ledger font-tabular text-xs font-medium text-ink"
        aria-hidden
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{message.author_name}</span>
          <time
            dateTime={message.created_at}
            className="font-tabular text-xs text-ink/50"
          >
            {formatDateTime(message.created_at)}
          </time>
          {message.visibility === "internal" ? (
            <span className="inline-flex items-center rounded-sm bg-ink/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink/70">
              Internal
            </span>
          ) : null}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">{message.body}</p>
      </div>
    </article>
  );
}

interface VisibilityToggleProps {
  value: Visibility;
  selected: Visibility;
  onSelect: (value: Visibility) => void;
  label: string;
}

function VisibilityToggle({ value, selected, onSelect, label }: VisibilityToggleProps) {
  const active = selected === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={`rounded-sm px-2.5 py-1 text-xs ${
        active
          ? "bg-ledger text-ink"
          : "border border-rule text-ink/60 hover:bg-ledger/40 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
