import prisma from "../prisma";

export const getInstituteSettings = async () => {
  let settings = await prisma.instituteSettings.findUnique({ where: { id: 1 } });

  if (!settings) {
    settings = await prisma.instituteSettings.create({ data: { id: 1 } });
  }

  return settings;
};

export const updateInstituteSettings = async (data) => {
  const settings = await prisma.instituteSettings.upsert({
    where: { id: 1 },
    update: {
      name: data.name !== undefined ? String(data.name).trim() : undefined,
      tagline: data.tagline !== undefined ? String(data.tagline).trim() : data.tagline,
      email: data.email !== undefined ? String(data.email).trim() : data.email,
      phone: data.phone !== undefined ? String(data.phone).trim() : data.phone,
      address: data.address !== undefined ? String(data.address).trim() : data.address,
    },
    create: { id: 1 },
  });

  return settings;
};