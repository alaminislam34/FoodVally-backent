import bcrypt from "bcryptjs";
import { Prisma, UserStatus } from "@prisma/client";
import prisma from "../../utils/prisma.js";
import AppError from "../../errors/AppError.js";

const createUserIntoDB = async (payload: any) => {
  const result = await prisma.user.create({ data: payload });
  // remove sensitive fields
  const { password: _, otp: __, ...userData } = result as any;
  return userData;
};

const getProfile = async (userId: string) => {
  if (!userId) {
    throw new AppError(400, "User id is required");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      avatar: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

const allUsers = async (payload: any) => {
  const userExist = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!userExist) {
    throw new AppError(401, "Unauthorized access");
  }

  const search =
    typeof payload?.search === "string" ? payload.search.trim() : "";
  const page = Number(payload?.page ?? 1);
  const limit = Number(payload?.limit ?? 10);
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput | undefined = search
    ? {
        OR: [
          {
            username: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            name: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            email: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }
    : undefined;

  const findManyArgs: Prisma.UserFindManyArgs = {
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      avatar: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      username: true,
    },
  };

  const countArgs: Prisma.UserCountArgs = {};

  if (where) {
    findManyArgs.where = where;
    countArgs.where = where;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany(findManyArgs),
    prisma.user.count(countArgs),
  ]);

  return {
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const deleteUser = async (payload: { userId: string }) => {
  const { userId } = payload;
  const result = await prisma.user.delete({
    where: { id: userId },
  });
  return result;
};

const updateUser = async (userId: string, payload: any) => {
  if (!userId) {
    throw new AppError(400, "User id is required");
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (existingUser?.status === "PENDING") {
    throw new AppError(
      400,
      "Please verify your email before updating your profile",
    );
  }

  if (!existingUser) {
    throw new AppError(404, "User not found");
  }

  const updatePayload = { ...payload };
  if (updatePayload.password) {
    updatePayload.password = await bcrypt.hash(updatePayload.password, 12);
  }

  const result = await prisma.user.update({
    where: { id: userId },
    data: updatePayload,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

const updateStatus = async (userId: string, status: UserStatus) => {
  if (!userId) {
    throw new AppError(400, "User id is required");
  }
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!existingUser) {
    throw new AppError(404, "User not found");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { status },
  });
  return { message: "User status updated successfully" };
};


export const UserServices = {
  createUserIntoDB,
  getProfile,
  allUsers,
  deleteUser,
  updateUser,
  updateStatus,
};
