
import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";

import app from "./app.js";
import { firebaseAuth } from "./config/firebase.js";
import { prisma } from "./config/prisma.js";
import { registerConversationSocketEvents } from "./modules/conversations/conversation.socket.js";
import { setIO } from "./socket/socket.js";

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

setIO(io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== "string") {
      return next(new Error("Authentication required"));
    }

    const decodedToken = await firebaseAuth.verifyIdToken(token);

    socket.data.auth = {
      uid: decodedToken.uid,
      phoneNumber: decodedToken.phone_number ?? null,
    };

    next();
  } catch (error) {
    console.error("Socket authentication failed:", error.message);
    next(new Error("Invalid or expired authentication token"));
  }
});

io.on("connection", async (socket) => {
  try {
    const firebaseUid = socket.data?.auth?.uid;

    if (!firebaseUid) {
      console.error(
        "Socket has no verified Firebase identity:",
        socket.id
      );
      socket.disconnect(true);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true },
    });

    if (!user) {
      console.error(
        "No database user found for Firebase UID:",
        firebaseUid
      );
      socket.disconnect(true);
      return;
    }

    socket.data.userId = user.id;

    const personalRoom = `user:${user.id}`;
    await socket.join(personalRoom);

    console.log("Socket authenticated:", socket.id);
    console.log("Database user ID:", user.id);
    console.log("Joined personal room:", personalRoom);

    registerConversationSocketEvents(io, socket);

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id, reason);
    });
  } catch (error) {
    console.error("Socket connection setup failed:", error);
    socket.disconnect(true);
  }
});

httpServer.listen(PORT, () => {
  console.log(`JaisChat API running on port ${PORT}`);
});
