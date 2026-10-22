
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";

import { auth } from "../../config/firebase.js";

let recaptchaVerifier = null;

export function setupRecaptcha(containerId) {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(
      auth,
      containerId,
      {
        size: "normal",
      }
    );
  }

  return recaptchaVerifier.render();
}

export async function sendOtp(phoneNumber) {
  const verifier = recaptchaVerifier;

  if (!verifier) {
    throw new Error("Please initialize reCAPTCHA first.");
  }

  return signInWithPhoneNumber(
    auth,
    phoneNumber,
    verifier
  );
}

export async function verifyOtp(confirmationResult, code) {
  const credential = await confirmationResult.confirm(code);

  const idToken = await credential.user.getIdToken();

  return {
    user: credential.user,
    idToken,
  };
}

export async function getFirebaseIdToken() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You are not signed in.");
  }

  return user.getIdToken();
}

export async function logout() {
  await signOut(auth);
}
