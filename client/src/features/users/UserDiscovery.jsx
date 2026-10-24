
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
                throw new Error(
                    "The server did not return a conversation."
                );
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
        <section className="mx-auto w-full max-w-2xl p-6">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    JaisChat
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    Find people and start a conversation.
                </p>
            </header>

            <form onSubmit={handleSearch} className="flex gap-2">
                <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search username or display name"
                    aria-label="Search users"
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? "Searching..." : "Search"}
                </button>
            </form>

            {error && (
                <p role="alert" className="mt-4 text-sm text-red-600">
                    {error}
                </p>
            )}

            {loading && (
                <p className="mt-6 text-sm text-gray-600">
                    Searching for users...
                </p>
            )}

            {!loading && searched && users.length === 0 && (
                <p className="mt-6 rounded-lg border border-dashed p-6 text-center text-gray-600">
                    No users found. Try another username or display name.
                </p>
            )}

            {!loading && users.length > 0 && (
                <ul className="mt-6 divide-y divide-gray-200 rounded-lg border">
                    {users.map((user) => {
                        const profile = user.profile;
                        const initials = (
                            profile?.displayName || profile?.username || "U"
                        )
                            .charAt(0)
                            .toUpperCase();

                        return (
                            <li
                                key={user.id}
                                className="flex items-center gap-3 p-4"
                            >
                                {profile?.avatarUrl ? (
                                    <img
                                        src={profile.avatarUrl}
                                        alt=""
                                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                                    />
                                ) : (
                                    <div
                                        aria-hidden="true"
                                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700"
                                    >
                                        {initials}
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-gray-900">
                                        {profile?.displayName}
                                    </p>
                                    <p className="truncate text-sm text-gray-500">
                                        @{profile?.username}
                                    </p>

                                    {profile?.about && (
                                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                                            {profile.about}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    disabled={startingChatId !== null}
                                    onClick={() => handleStartChat(user)}
                                    className="shrink-0 rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {startingChatId === user.id
                                        ? "Starting..."
                                        : "Start Chat"}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
