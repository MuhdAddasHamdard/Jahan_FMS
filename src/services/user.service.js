import prisma from "../prisma";

export const getAllUsers = async () => {
  const users = await prisma.user.findMany();

  return users;
};

export const createUserService = async (userData) => {
  const user = await prisma.user.create({
    data: userData,
  });

  return user;
};
