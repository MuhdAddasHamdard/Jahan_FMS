import bcrypt from "bcrypt";
import prisma from "../prisma";
import { ROLES } from "../constants/roles";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  permissions: true,
  avatarUrl: true,
  createdAt: true,
};

export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: publicUserSelect,
  });

  return users;
};

export const getTeachers = async () => {
  const teachers = await prisma.user.findMany({
    where: { role: ROLES.TEACHER },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return teachers;
};

export const createUserService = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const user = await prisma.user.create({
    data: {
      ...userData,
      email: userData.email.trim().toLowerCase(),
      password: hashedPassword,
    },
    select: publicUserSelect,
  });

  return user;
};

export const loginUserService = async (email, password) => {
  const [user] = await prisma.$queryRaw`
    SELECT *
    FROM "User"
    WHERE LOWER("email") = LOWER(${email.trim()})
    LIMIT 1
  `;
  if (!user) {
    await bcrypt.hash(password, 10);
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
    permissions: user.permissions,
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
    email: email !== undefined ? String(email).trim().toLowerCase() : undefined,
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
    email: profileData.email !== undefined
      ? String(profileData.email).trim().toLowerCase()
      : undefined,
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
    select: { id: true, role: true },
  });

  if (!existing) {
    return null;
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data: {
      role,
      ...(role === ROLES.ADMIN || existing.role === ROLES.ADMIN
        ? { permissions: [] }
        : {}),
    },
    select: publicUserSelect,
  });

  return user;
};

export const updateUserPermissions = async (id, permissions) => {
  const existing = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: { id: true, role: true },
  });

  if (!existing) {
    return null;
  }

  if (existing.role === ROLES.ADMIN) {
    return { error: "ADMIN_PERMISSIONS_IMMUTABLE" };
  }

  return prisma.user.update({
    where: { id: Number(id) },
    data: { permissions },
    select: publicUserSelect,
  });
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
