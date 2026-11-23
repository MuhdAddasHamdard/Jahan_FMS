import prisma from "../prisma";

export const offlineModes = ["ALL_DEVICES", "TRUSTED_DEVICES", "DISABLED"];
export const isDeviceId = (value) =>
  typeof value === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value);

const policyFields = { offlineMode: true, offlineMaxDays: true };
const getPolicy = async () =>
  await prisma.instituteSettings.findUnique({ where: { id: 1 }, select: policyFields }) ??
  { offlineMode: "ALL_DEVICES", offlineMaxDays: 7 };

export const getOfflineAccess = async (userId, deviceId) => {
  const { offlineMode, offlineMaxDays } = await getPolicy();
  const device = isDeviceId(deviceId) && await prisma.offlineDevice.findUnique({
    where: { userId_deviceId: { userId, deviceId } },
    select: { trusted: true },
  });
  return {
    allowed: isDeviceId(deviceId) && (offlineMode === "ALL_DEVICES" || (offlineMode === "TRUSTED_DEVICES" && Boolean(device?.trusted))),
    registered: Boolean(device),
    maxDays: offlineMaxDays,
  };
};

export const getOfflineAdministration = async () => {
  const [policy, devices] = await Promise.all([
    getPolicy(),
    prisma.offlineDevice.findMany({
      select: {
        userId: true, deviceId: true, label: true, registeredAt: true, trusted: true,
        user: { select: { name: true, email: true, deactivatedAt: true } },
      },
      orderBy: { registeredAt: "desc" },
    }),
  ]);
  return { ...policy, devices };
};

export const setOfflinePolicy = (offlineMode, offlineMaxDays) => prisma.instituteSettings.upsert({
  where: { id: 1 },
  update: { offlineMode, offlineMaxDays },
  create: { id: 1, offlineMode, offlineMaxDays },
  select: policyFields,
});

export const registerOfflineDevice = (userId, deviceId, label) => prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(601025, ${userId}::integer)`;
  const where = { userId_deviceId: { userId, deviceId } };
  if (await tx.offlineDevice.findUnique({ where, select: { trusted: true } })) return true;
  if (await tx.offlineDevice.count({ where: { userId } }) >= 50) return false;
  await tx.offlineDevice.create({ data: { userId, deviceId, label } });
  return true;
});

export const setDeviceTrust = (userId, deviceId, trusted) => prisma.$transaction(async (tx) => {
  // Keep approval changes ordered with account deactivation.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('accounts-administration')::bigint)`;
  const { count } = await tx.offlineDevice.updateMany({
    where: { userId, deviceId, ...(trusted ? { user: { deactivatedAt: null } } : {}) },
    data: { trusted },
  });
  return count > 0;
});
