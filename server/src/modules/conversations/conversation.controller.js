
import {
  createOrGetDirectConversation,
  listUserConversations,
} from "./conversation.service.js";

export async function createDirectConversation(req, res) {
  const { targetUserId } = req.body;

  if (
    typeof targetUserId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      targetUserId
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid targetUserId UUID is required",
    });
  }

  try {
    const conversation = await createOrGetDirectConversation(
      req.auth.uid,
      targetUserId
    );

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Create direct conversation failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create conversation",
    });
  }
}

export async function getConversations(req, res) {
  try {
    const conversations = await listUserConversations(req.auth.uid);

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Get conversations failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve conversations",
    });
  }
}
