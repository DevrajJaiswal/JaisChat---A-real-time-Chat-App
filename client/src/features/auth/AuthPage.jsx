
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../config/firebase.js";

import {
  connectSocket,
  disconnectSocket,
} from "../../lib/socket.js";

import {
  sendOtp,
  setupRecaptcha,
  verifyOtp,
  logout,
} from "./auth.service.js";

import {
  syncCurrentUser,
  getCurrentUser,
} from "./user.service.js";

import ProfileSetup from "./ProfileSetup.jsx";
import UserDiscovery from "../users/UserDiscovery.jsx";
import ConversationView from "../conversations/ConversationView.jsx";

export default function AuthPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [idToken, setIdToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedProfile, setSavedProfile] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [logoutError, setLogoutError] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const recaptchaReady = useRef(false);

  // Load the authenticated user and profile after initial page load.
  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) {
          setIdToken("");
          setSavedProfile(null);
          setCheckingProfile(false);
          setProfileLoadFailed(false);
          setCheckingAuth(false);
        }

        return;
      }

      if (cancelled) return;

      setCheckingProfile(true);
      setProfileLoadFailed(false);
      setError("");

      try {
        const token = await user.getIdToken();

        if (cancelled) return;

        setIdToken(token);

        await syncCurrentUser();

        const userResult = await getCurrentUser();

        if (cancelled) return;

        setSavedProfile(
          userResult.user?.profile
            ? userResult.user
            : null
        );
      } catch (err) {
        if (!cancelled) {
          console.error("Unable to load user profile:", err);
          setProfileLoadFailed(true);
          setError(
            err.message ||
            "Unable to load your profile. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setCheckingProfile(false);
          setCheckingAuth(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Initialize reCAPTCHA only when the login form is available.
  useEffect(() => {
    if (checkingAuth || idToken || confirmationResult) {
      return;
    }

    let cancelled = false;

    async function initializeRecaptcha() {
      try {
        await setupRecaptcha("recaptcha-container");

        if (!cancelled) {
          recaptchaReady.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          recaptchaReady.current = false;
          setError(err.message);
        }
      }
    }

    initializeRecaptcha();

    return () => {
      cancelled = true;
    };
  }, [checkingAuth, idToken, confirmationResult]);

  // Connect the authenticated user to Socket.IO.
  useEffect(() => {
    if (!idToken) {
      return;
    }

    let cancelled = false;
    let activeSocket;

    const handleConnect = () => {
      if (activeSocket) {
        console.log(
          "JaisChat socket connected:",
          activeSocket.id
        );
      }
    };

    const handleConnectError = (err) => {
      console.error("Socket connection failed:", err.message);
    };

    async function initializeSocket() {
      try {
        const socket = await connectSocket();

        if (cancelled) {
          return;
        }

        activeSocket = socket;

        socket.on("connect", handleConnect);
        socket.on("connect_error", handleConnectError);

        if (socket.connected) {
          handleConnect();
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Unable to initialize socket:",
            err.message
          );
        }
      }
    }

    initializeSocket();

    return () => {
      cancelled = true;

      if (activeSocket) {
        activeSocket.off("connect", handleConnect);
        activeSocket.off("connect_error", handleConnectError);
      }
    };
  }, [idToken]);

  async function refreshCurrentProfile() {
    setError("");
    setCheckingProfile(true);
    setProfileLoadFailed(false);

    try {
      const result = await getCurrentUser();

      setSavedProfile(
        result.user?.profile ? result.user : null
      );

      return true;
    } catch (err) {
      setProfileLoadFailed(true);
      setError(
        err.message || "Unable to load your profile."
      );

      return false;
    } finally {
      setCheckingProfile(false);
    }
  }

  async function handleSendOtp(event) {
    event.preventDefault();
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
      setError(err.message || "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await verifyOtp(confirmationResult, otp.trim());
      setOtp("");
      // onAuthStateChanged handles token and profile loading.
    } catch (err) {
      setError(err.message || "Unable to verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLogoutError("");

    try {
      disconnectSocket();
      await logout();

      setConfirmationResult(null);
      setActiveConversation(null);
      setPhoneNumber("");
      setOtp("");
      setError("");
      setSavedProfile(null);
      setIdToken("");
      setProfileLoadFailed(false);
      recaptchaReady.current = false;
    } catch (err) {
      setLogoutError(err.message || "Unable to sign out.");
    }
  }

  async function handleProfileSaved(_result, options = {}) {
    if (options.cancel) {
      setIsEditingProfile(false);
      setError("");
      return;
    }

    const refreshed = await refreshCurrentProfile();

    if (refreshed) {
      setIsEditingProfile(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-2xl font-bold">
        JaisChat
      </h1>

      {!checkingAuth && !idToken && (
        <p className="mb-6 text-gray-600">
          Sign in with your phone number
        </p>
      )}

      {checkingAuth && (
        <p className="mt-6 text-sm text-gray-600">
          Restoring your session...
        </p>
      )}

      {!checkingAuth && !idToken && !confirmationResult && (
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

      {!checkingAuth && !idToken && confirmationResult && (
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
          ) : profileLoadFailed ? (
            <section className="mt-6 rounded border p-4">
              <p className="text-sm text-red-600">
                Your session is active, but your profile
                could not be loaded.
              </p>

              <button
                type="button"
                onClick={refreshCurrentProfile}
                className="mt-3 rounded border px-3 py-2 text-sm"
              >
                Retry
              </button>
            </section>
          ) : savedProfile?.profile ? (
            <>
              <section className="mt-6 rounded border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-green-700">
                      Welcome,{" "}
                      {savedProfile.profile.displayName}!
                    </h2>

                    <p className="text-sm text-gray-600">
                      @{savedProfile.profile.username}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded border px-3 py-2 text-sm"
                  >
                    Sign out
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setIsEditingProfile(true);
                    }}
                    className="rounded border px-3 py-2 text-sm"
                  >
                    Edit Profile
                  </button>
                </div>
              </section>

              {isEditingProfile ? (
                <ProfileSetup
                  initialProfile={savedProfile.profile}
                  onSaved={handleProfileSaved}
                />
              ) : activeConversation ? (
                <ConversationView
                  conversation={activeConversation}
                  currentUserId={savedProfile.id}
                  onBack={() => setActiveConversation(null)}
                />
              ) : (
                <UserDiscovery
                  onStartChat={(conversation) => {
                    setActiveConversation(conversation);
                  }}
                />
              )}
            </>
          ) : (
            <ProfileSetup onSaved={handleProfileSaved} />
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

      {logoutError && (
        <p
          role="alert"
          className="mt-4 break-words text-red-600"
        >
          {logoutError}
        </p>
      )}
    </main>
  );
}
