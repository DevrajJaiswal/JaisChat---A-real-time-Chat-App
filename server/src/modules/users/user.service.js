
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
