
import { useCallback, useEffect, useRef, useState } from "react";
import {
    getConversationMessages,
    sendConversationMessage,
} from "./message.service.js";

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

    const loadMessages = useCallback(async () => {
        if (!conversationId) return;

        setLoading(true);
        setError("");

        try {
            const result = await getConversationMessages(
                conversationId
            );

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
        bottomRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    async function handleSubmit(event) {
        event.preventDefault();

        const text = content.trim();

        if (!text || sending) return;

        if (text.length > 4000) {
            setError("Messages cannot exceed 4000 characters.");
            return;
        }

        setSending(true);
        setError("");

        // Keep this ID for retries of this same message.
        const clientMessageId = crypto.randomUUID();

        try {
            const result = await sendConversationMessage(
                conversationId,
                text,
                clientMessageId
            );

            setMessages((current) => {
                const alreadyExists = current.some(
                    (message) => message.id === result.message.id
                );

                return alreadyExists
                    ? current
                    : [...current, result.message];
            });

            setContent("");
        } catch (err) {
            setError(err.message || "Unable to send message.");
        } finally {
            setSending(false);
        }
    }

    if (!conversationId) {
        return (
            <section className="p-6">
                <p role="alert">No conversation selected.</p>
                <button onClick={onBack} className="mt-3 underline">
                    Back
                </button>
            </section>
        );
    }

    return (
        <section className="mx-auto flex h-[75vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-white">
            <header className="flex items-center gap-3 border-b p-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded border px-3 py-1.5 text-sm"
                >
                    Back
                </button>

                <div>
                    <h2 className="font-semibold">Conversation</h2>
                    <p className="text-xs text-gray-500">
                        {conversationId}
                    </p>
                </div>
            </header>

            <div
                className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4"
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
                        const isMine =
                            message.senderId === currentUserId;

                        return (
                            <div
                                key={message.id}
                                className={`flex ${isMine ? "justify-end" : "justify-start"
                                    }`}
                            >
                                <article
                                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 ${isMine
                                            ? "bg-blue-600 text-white"
                                            : "border bg-white text-gray-900"
                                        }`}
                                >
                                    <p>{message.content}</p>

                                    <time
                                        className={`mt-1 block text-right text-xs ${isMine
                                                ? "text-blue-100"
                                                : "text-gray-500"
                                            }`}
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
                className="flex items-end gap-2 border-t p-3"
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
                    className="min-w-0 flex-1 resize-y rounded-lg border p-3 outline-none focus:border-blue-500"
                />

                <button
                    type="submit"
                    disabled={sending || !content.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {sending ? "Sending..." : "Send"}
                </button>
            </form>
        </section>
    );
}
