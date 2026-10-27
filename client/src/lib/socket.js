
import { io } from "socket.io-client";
import { auth } from "../config/firebase.js";

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

if (import.meta.env.DEV && typeof window !== "undefined") {
    window.__jaischatSocket = {
        disconnect: () => socket?.disconnect(),
        reconnect: () => socket?.connect(),
    };
}

export async function connectSocket() {
    if (!auth.currentUser) {
        throw new Error("Please sign in before connecting to chat.");
    }

    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,

            auth: async (callback) => {
                try {
                    const user = auth.currentUser;

                    if (!user) {
                        callback({ token: "" });
                        return;
                    }

                    const token = await user.getIdToken();

                    callback({ token });
                } catch (error) {
                    console.error(
                        "Unable to refresh socket token:",
                        error
                    );

                    callback({ token: "" });
                }
            },
        });

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
        });

        socket.on("connect_error", (error) => {
            console.error(
                "Socket connection failed:",
                error.message
            );
        });

        socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
        });
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
