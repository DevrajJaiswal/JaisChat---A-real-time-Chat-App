
import { apiRequest } from "../../lib/api.js";

export async function getConversationMessages(
    conversationId,
    { limit = 50, before } = {}
) {
    if (!conversationId) {
        throw new Error("A conversation ID is required.");
    }

    const params = new URLSearchParams({
        limit: String(limit),
    });

    if (before) {
        params.set("before", before);
    }

    return apiRequest(
        `/conversations/${encodeURIComponent(conversationId)}/messages?${params}`
    );
}

export async function sendConversationMessage(
    conversationId,
    content,
    clientMessageId = crypto.randomUUID()
) {
    if (!conversationId) {
        throw new Error("A conversation ID is required.");
    }

    return apiRequest(
        `/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
            method: "POST",
            body: JSON.stringify({
                content,
                clientMessageId,
            }),
        }
    );
}
