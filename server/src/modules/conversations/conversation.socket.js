
import { prisma } from "../../config/prisma.js";

const isValidUuid = (value) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
    );

const getConversationRoom = (conversationId) =>
    `conversation:${conversationId}`;

export function registerConversationSocketEvents(io, socket) {
    socket.on("conversation:join", async (payload, acknowledge) => {
        const reply =
            typeof acknowledge === "function" ? acknowledge : () => { };

        try {
            const conversationId = payload?.conversationId;

            if (!isValidUuid(conversationId)) {
                return reply({
                    success: false,
                    message: "A valid conversation ID is required.",
                });
            }

            // Identity comes from the verified Firebase token.
            const firebaseUid = socket.data.auth.uid;

            // Map the Firebase identity to our internal database user.
            const user = await prisma.user.findUnique({
                where: { firebaseUid },
                select: { id: true },
            });

            if (!user) {
                return reply({
                    success: false,
                    message: "User account was not found.",
                });
            }

            // Verify that this user belongs to the requested conversation.
            const membership = await prisma.conversationMember.findUnique({
                where: {
                    conversationId_userId: {
                        conversationId,
                        userId: user.id,
                    },
                },
                select: { userId: true },
            });

            if (!membership) {
                return reply({
                    success: false,
                    message: "You are not a member of this conversation.",
                });
            }

            // Only authorized sockets can join this room.
            await socket.join(getConversationRoom(conversationId));

            console.log(
                `Socket ${socket.id} joined conversation ${conversationId}`
            );

            return reply({
                success: true,
                conversationId,
            });
        } catch (error) {
            console.error("Conversation room join failed:", error);

            return reply({
                success: false,
                message: "Unable to join conversation.",
            });
        }
    });

    socket.on("conversation:leave", (payload, acknowledge) => {
        const reply =
            typeof acknowledge === "function" ? acknowledge : () => { };

        const conversationId = payload?.conversationId;

        if (!isValidUuid(conversationId)) {
            return reply({
                success: false,
                message: "A valid conversation ID is required.",
            });
        }

        socket.leave(getConversationRoom(conversationId));

        return reply({
            success: true,
            conversationId,
        });
    });
}
