
import { prisma } from "../../config/prisma.js";

export async function syncUser(firebaseUser) {
  const { uid, phone_number } = firebaseUser;

  const user = await prisma.user.upsert({
    where: {
      firebaseUid: uid,
    },

    create: {
      firebaseUid: uid,
      phoneNumber: phone_number ?? null,
    },

    update: phone_number
      ? { phoneNumber: phone_number }
      : {},

    include: {
      profile: true,
    },
  });

  return user;
}

export async function searchUsers(firebaseUid, searchTerm) {
  const users = await prisma.user.findMany({
    where: {
      firebaseUid: {
        not: firebaseUid,
      },

      profile: {
        is: {
          OR: [
            {
              username: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
            {
              displayName: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    },

    select: {
      id: true,
      profile: {
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
          about: true,
        },
      },
    },

    take: 20,
  });

  return users;
}
