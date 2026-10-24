
import { useEffect, useRef, useState } from "react";

import {
  sendOtp,
  setupRecaptcha,
  verifyOtp,
} from "./auth.service.js";

import {
  syncCurrentUser,
  getCurrentUser,
} from "./user.service.js";

import ProfileSetup from "./ProfileSetup.jsx";
import UserDiscovery from "../users/UserDiscovery.jsx";
import { logout } from "./auth.service.js";

export default function AuthPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [idToken, setIdToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedProfile, setSavedProfile] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [profileCheckFailed, setProfileCheckFailed] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [logoutError, setLogoutError] = useState("");

  const recaptchaReady = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        await setupRecaptcha("recaptcha-container");

        if (mounted) {
          recaptchaReady.current = true;
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSendOtp(event) {
    event.preventDefault();
    setProfileCheckFailed(false);
    setError("");
    setLoading(true);

    try {
      if (!recaptchaReady.current) {
        throw new Error(
          "reCAPTCHA is not ready. Please wait and try again."
        );
      }

      const result = await sendOtp(phoneNumber.trim());
      setConfirmationResult(result);
    } catch (err) {
      setProfileCheckFailed(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    setCheckingProfile(true);

    try {
      const result = await verifyOtp(
        confirmationResult,
        otp.trim()
      );

      setIdToken(result.idToken);
      setOtp("");

      await syncCurrentUser();

      const userResult = await getCurrentUser();

      setSavedProfile(
        userResult.user?.profile
          ? userResult.user
          : null
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingProfile(false);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-2xl font-bold">
        JaisChat
      </h1>

      <p className="mb-6 text-gray-600">
        Sign in with your phone number
      </p>

      {!idToken && !confirmationResult && (
        <form
          onSubmit={handleSendOtp}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1 block">
              Phone number
            </span>

            <input
              className="w-full rounded border p-2"
              type="tel"
              placeholder="+91XXXXXXXXXX"
              value={phoneNumber}
              onChange={(event) =>
                setPhoneNumber(event.target.value)
              }
              required
            />
          </label>

          <div id="recaptcha-container" />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      )}

      {!idToken && confirmationResult && (
        <form
          onSubmit={handleVerifyOtp}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1 block">
              Verification code
            </span>

            <input
              className="w-full rounded border p-2"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value)
              }
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      )}


      {idToken && (
        <>
          {checkingProfile ? (
            <p className="mt-6 text-sm text-gray-600">
              Checking your profile...
            </p>
          ) : savedProfile?.profile ? (
            <>
              <section className="mt-6 rounded border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-green-700">
                      Welcome, {savedProfile.profile.displayName}!
                    </h2>
                    <p className="text-sm text-gray-600">
                      @{savedProfile.profile.username}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setLogoutError("");

                      try {
                        await logout();
                        setIdToken("");
                        setSavedProfile(null);
                        setConfirmationResult(null);
                        setActiveConversation(null);
                        setPhoneNumber("");
                        setOtp("");
                      } catch (err) {
                        setLogoutError(err.message);
                      }
                    }}
                    className="rounded border px-3 py-2 text-sm"
                  >
                    Sign out
                  </button>
                </div>
              </section>

              <UserDiscovery
                onStartChat={async (conversation) => {
                  setActiveConversation(conversation);
                }}
              />

              {activeConversation && (
                <section className="mt-4 rounded border p-4">
                  <h2 className="font-semibold">
                    Conversation ready
                  </h2>
                  <p className="mt-2 break-all text-sm text-gray-600">
                    Conversation ID: {activeConversation.id}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Your direct conversation has been created or retrieved.
                    The message screen will be added in a later step.
                  </p>
                </section>
              )}
            </>
          ) : (
            <ProfileSetup
              onSaved={async () => {
                setError("");

                try {
                  const userResult = await getCurrentUser();
                  setSavedProfile(userResult.user);
                } catch (err) {
                  setError(
                    `Profile saved, but could not load it: ${err.message}`
                  );
                }
              }}
            />
          )}
        </>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 break-words text-red-600"
        >
          {error}
        </p>
      )}
    </main>
  );
}
