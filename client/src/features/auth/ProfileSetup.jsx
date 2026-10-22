
import { useState } from "react";
import { saveMyProfile } from "./user.service.js";

export default function ProfileSetup({ onSaved }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [about, setAbout] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await saveMyProfile({
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        about: about.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });

      onSaved(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md p-6">
      <h2 className="mb-2 text-2xl font-bold">
        Set up your profile
      </h2>

      <p className="mb-6 text-gray-600">
        Choose how other people will see you on ChatSphere.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block">Username</span>
          <input
            className="w-full rounded border p-2"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_]+"
            title="Use letters, numbers, and underscores only."
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block">Display name</span>
          <input
            className="w-full rounded border p-2"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={80}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block">About (optional)</span>
          <textarea
            className="w-full rounded border p-2"
            value={about}
            onChange={(event) => setAbout(event.target.value)}
            maxLength={150}
            rows={3}
          />
        </label>

        <label className="block">
          <span className="mb-1 block">Avatar URL (optional)</span>
          <input
            className="w-full rounded border p-2"
            type="url"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://example.com/avatar.jpg"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
