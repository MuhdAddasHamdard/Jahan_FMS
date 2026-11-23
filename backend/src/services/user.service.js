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
  deactivatedAt: true,
};

export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: publicUserSelect,
  });

  return users;
};

export const getTeachers = async () => {
  const teachers = await prisma.user.findMany({
    where: { role: ROLES.TEACHER, deactivatedAt: null },
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
  if (!isPasswordValid || user.deactivatedAt) {
    return null;
  }

  return {
    user: Object.fromEntries(Object.keys(publicUserSelect).map((field) => [field, user[field]])),
    sessionVersion: user.sessionVersion,
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

export const updateCurrentUserService = async (userId, profileData, sessionVersion) => {
  const { name, email, avatarUrl } = profileData;
  const data = {
    name: name !== undefined ? String(name).trim() : undefined,
    email: email !== undefined ? String(email).trim().toLowerCase() : undefined,
    avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
  };

  if (profileData.password) {
    data.password = await bcrypt.hash(profileData.password, 10);
    data.sessionVersion = { increment: 1 };
  }

  const user = await prisma.user.update({
    where: { id: Number(userId), sessionVersion, deactivatedAt: null },
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
    data.sessionVersion = { increment: 1 };
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data,
    select: publicUserSelect,
  });

  return user;
};

const activeAdmin = { role: ROLES.ADMIN, deactivatedAt: null };

const manageAccount = (actor, id, change) => prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('accounts-administration')::bigint)`;
  const authorized = await tx.user.findUnique({
    where: { id: actor.id, ...activeAdmin, sessionVersion: actor.sessionVersion },
    select: { id: true },
  });
  if (!authorized) return { error: "ADMIN_SESSION_CHANGED" };
  const target = await tx.user.findUnique({ where: { id: Number(id) }, select: publicUserSelect });
  return target ? change(tx, target) : null;
});

const isLastAdmin = async (tx, target) =>
  target.role === ROLES.ADMIN && !target.deactivatedAt && (await tx.user.count({ where: activeAdmin })) === 1;

export const updateUserRole = (actor, id, role) => manageAccount(actor, id, async (tx, target) => {
  if (target.role === role) return target;
  if (role !== ROLES.ADMIN && await isLastAdmin(tx, target)) return { error: "LAST_ADMIN" };
  return tx.user.update({
    where: { id: target.id },
    data: {
      role,
      ...(role === ROLES.ADMIN || target.role === ROLES.ADMIN ? { permissions: [] } : {}),
    },
    select: publicUserSelect,
  });
});

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

export const setAccountActive = (actor, id, active) => manageAccount(actor, id, async (tx, target) => {
  if (!active && target.id === actor.id) return { error: "SELF_DEACTIVATION" };
  if (!active && await isLastAdmin(tx, target)) return { error: "LAST_ADMIN" };
  if (active === !target.deactivatedAt) return target;
  if (!active) await tx.offlineDevice.updateMany({ where: { userId: target.id }, data: { trusted: false } });
  return tx.user.update({
    where: { id: target.id },
    data: { deactivatedAt: active ? null : new Date(), sessionVersion: { increment: 1 } },
    select: publicUserSelect,
  });
});
