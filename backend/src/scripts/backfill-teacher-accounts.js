import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import prisma from "../prisma";
import { ROLES } from "../constants/roles";

const backfill = async () => {
  const staff = await prisma.staff.findMany({
    where: { designation: "TEACHER" },
    select: { id: true, name: true, email: true },
    orderBy: { id: "asc" },
  });

  let created = 0;
  let skipped = 0;

  for (const member of staff) {
    const email = member.email ? String(member.email).trim() : "";

    if (!email) {
      skipped += 1;
      console.log(`skip staff #${member.id} ${member.name} (no email)`);
      continue;
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      console.log(`skip ${email} (login already exists)`);
      continue;
    }

    const password = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
    await prisma.user.create({
      data: { name: member.name, email, role: ROLES.TEACHER, password },
    });
    created += 1;
    console.log(`created ${email} (TEACHER)`);
  }

  console.log(`\nDone. created=${created} skipped=${skipped}`);
};

backfill()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
