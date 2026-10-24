
import { apiRequest } from "../../lib/api.js";

export async function createDirectConversation(targetUserId) {
  if (!targetUserId) {
    throw new Error("A target user ID is required.");
  }

  return apiRequest("/conversations/direct", {
    method: "POST",
    body: JSON.stringify({ targetUserId }),
  });
}

export async function getConversations() {
  return apiRequest("/conversations");
}
