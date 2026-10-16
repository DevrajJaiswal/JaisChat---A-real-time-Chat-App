
import {
  getCurrentUser,
  upsertUserProfile,
} from "./profile.service.js";

export async function getMe(req, res) {
  try {
    const user = await getCurrentUser(req.auth.uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not synchronized. Please sync your account first.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get current user failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user",
    });
  }
}

export async function saveMyProfile(req, res) {
  const { username, displayName, avatarUrl, about } = req.body;

  if (
    typeof username !== "string" ||
    typeof displayName !== "string" ||
    !/^[a-zA-Z0-9_]{5,30}$/.test(username.trim()) ||
    displayName.trim().length < 1 ||
    displayName.trim().length > 80
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Username must be 5–30 characters (letters, numbers, underscores), and displayName must be 1–80 characters.",
    });
  }

  if (
    (avatarUrl != null &&
      (typeof avatarUrl !== "string" ||
        avatarUrl.length > 2048 ||
        !/^https?:\/\/\S+$/i.test(avatarUrl))) ||
    (about != null &&
      (typeof about !== "string" || about.length > 150))
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid avatarUrl or about value.",
    });
  }

  try {
    const profile = await upsertUserProfile(req.auth.uid, {
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      avatarUrl: avatarUrl?.trim() || null,
      about: about?.trim() || null,
    });

    return res.status(200).json({
      success: true,
      message: "Profile saved successfully",
      profile,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "That username is already taken.",
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Save profile failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save profile",
    });
  }
}
