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

  const { search, page, limit } = req.query as Record<
    string,
    string | undefined
  >;
  const pageNumber = page ? Number(page) : 1;
  const limitNumber = limit ? Number(limit) : 10;

  if (Number.isNaN(pageNumber) || pageNumber < 1) {
    throw new AppError(400, "Page must be a positive number");
  }
  if (Number.isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
    throw new AppError(400, "Limit must be between 1 and 100");
  }

  const result = await UserServices.allUsers({
    ...payload,
    search,
    page: pageNumber,
    limit: limitNumber,
  });

  res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: result.data,
    meta: result.meta,
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

const updateUser = catchAsync(async (req: Request, res: Response) => {
  const headers = req.headers.authorization;
  if (!headers || !headers.startsWith("Bearer ")) {
    throw new AppError(401, "Unauthorized");
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

  const { userId, ...updateData } = req.body ?? {};
  if (!updateData || Object.keys(updateData).length === 0) {
    throw new AppError(400, "Update data is required");
  }

  const isAdmin = payload.role === "ADMIN";
  if (!isAdmin && userId && userId !== payload.userId) {
    throw new AppError(403, "Unauthorized access");
  }

  const allowedFields = isAdmin
    ? ["name", "username", "phone", "avatar", "role", "status"]
    : ["name", "username", "phone", "avatar", "password"];

  const filteredData = Object.fromEntries(
    Object.entries(updateData).filter(([key]) => allowedFields.includes(key)),
  );

  if (Object.keys(filteredData).length === 0) {
    throw new AppError(400, "No valid fields to update");
  }

  const targetUserId = isAdmin ? userId || payload.userId : payload.userId;

  const result = await UserServices.updateUser(targetUserId, filteredData);

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: result,
  });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const { userId, status } = req.body;
  if (!userId) {
    throw new AppError(400, "User id is required");
  }
  if (!status) {
    throw new AppError(400, "Status is required");
  }
  const result = await UserServices.updateStatus(userId, status);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const UserControllers = {
  createUser,
  getProfile,
  allUsers,
  deleteUser,
  updateUser,
  updateStatus,
};
