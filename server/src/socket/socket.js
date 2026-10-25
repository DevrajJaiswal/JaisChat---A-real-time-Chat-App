
let io;

export function setIO(socketServer) {
  io = socketServer;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized.");
  }

  return io;
}
