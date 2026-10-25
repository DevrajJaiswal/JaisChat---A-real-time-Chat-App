
import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import { firebaseAuth } from "./config/firebase.js";
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

// Authenticate every new Socket.IO connection.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== "string") {
      return next(new Error("Authentication required"));
    }

    const decodedToken = await firebaseAuth.verifyIdToken(token);

    // Store verified identity on this socket.
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

io.on("connection", (socket) => {
  console.log(
    `Authenticated socket connected: ${socket.id}, user: ${socket.data.auth.uid}`
  );

  registerConversationSocketEvents(io, socket);

  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnected: ${socket.id}`, reason);
  });
});

httpServer.listen(PORT, () => {
  console.log(`JaisChat API running on port ${PORT}`);
});
