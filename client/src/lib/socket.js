
import { io } from "socket.io-client";
import { auth } from "../config/firebase.js";

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

export async function connectSocket() {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("Please sign in before connecting to chat.");
    }

    // Get a current Firebase ID token.
    const token = await user.getIdToken();

    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            auth: { token },
        });
    } else {
        // Refresh the token supplied in the next handshake.
        socket.auth = { token };
    }

    if (!socket.connected) {
        socket.connect();
    }

    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
    }
}
