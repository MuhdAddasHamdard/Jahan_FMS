import bcrypt from "bcrypt";
import prisma from "../prisma";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
};

export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: publicUserSelect,
  });

  return users;
};

export const createUserService = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const user = await prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword,
    },
    select: publicUserSelect,
  });

  return user;
};

export const loginUserService = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (!user) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: {
      id: Number(id),
    },
    select: publicUserSelect,
  });
  return user;
};

export const updateCurrentUserService = async (userId, profileData) => {
  const { name, email, avatarUrl } = profileData;
  const data = {
    name: name !== undefined ? String(name).trim() : undefined,
    email: email !== undefined ? String(email).trim() : undefined,
    avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
  };

  if (profileData.password) {
    data.password = await bcrypt.hash(profileData.password, 10);
  }

  const user = await prisma.user.update({
    where: { id: Number(userId) },
    data,
    select: publicUserSelect,
  });

  return user;
};

export const verifyCurrentPassword = async (userId, password) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { password: true },
  });

  if (!user) {
    return false;
  }

  return bcrypt.compare(password, user.password);
};

export const updateUserService = async (id, profileData) => {
  const existing = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const data = {
    name: profileData.name !== undefined ? String(profileData.name).trim() : undefined,
    email: profileData.email !== undefined ? String(profileData.email).trim() : undefined,
  };

  if (profileData.password) {
    data.password = await bcrypt.hash(profileData.password, 10);
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data,
    select: publicUserSelect,
  });

  return user;
};

export const updateUserRole = async (id, role) => {
  const existing = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data: { role },
    select: publicUserSelect,
  });

  return user;
};

export const deleteUser = async (id) => {
  const existing = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  await prisma.user.delete({
    where: { id: Number(id) },
  });

  return true;
};
