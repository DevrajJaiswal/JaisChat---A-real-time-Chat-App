
import {
  sendMessage,
  getConversationMessages,
} from "./message.service.js";
import { getIO } from "../../socket/socket.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createMessage(req, res) {
  const { conversationId } = req.params;
  const { content, clientMessageId } = req.body;

  if (!UUID_PATTERN.test(conversationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid conversation ID",
    });
  }

  if (typeof content !== "string") {
    return res.status(400).json({
      success: false,
      message: "Message content is required",
    });
  }

  try {

    const message = await sendMessage(req.auth.uid, conversationId, {
      content,
      clientMessageId,
    });

    // Broadcast only after the database operation succeeds.
    try {
      getIO()
        .to(`conversation:${conversationId}`)
        .emit("message:new", message);
    } catch (error) {
      // The message is already saved. Don't turn a successful
      // database operation into a failed HTTP response.
      console.error("Message broadcast failed:", error);
    }

    return res.status(201).json({
      success: true,
      message,
    });

  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Create message error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send message",
    });
  }
}

export async function listMessages(req, res) {
  const { conversationId } = req.params;
  const rawLimit = req.query.limit ?? "50";
  const { before } = req.query;

  if (!UUID_PATTERN.test(conversationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid conversation ID",
    });
  }

  if (
    typeof rawLimit !== "string" ||
    !/^\d+$/.test(rawLimit) ||
    Number(rawLimit) < 1 ||
    Number(rawLimit) > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Limit must be between 1 and 100",
    });
  }

  if (before !== undefined &&
    (typeof before !== "string" || !UUID_PATTERN.test(before))) {
    return res.status(400).json({
      success: false,
      message: "Invalid message cursor",
    });
  }

  try {
    const messages = await getConversationMessages(
      req.auth.uid,
      conversationId,
      {
        limit: Number(rawLimit),
        before,
      }
    );

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("List messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve messages",
    });
  }
}
