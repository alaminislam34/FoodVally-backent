import express from "express";
import { UserControllers } from "./user.controller.js";

const router = express.Router();

router.post("/create-user", UserControllers.createUser);
router.get("/me", UserControllers.getProfile);
router.get("/", UserControllers.allUsers);
router.delete("/user-delete", UserControllers.deleteUser);

export const UserRoutes = router;
