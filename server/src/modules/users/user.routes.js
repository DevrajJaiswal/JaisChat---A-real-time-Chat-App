
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
  syncCurrentUser,
  discoverUsers,
} from "./user.controller.js";
import {
  getMe,
  saveMyProfile,
} from "./profile.controller.js";

const router = Router();

router.post("/sync", requireAuth, syncCurrentUser);
router.get("/me", requireAuth, getMe);
router.put("/me/profile", requireAuth, saveMyProfile);
router.get("/search", requireAuth, discoverUsers);

export default router;
