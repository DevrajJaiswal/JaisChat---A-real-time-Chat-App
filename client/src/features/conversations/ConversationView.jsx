
import { useCallback, useEffect, useRef, useState } from "react";
import {
    getConversationMessages,
    sendConversationMessage,
} from "./message.service.js";
import { connectSocket } from "../../lib/socket.js";

function mergeMessages(existingMessages, incomingMessages) {
    const messagesById = new Map();

    for (const message of existingMessages) {
        messagesById.set(message.id, message);
    }

    for (const message of incomingMessages) {
        messagesById.set(message.id, message);
    }

    return [...messagesById.values()].sort((a, b) => {
        const timeDifference =
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime();

        if (timeDifference !== 0) {
            return timeDifference;
        }

        return String(a.id).localeCompare(String(b.id));
    });
}

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
    const lastSyncedSocketIdRef = useRef(null);

    const conversationId = conversation?.id;

    const otherMember = conversation?.members?.find(
        (member) => member.userId !== currentUserId
    );

    const profile = otherMember?.user?.profile;

    const displayName =
        profile?.displayName ||
        profile?.username ||
        "Conversation";

    const loadMessages = useCallback(async () => {
        if (!conversationId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        try {
            setError("");

            const result =
                await getConversationMessages(conversationId);

            const fetchedMessages = result.messages ?? [];

            setMessages((previousMessages) =>
                mergeMessages(previousMessages, fetchedMessages)
            );
        } catch (err) {
            console.error("Unable to load messages:", err);

            setError(
                err.message || "Unable to load messages."
            );
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    // Load message history whenever the selected conversation changes.
    useEffect(() => {
        let cancelled = false;

        setMessages([]);
        setLoading(true);
        setError("");
        lastSyncedSocketIdRef.current = null;

        async function fetchMessages() {
            if (!conversationId) {
                setLoading(false);
                return;
            }

            try {
                const result =
                    await getConversationMessages(conversationId);

                if (!cancelled) {
                    setMessages(result.messages ?? []);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error(
                        "Unable to load conversation history:",
                        err
                    );

                    setError(
                        err.message ||
                        "Unable to load messages."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchMessages();

        return () => {
            cancelled = true;
        };
    }, [conversationId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    }, [messages]);

    // Subscribe to real-time messages and recover after reconnection.
    useEffect(() => {
        if (!conversationId) return;

        let cancelled = false;
        let activeSocket = null;
        let handleNewMessage = null;
        let handleConnect = null;

        async function subscribe() {
            try {
                const socket = await connectSocket();

                if (cancelled) return;

                activeSocket = socket;

                handleNewMessage = (message) => {
                    if (
                        message.conversationId !== conversationId
                    ) {
                        return;
                    }

                    console.log(
                        "Received message:new:",
                        message.id
                    );

                    setMessages((previousMessages) =>
                        mergeMessages(previousMessages, [message])
                    );
                };

                handleConnect = () => {
                    synchronizeConnection();
                };

                async function synchronizeConnection() {
                    if (cancelled || !socket.connected) {
                        return;
                    }

                    if (
                        lastSyncedSocketIdRef.current === socket.id
                    ) {
                        return;
                    }

                    lastSyncedSocketIdRef.current = socket.id;

                    console.log(
                        "Synchronizing conversation after connection:",
                        conversationId,
                        "Socket:",
                        socket.id
                    );

                    socket.emit(
                        "conversation:join",
                        { conversationId },
                        async (result) => {
                            if (cancelled) return;

                            if (!result?.success) {
                                console.error(
                                    "Unable to join conversation:",
                                    result?.message ||
                                    "No successful acknowledgement received."
                                );

                                // Permit another attempt on a future connect.
                                lastSyncedSocketIdRef.current = null;
                                return;
                            }

                            console.log(
                                "Joined conversation room:",
                                conversationId
                            );

                            // Recover messages that may have arrived while
                            // this client was disconnected.
                            await loadMessages();
                        }
                    );
                }

                // Register the listener before joining the room.
                socket.on("message:new", handleNewMessage);
                socket.on("connect", handleConnect);

                if (socket.connected) {
                    await synchronizeConnection();
                }
            } catch (err) {
                if (!cancelled) {
                    console.error(
                        "Unable to subscribe to conversation:",
                        err
                    );
                }
            }
        }

        subscribe();

        return () => {
            cancelled = true;

            if (activeSocket) {
                if (handleNewMessage) {
                    activeSocket.off(
                        "message:new",
                        handleNewMessage
                    );
                }

                if (handleConnect) {
                    activeSocket.off("connect", handleConnect);
                }

                if (activeSocket.connected) {
                    activeSocket.emit("conversation:leave", {
                        conversationId,
                    });
                }
            }
        };
    }, [conversationId, loadMessages]);

    async function handleSubmit(event) {
        event.preventDefault();

        const trimmedContent = content.trim();

        if (!trimmedContent || sending || !conversationId) {
            return;
        }

        setSending(true);
        setError("");

        try {
            const result = await sendConversationMessage(
                conversationId,
                trimmedContent
            );

            const sentMessage = result.message ?? result;

            if (sentMessage?.id) {
                setMessages((previousMessages) =>
                    mergeMessages(previousMessages, [sentMessage])
                );
            }

            setContent("");
        } catch (err) {
            console.error("Unable to send message:", err);

            setError(
                err.message || "Unable to send message."
            );
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="flex h-full min-h-0 flex-col bg-app">
            {/* Conversation header */}
            <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-surface px-4 py-3">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 md:hidden"
                        aria-label="Back to conversations"
                    >
                        ←
                    </button>
                )}

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">
                    {displayName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                    <h2 className="truncate font-semibold text-text-primary">
                        {displayName}
                    </h2>
                    <p className="truncate text-xs text-text-secondary">
                        {profile?.username
                            ? `@${profile.username}`
                            : "JaisChat"}
                    </p>
                </div>
            </header>

            {/* Messages */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
                {loading && messages.length === 0 && (
                    <p className="text-center text-sm text-text-secondary">
                        Loading messages...
                    </p>
                )}

                {!loading && messages.length === 0 && (
                    <p className="m-auto text-center text-sm text-text-secondary">
                        No messages yet. Start the conversation!
                    </p>
                )}

                {messages.map((message) => {
                    const isOwnMessage =
                        message.senderId === currentUserId;

                    return (
                        <div
                            key={message.id}
                            className={`flex ${isOwnMessage
                                ? "justify-end"
                                : "justify-start"
                                }`}
                        >
                            <div
                                className={`max-w-[85%] break-words rounded-2xl px-4 py-2 sm:max-w-[75%] ${isOwnMessage
                                    ? "rounded-br-sm bg-brand text-white"
                                    : "rounded-bl-sm border border-gray-200 bg-surface text-text-primary"
                                    }`}
                            >
                                <p className="whitespace-pre-wrap text-sm">
                                    {message.content}
                                </p>

                                <p
                                    className={`mt-1 text-right text-[10px] ${isOwnMessage
                                        ? "text-white/80"
                                        : "text-text-secondary"
                                        }`}
                                >
                                    {message.createdAt
                                        ? new Date(
                                            message.createdAt
                                        ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })
                                        : ""}
                                </p>
                            </div>
                        </div>
                    );
                })}

                <div ref={bottomRef} />
            </div>

            {/* Error message */}
            {error && (
                <p
                    role="alert"
                    className="shrink-0 px-4 py-2 text-sm text-red-600"
                >
                    {error}
                </p>
            )}

            {/* Message input */}
            <form
                onSubmit={handleSubmit}
                className="flex shrink-0 items-end gap-2 border-t border-gray-200 bg-surface p-3 sm:p-4"
            >
                <textarea
                    value={content}
                    onChange={(event) =>
                        setContent(event.target.value)
                    }
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
                    rows={1}
                    maxLength={4000}
                    className="max-h-32 min-h-11 min-w-0 flex-1 resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-text-primary outline-none focus:border-brand"
                    aria-label="Message"
                    disabled={sending || !conversationId}
                />

                <button
                    type="submit"
                    disabled={
                        sending ||
                        !content.trim() ||
                        !conversationId
                    }
                    className="shrink-0 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {sending ? "Sending..." : "Send"}
                </button>
            </form>
        </section>
    );
}
