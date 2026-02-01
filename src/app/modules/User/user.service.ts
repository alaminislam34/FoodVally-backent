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

const allUsers = async () => {
  const users = await prisma.user.findMany({
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
  });
  return users;
};

const deleteUser = async (payload: { userId: string }) => {
  const { userId } = payload;
  const result = await prisma.user.delete({
    where: { id: userId },
  });
  return result;
};

export const UserServices = {
  createUserIntoDB,
  getProfile,
  allUsers,
  deleteUser,
};
