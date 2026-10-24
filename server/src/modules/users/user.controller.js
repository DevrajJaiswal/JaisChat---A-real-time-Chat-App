
import {
  searchUsers,
  syncUser,
} from "./user.service.js";

export async function syncCurrentUser(req, res) {
  try {
    const user = await syncUser(req.auth);

    return res.status(200).json({
      success: true,
      message: "User synchronized successfully",
      user,
    });
  } catch (error) {
    console.error("User synchronization failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to synchronize user",
    });
  }
}

export async function discoverUsers(req, res) {
  const searchTerm = req.query.q?.trim();

  if (!searchTerm || searchTerm.length < 2) {
    return res.status(400).json({
      success: false,
      message: "Search query must contain at least 2 characters",
    });
  }

  if (searchTerm.length > 30) {
    return res.status(400).json({
      success: false,
      message: "Search query cannot exceed 30 characters",
    });
  }

  try {
    const users = await searchUsers(req.auth.uid, searchTerm);

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("User discovery failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to search users",
    });
  }
}
