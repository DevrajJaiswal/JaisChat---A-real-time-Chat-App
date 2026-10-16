
import { prisma } from "../../config/prisma.js";

function createDirectKey(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join(":");
}

export async function createOrGetDirectConversation(
  firebaseUid,
  targetUserId
) {
  const currentUser = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });

  if (!currentUser) {
    const error = new Error("User not synchronized");
    error.statusCode = 404;
    throw error;
  }

  if (currentUser.id === targetUserId) {
    const error = new Error("You cannot start a conversation with yourself");
    error.statusCode = 400;
    throw error;
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!targetUser) {
    const error = new Error("Target user not found");
    error.statusCode = 404;
    throw error;
  }

  const directKey = createDirectKey(currentUser.id, targetUser.id);

  const existing = await prisma.conversation.findUnique({
    where: { directKey },
    include: {
      members: {
        include: {
            user: {
                select: {
                    id: true,
                    profile: true,
                },
            },
        },
      },
    },
  });

  if (existing) {
    return existing;
  }

  try {
    return await prisma.conversation.create({
      data: {
        type: "DIRECT",
        directKey,
        members: {
          create: [
            { userId: currentUser.id },
            { userId: targetUser.id },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
                select: {
                    id: true,
                    profile: true,
                },
            },
          },
        },
      },
    });
  } catch (error) {
    // A concurrent request may have created this direct conversation.
    if (error.code === "P2002") {
      const conversation = await prisma.conversation.findUnique({
        where: { directKey },
        include: {
          members: {
            include: {
                user: {
                    select: {
                        id: true,
                        profile: true,
                    },
                },
            },
          },
        },
      });

      if (conversation) {
        return conversation;
      }
    }

    throw error;
  }
}

export async function listUserConversations(firebaseUid) {
  const user = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });

  if (!user) {
    const error = new Error("User not synchronized");
    error.statusCode = 404;
    throw error;
  }

  return prisma.conversation.findMany({
    where: {
      members: {
        some: { userId: user.id },
      },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      members: {
        include: {
            user: {
                select: {
                    id: true,
                    profile: true,
                },
            },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}
