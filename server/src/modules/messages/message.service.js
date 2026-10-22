
import { prisma } from "../../config/prisma.js";

const MESSAGE_MAX_LENGTH = 4000;

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getConversationMember(firebaseUid, conversationId) {
  const user = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });

  if (!user) {
    throw createError("User not synchronized", 404);
  }

  const membership = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: user.id,
      },
    },
    select: {
      userId: true,
    },
  });

  if (!membership) {
    throw createError(
      "Conversation not found or access denied",
      404
    );
  }

  return user;
}

export async function sendMessage(
  firebaseUid,
  conversationId,
  { content, clientMessageId }
) {
  const user = await getConversationMember(
    firebaseUid,
    conversationId
  );

  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw createError("Message content cannot be empty", 400);
  }

  if (normalizedContent.length > MESSAGE_MAX_LENGTH) {
    throw createError(
      `Message cannot exceed ${MESSAGE_MAX_LENGTH} characters`,
      400
    );
  }

  if (
    clientMessageId !== undefined &&
    (typeof clientMessageId !== "string" ||
      clientMessageId.length === 0 ||
      clientMessageId.length > 100)
  ) {
    throw createError("Invalid clientMessageId", 400);
  }

  // Make client retries idempotent.
  if (clientMessageId) {
    const existingMessage = await prisma.message.findFirst({
      where: {
        senderId: user.id,
        clientMessageId,
      },
      include: {
        sender: {
          select: {
            id: true,
            profile: true,
          },
        },
      },
    });

    if (existingMessage) {
      if (existingMessage.conversationId !== conversationId) {
        throw createError(
          "clientMessageId has already been used",
          409
        );
      }

      return existingMessage;
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId: user.id,
          content: normalizedContent,
          clientMessageId: clientMessageId ?? null,
        },
        include: {
          sender: {
            select: {
              id: true,
              profile: true,
            },
          },
        },
      });

      // Keep the conversation list sorted by recent activity.
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return message;
    });
  } catch (error) {
    // A concurrent retry might have inserted the same message.
    if (error.code === "P2002" && clientMessageId) {
      const existingMessage = await prisma.message.findFirst({
        where: {
          senderId: user.id,
          clientMessageId,
        },
        include: {
          sender: {
            select: {
              id: true,
              profile: true,
            },
          },
        },
      });

      if (existingMessage?.conversationId === conversationId) {
        return existingMessage;
      }
    }

    throw error;
  }
}

export async function getConversationMessages(
  firebaseUid,
  conversationId,
  { limit = 50, before }
) {
  await getConversationMember(firebaseUid, conversationId);

  if (before !== undefined) {
    const cursorMessage = await prisma.message.findFirst({
      where: {
        id: before,
        conversationId,
      },
      select: { id: true },
    });

    if (!cursorMessage) {
      throw createError("Invalid message cursor", 400);
    }
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit,
    ...(before
      ? {
          cursor: { id: before },
          skip: 1,
        }
      : {}),
    include: {
      sender: {
        select: {
          id: true,
          profile: true,
        },
      },
    },
  });

  // Return messages oldest-to-newest for easy chat rendering.
  return messages.reverse();
}
