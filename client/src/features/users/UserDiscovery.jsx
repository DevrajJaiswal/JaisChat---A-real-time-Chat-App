
import { useState } from "react";
import { searchUsers } from "./user-discovery.service.js";
import { createDirectConversation } from "../conversations/conversation.service.js";

export default function UserDiscovery({ onStartChat }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [startingChatId, setStartingChatId] = useState(null);
    const [error, setError] = useState("");
    const [searched, setSearched] = useState(false);

    async function handleSearch(event) {
        event.preventDefault();

        const query = searchTerm.trim();

        if (query.length < 2) {
            setError("Enter at least 2 characters to search.");
            setUsers([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        setError("");
        setSearched(false);

        try {
            const result = await searchUsers(query);
            setUsers(result.users ?? []);
            setSearched(true);
        } catch (err) {
            setError(err.message || "Unable to search users.");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleStartChat(user) {
        setError("");
        setStartingChatId(user.id);

        try {
            const result = await createDirectConversation(user.id);

            if (!result.conversation) {
                throw new Error("The server did not return a conversation.");
            }

            if (onStartChat) {
                await onStartChat(result.conversation);
            }
        } catch (err) {
            setError(err.message || "Unable to start conversation.");
        } finally {
            setStartingChatId(null);
        }
    }

    return (
        <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
            <div className="border-b border-slate-200 p-3">
                <form onSubmit={handleSearch}>
                    <label
                        htmlFor="user-search"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        Search people
                    </label>

                    <div className="flex gap-2">
                        <input
                            id="user-search"
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Name or username"
                            aria-label="Search users"
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="shrink-0 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Searching" : "Search"}
                        </button>
                    </div>
                </form>

                {error && (
                    <p
                        role="alert"
                        className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                        {error}
                    </p>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {loading && (
                    <p className="p-6 text-center text-sm text-slate-500">
                        Searching for people...
                    </p>
                )}

                {!loading && !searched && users.length === 0 && !error && (
                    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-2xl">
                            🔎
                        </div>
                        <h2 className="mt-4 font-semibold text-slate-800">
                            Find someone to chat with
                        </h2>
                        <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                            Search by display name or username to start a conversation.
                        </p>
                    </div>
                )}

                {!loading && searched && users.length === 0 && (
                    <div className="px-6 py-12 text-center">
                        <p className="font-medium text-slate-700">
                            No people found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Try another name or username.
                        </p>
                    </div>
                )}

                {!loading && users.length > 0 && (
                    <ul className="divide-y divide-slate-100">
                        {users.map((user) => {
                            const profile = user.profile;
                            const name =
                                profile?.displayName ||
                                profile?.username ||
                                "User";
                            const initials = name.charAt(0).toUpperCase();

                            return (
                                <li
                                    key={user.id}
                                    className="flex items-center gap-3 px-4 py-4 transition hover:bg-slate-50 sm:px-5"
                                >
                                    {profile?.avatarUrl ? (
                                        <img
                                            src={profile.avatarUrl}
                                            alt=""
                                            className="h-12 w-12 shrink-0 rounded-full bg-slate-100 object-cover"
                                        />
                                    ) : (
                                        <div
                                            aria-hidden="true"
                                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-semibold text-text-primary"
                                        >
                                            {initials}
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-slate-800">
                                            {name}
                                        </p>
                                        <p className="truncate text-sm text-slate-500">
                                            @{profile?.username || "username"}
                                        </p>

                                        {profile?.about && (
                                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                                {profile.about}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={startingChatId !== null}
                                        onClick={() => handleStartChat(user)}
                                        className="shrink-0 rounded-xl border border-brand px-3 py-2 text-sm font-semibold bg-brand text-app transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {startingChatId === user.id
                                            ? "Opening..."
                                            : "Message"}
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
