
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";

import {
  createDirectConversation,
  getConversations,
} from "./conversation.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/direct", createDirectConversation);
router.get("/", getConversations);

export default router;
