
import { prisma } from "../../config/prisma.js";

export async function getCurrentUser(firebaseUid) {
  return prisma.user.findUnique({
    where: {
      firebaseUid,
    },
    include: {
      profile: true,
    },
  });
}

export async function upsertUserProfile(firebaseUid, data) {
  const user = await prisma.user.findUnique({
    where: {
      firebaseUid,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    const error = new Error("User not synchronized");
    error.statusCode = 404;
    throw error;
  }

  return prisma.profile.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      username: data.username,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl ?? null,
      about: data.about ?? null,
    },
    update: {
      username: data.username,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl ?? null,
      about: data.about ?? null,
    },
  });
}
