
import { syncUser } from "./user.service.js";

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
