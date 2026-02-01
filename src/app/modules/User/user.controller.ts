import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserServices } from "./user.service.js";
import catchAsync from "src/app/utils/catchAsync.js";
import config from "../../config/index.js";
import AppError from "../../errors/AppError.js";

const createUser = async (req: Request, res: Response) => {
  try {
    const result = await UserServices.createUserIntoDB(req.body);

    res.status(200).json({
      success: true,
      message: "User is created successfully",
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Something went wrong",
      error: err,
    });
  }
};

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const authHeaders = req.headers.authorization;
  if (!authHeaders || !authHeaders.startsWith("Bearer ")) {
    throw new AppError(401, "Unauthorized");
  }
  const token = authHeaders.split(" ")[1];
  if (!token) {
    throw new AppError(401, "Unauthorized");
  }
  if (!config.jwt_access_secret) {
    throw new AppError(500, "Server configuration error");
  }
  let payload: any;
  try {
    payload = jwt.verify(token, config.jwt_access_secret);
  } catch (error) {
    throw new AppError(401, "Invalid or expired token");
  }

  const result = await UserServices.getProfile(payload.userId);

  res.status(200).json({
    success: true,
    message: "Profile fetched successfully",
    data: result,
  });
});

const allUsers = catchAsync(async (req: Request, res: Response) => {
  const authHeaders = req.headers.authorization;
  if (!authHeaders || !authHeaders.startsWith("Bearer ")) {
    throw new AppError(401, "Unauthorized");
  }
  const token = authHeaders.split(" ")[1];
  if (!token) {
    throw new AppError(401, "Unauthorized");
  }
  if (!config.jwt_access_secret) {
    throw new AppError(500, "Server configuration error");
  }
  let payload: any;
  try {
    payload = jwt.verify(token, config.jwt_access_secret);
  } catch (error) {
    throw new AppError(401, "Invalid or expired token");
  }

  if (payload.role !== "ADMIN") {
    throw new AppError(403, "Unauthorized access");
  }

  const result = await UserServices.allUsers();

  res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.body;
  const headers = req.headers.authorization;
  if (!headers || !headers.startsWith("Bearer ")) {
    throw new AppError(401, "Unauthorized");
  }
  if (!userId) {
    throw new AppError(400, "User id is required");
  }
  const token = headers.split(" ")[1];
  if (!token) {
    throw new AppError(400, "Access token is required");
  }
  if (!config.jwt_access_secret) {
    throw new AppError(500, "Server configuration error");
  }
  let payload: any;
  try {
    payload = jwt.verify(token, config.jwt_access_secret);
  } catch (error) {
    throw new AppError(401, "Invalid or expired token");
  }

  if (payload.role !== "ADMIN") {
    throw new AppError(403, "Unauthorized access");
  }

  await UserServices.deleteUser(payload);

  res.status(200).json({
    success: true,
    message: "User deleted successful",
  });
});
export const UserControllers = {
  createUser,
  getProfile,
  allUsers,
  deleteUser,
};
