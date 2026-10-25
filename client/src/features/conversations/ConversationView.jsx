
import { useCallback, useEffect, useRef, useState } from "react";
import {
    getConversationMessages,
    sendConversationMessage,
} from "./message.service.js";
import { connectSocket } from "../../lib/socket.js";

export default function ConversationView({
    conversation,
    currentUserId,
    onBack,
}) {
    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const bottomRef = useRef(null);
    const conversationId = conversation?.id;

    const otherMember = conversation?.members?.find(
        (member) => member.userId !== currentUserId
    );

    const profile = otherMember?.user?.profile;
    const displayName =
        profile?.displayName || profile?.username || "Conversation";

    const loadMessages = useCallback(async () => {
        if (!conversationId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await getConversationMessages(conversationId);
            setMessages(result.messages ?? []);
        } catch (err) {
            setError(err.message || "Unable to load messages.");
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!conversationId) return;

        let cancelled = false;
        let activeSocket;
        let handleNewMessage;

        async function subscribe() {
            try {
                const socket = await connectSocket();

                if (cancelled) return;

                activeSocket = socket;

                handleNewMessage = (message) => {
                    if (message.conversationId !== conversationId) return;

                    setMessages((previous) => {
                        if (previous.some((item) => item.id === message.id)) {
                            return previous;
                        }

                        return [...previous, message];
                    });
                };

                socket.on("message:new", handleNewMessage);

                socket.emit(
                    "conversation:join",
                    { conversationId },
                    (result) => {
                        if (!cancelled && !result?.success) {
                            console.error(
                                "Unable to join conversation:",
                                result?.message
                            );
                        }
                    }
                );
            } catch (err) {
                if (!cancelled) {
                    console.error("Unable to subscribe to messages:", err);
                }
            }
        }

        subscribe();

        return () => {
            cancelled = true;

            if (activeSocket) {
                if (handleNewMessage) {
                    activeSocket.off("message:new", handleNewMessage);
                }

                if (activeSocket.connected) {
                    activeSocket.emit("conversation:leave", {
                        conversationId,
                    });
                }
            }
        };
    }, [conversationId]);

    async function handleSubmit(event) {
        event.preventDefault();

        const text = content.trim();

        if (!text || sending || !conversationId) return;

        if (text.length > 4000) {
            setError("Messages cannot exceed 4000 characters.");
            return;
        }

        setSending(true);
        setError("");

        try {
            const result = await sendConversationMessage(
                conversationId,
                text,
                crypto.randomUUID()
            );

            setMessages((previous) => {
                if (previous.some((item) => item.id === result.message.id)) {
                    return previous;
                }

                return [...previous, result.message];
            });

            setContent("");
        } catch (err) {
            setError(err.message || "Unable to send message.");
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
            <header className="flex h-[66px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back to conversations"
                    className="rounded-full p-2 text-slate-600 transition hover:bg-brand-soft hover:text-brand md:hidden"
                >
                    <span aria-hidden="true">←</span>
                </button>

                {profile?.avatarUrl ? (
                    <img
                        src={profile.avatarUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-hover">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-text-primary">
                        {displayName}
                    </h2>
                    <p className="truncate text-xs text-text-secondary">
                        {profile?.username ? `@${profile.username}` : "JaisChat"}
                    </p>
                </div>
            </header>

            <div
                className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#efeae2] p-3 sm:p-5"
                aria-live="polite"
                aria-label="Conversation messages"
            >
                {loading ? (
                    <p className="text-center text-sm text-gray-500">
                        Loading messages...
                    </p>
                ) : messages.length === 0 ? (
                    <p className="pt-8 text-center text-sm text-gray-500">
                        No messages yet. Say hello!
                    </p>
                ) : (
                    messages.map((message) => {
                        const isMine = message.senderId === currentUserId;

                        return (
                            <div
                                key={message.id}
                                className={`flex ${
                                    isMine ? "justify-end" : "justify-start"
                                }`}
                            >
                                <article
                                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 shadow-sm sm:max-w-[75%] ${
                                        isMine
                                            ? "rounded-br-md bg-brand-soft text-slate-900"
                                            : "rounded-bl-md bg-white text-slate-900"
                                    }`}
                                >
                                    <p>{message.content}</p>
                                    <time
                                        className="mt-1 block text-right text-[11px] text-slate-500"
                                        dateTime={message.createdAt}
                                    >
                                        {new Date(
                                            message.createdAt
                                        ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </time>
                                </article>
                            </div>
                        );
                    })
                )}

                <div ref={bottomRef} />
            </div>

            {error && (
                <p role="alert" className="border-t px-4 py-2 text-sm text-red-600">
                    {error}
                </p>
            )}

            <form
                onSubmit={handleSubmit}
                className="flex shrink-0 items-end gap-2 border-t border-slate-200 bg-slate-50 p-3 sm:px-5"
            >
                <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={(event) => {
                        if (
                            event.key === "Enter" &&
                            !event.shiftKey &&
                            !event.nativeEvent.isComposing
                        ) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                        }
                    }}
                    placeholder="Type a message..."
                    aria-label="Message"
                    maxLength={4000}
                    rows={2}
                    className="max-h-32 min-w-0 flex-1 resize-none rounded-2xl border border-brand bg-white px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-brand-soft"
                />

                <button
                    type="submit"
                    disabled={sending || !content.trim()}
                    className="shrink-0 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {sending ? "Sending..." : "Send"}
                </button>
            </form>
        </section>
    );
}
