
import { useCallback, useEffect, useRef, useState } from "react";
import { getConversations, createDirectConversation } from "./conversation.service.js";
import { searchUsers } from "../users/user-discovery.service.js";
import { connectSocket } from "../../lib/socket.js";

function getOtherMember(conversation, currentUserId) {
    return conversation.members?.find(
        (member) => member.userId !== currentUserId
    );
}

function formatActivityTime(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    }

    return date.toLocaleDateString([], {
        day: "numeric",
        month: "short",
    });
}

export default function ConversationList({
    currentUserId,
    activeConversationId,
    onSelectConversation,
    onConversationsLoaded,
    onSearchFocus,
}) {
    const searchStorageKey = `jaischat:search:${currentUserId}`;
    const loadCallbackRef = useRef(onConversationsLoaded);

    const [conversations, setConversations] = useState([]);
    const [searchTerm, setSearchTerm] = useState(
        () => sessionStorage.getItem(searchStorageKey) ?? ""
    );
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [startingChatId, setStartingChatId] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        loadCallbackRef.current = onConversationsLoaded;
    }, [onConversationsLoaded]);

    useEffect(() => {
        if (!currentUserId) return;

        sessionStorage.setItem(searchStorageKey, searchTerm);
    }, [currentUserId, searchStorageKey, searchTerm]);

    const loadConversations = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getConversations();

            const items = (result.conversations ?? []).sort(
                (a, b) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime()
            );

            setConversations(items);
            loadCallbackRef.current?.(items);
        } catch (err) {
            setError(err.message || "Unable to load conversations.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        if (!currentUserId) return;

        let cancelled = false;
        let activeSocket = null;

        async function subscribeToConversationUpdates() {
            try {
                const socket = await connectSocket();

                if (cancelled) return;

                function handleConversationUpdate(update) {
                    const {
                        conversationId,
                        message,
                        updatedAt,
                    } = update ?? {};

                    if (
                        !conversationId ||
                        !message ||
                        message.conversationId !== conversationId
                    ) {
                        return;
                    }

                    setConversations((current) => {
                        const existing = current.find(
                            (conversation) =>
                                conversation.id === conversationId
                        );

                        if (!existing) return current;

                        const previousMessage = existing.messages?.[0];

                        if (
                            previousMessage?.createdAt &&
                            new Date(previousMessage.createdAt).getTime() >
                            new Date(message.createdAt).getTime()
                        ) {
                            return current;
                        }

                        const updatedConversation = {
                            ...existing,
                            updatedAt: updatedAt || message.createdAt,
                            messages: [message],
                        };

                        return [
                            updatedConversation,
                            ...current.filter(
                                (conversation) =>
                                    conversation.id !== conversationId
                            ),
                        ].sort(
                            (a, b) =>
                                new Date(b.updatedAt).getTime() -
                                new Date(a.updatedAt).getTime()
                        );
                    });
                }

                function handleSocketConnect() {
                    if (cancelled) return;

                    console.log(
                        "Refreshing conversation list after socket connection."
                    );

                    loadConversations();
                }

                socket.on(
                    "conversation:list:update",
                    handleConversationUpdate
                );

                socket.on("connect", handleSocketConnect);

                activeSocket = {
                    socket,
                    handleConversationUpdate,
                    handleSocketConnect,
                };

                if (socket.connected) {
                    handleSocketConnect();
                }
            } catch (error) {
                if (!cancelled) {
                    console.error(
                        "Unable to subscribe to conversation list updates:",
                        error
                    );
                }
            }
        }

        subscribeToConversationUpdates();

        return () => {
            cancelled = true;

            if (activeSocket) {
                activeSocket.socket.off(
                    "conversation:list:update",
                    activeSocket.handleConversationUpdate
                );

                activeSocket.socket.off(
                    "connect",
                    activeSocket.handleSocketConnect
                );
            }
        };
    }, [currentUserId, loadConversations]);



    async function handleSearch(event) {
        event.preventDefault();

        const query = searchTerm.trim();

        if (query.length < 2) {
            setError("Enter at least 2 characters to search.");
            setUsers([]);
            setSearched(false);
            return;
        }

        setSearching(true);
        setError("");

        try {
            const result = await searchUsers(query);
            setUsers(result.users ?? []);
            setSearched(true);
        } catch (err) {
            setError(err.message || "Unable to search users.");
            setUsers([]);
            setSearched(false);
        } finally {
            setSearching(false);
        }
    }

    function handleSearchChange(value) {
        setSearchTerm(value);
        setError("");

        if (!value.trim()) {
            setUsers([]);
            setSearched(false);
        }
    }

    async function handleStartChat(user) {
        setStartingChatId(user.id);
        setError("");

        try {
            const result = await createDirectConversation(user.id);

            if (!result.conversation) {
                throw new Error("The server did not return a conversation.");
            }

            onSelectConversation(result.conversation);
            setSearchTerm("");
            setUsers([]);
            setSearched(false);

            await loadConversations();
        } catch (err) {
            setError(err.message || "Unable to start conversation.");
        } finally {
            setStartingChatId(null);
        }
    }

    function renderUser(user) {
        const profile = user.profile;
        const name =
            profile?.displayName || profile?.username || "User";

        return (
            <li key={user.id}>
                <button
                    type="button"
                    disabled={startingChatId !== null}
                    onClick={() => handleStartChat(user)}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {profile?.avatarUrl ? (
                        <img
                            src={profile.avatarUrl}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                    ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-hover">
                            {name.charAt(0).toUpperCase()}
                        </span>
                    )}

                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">
                            {name}
                        </span>
                        <span className="block truncate text-xs text-text-secondary">
                            @{profile?.username || "username"}
                        </span>
                    </span>

                    <span className="shrink-0 text-xs font-medium text-brand-hover">
                        {startingChatId === user.id ? "Opening..." : "Message"}
                    </span>
                </button>
            </li>
        );
    }

    return (
        <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
            <header className="flex h-[66px] shrink-0 items-center border-b border-slate-200 p-3">
                <form onSubmit={handleSearch} className="flex w-full gap-2">
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) =>
                            handleSearchChange(event.target.value)
                        }
                        onFocus={onSearchFocus}
                        placeholder="Search people"
                        aria-label="Search people by name or username"
                        className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
                    />

                    <button
                        type="submit"
                        disabled={searching}
                        className="h-10 shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {searching ? "..." : "Search"}
                    </button>
                </form>
            </header>

            {error && (
                <div className="shrink-0 px-3 py-2">
                    <p role="alert" className="text-sm text-red-600">
                        {error}
                    </p>
                    {!searched && (
                        <button
                            type="button"
                            onClick={loadConversations}
                            className="mt-1 cursor-pointer text-sm text-brand hover:underline"
                        >
                            Reload chats
                        </button>
                    )}
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
                {searching ? (
                    <p className="p-5 text-center text-sm text-text-secondary">
                        Searching people...
                    </p>
                ) : searched ? (
                    users.length > 0 ? (
                        <ul className="divide-y divide-slate-100">
                            {users.map(renderUser)}
                        </ul>
                    ) : (
                        <p className="px-5 py-10 text-center text-sm text-text-secondary">
                            No people found. Try another name or username.
                        </p>
                    )
                ) : loading ? (
                    <p className="p-5 text-center text-sm text-text-secondary">
                        Loading chats...
                    </p>
                ) : conversations.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-text-secondary">
                        No conversations yet. Search for someone to start a chat.
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {conversations.map((conversation) => {
                            const member = getOtherMember(
                                conversation,
                                currentUserId
                            );
                            const profile = member?.user?.profile;
                            const name =
                                profile?.displayName ||
                                profile?.username ||
                                "Unknown user";
                            const latestMessage = conversation.messages?.[0];
                            const isActive =
                                conversation.id === activeConversationId;

                            return (
                                <li key={conversation.id}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onSelectConversation(conversation)
                                        }
                                        aria-current={
                                            isActive ? "true" : undefined
                                        }
                                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-brand ${isActive
                                            ? "bg-brand-soft"
                                            : "hover:bg-slate-50"
                                            }`}
                                    >
                                        {profile?.avatarUrl ? (
                                            <img
                                                src={profile.avatarUrl}
                                                alt=""
                                                className="h-11 w-11 shrink-0 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-hover">
                                                {name.charAt(0).toUpperCase()}
                                            </span>
                                        )}

                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-text-primary">
                                                {name}
                                            </span>
                                            <span className="mt-1 block truncate text-xs text-text-secondary">
                                                {latestMessage
                                                    ? latestMessage.senderId === currentUserId
                                                        ? `You: ${latestMessage.content}`
                                                        : latestMessage.content
                                                    : "Start a conversation"}
                                            </span>
                                        </span>

                                        <span className="shrink-0 self-start pt-1 text-[11px] text-text-secondary">
                                            {formatActivityTime(
                                                latestMessage?.createdAt ||
                                                conversation.updatedAt
                                            )}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}
