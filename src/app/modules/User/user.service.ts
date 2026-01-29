// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

const createUserIntoDB = async (payload: any) => {
  // const result = await prisma.user.create({
  //   data: payload,
  // });
  // return result;
  return { ...payload, id: 'mock-id' }; // Mock return until prisma generate is run
};

export const UserServices = {
  createUserIntoDB,
};
