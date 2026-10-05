import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import prisma from "../prisma";
import { ROLES } from "../constants/roles";

const PASSWORD = "Password123!";

const DEMO_USERS = [
  { name: "Demo Admin", email: "admin-demo@fms.com", role: ROLES.ADMIN },
  { name: "Finance Officer", email: "finance-demo@fms.com", role: ROLES.FINANCE },
  { name: "John Teacher", email: "teacher-demo@fms.com", role: ROLES.TEACHER },
  { name: "Sarah Student", email: "student-demo@fms.com", role: ROLES.STUDENT },
];

const upsertUser = async (hash, demo) => {
  const existing = await prisma.user.findUnique({ where: { email: demo.email } });
  if (existing) {
    if (existing.role !== demo.role) {
      await prisma.user.update({ where: { email: demo.email }, data: { role: demo.role } });
      console.log(`updated ${demo.email} to ${demo.role}`);
    } else {
      console.log(`skip ${demo.email}`);
    }
    return existing;
  }
  const created = await prisma.user.create({
    data: { ...demo, password: hash },
  });
  console.log(`created ${demo.email} (${demo.role})`);
  return created;
};

const hash = await bcrypt.hash(PASSWORD, 10);

const admin = await upsertUser(hash, DEMO_USERS[0]);
const teacher = await upsertUser(hash, DEMO_USERS[2]);
const studentAccount = await upsertUser(hash, DEMO_USERS[3]);

const existingClasses = await prisma.class.count({ where: { userId: admin.id } });

if (existingClasses === 0) {
  const className = await prisma.class.create({
    data: {
      name: "Grade 10",
      section: "A",
      userId: admin.id,
      teacherId: teacher.id,
    },
  });

  await prisma.classSchedule.createMany({
    data: [
      { classId: className.id, dayOfWeek: 1, startTime: "08:00", endTime: "09:30", room: "Lab 1", userId: admin.id },
      { classId: className.id, dayOfWeek: 3, startTime: "10:00", endTime: "11:30", room: "Lab 1", userId: admin.id },
      { classId: className.id, dayOfWeek: 5, startTime: "13:00", endTime: "14:30", room: "Room 4", userId: admin.id },
    ],
  });

  await prisma.courseMaterial.createMany({
    data: [
      {
        classId: className.id,
        title: "Syllabus 2026",
        description: "Complete syllabus outline for the year",
        link: "https://example.com/syllabus",
        userId: teacher.id,
      },
      {
        classId: className.id,
        title: "Lecture 1 - Introduction",
        description: "Introductory lecture notes",
        link: "https://example.com/lecture-1",
        userId: teacher.id,
      },
    ],
  });

  const studentRows = [
    { admissionNo: "STD-DEMO-001", name: "Sarah Student", guardianName: "Mr. Ahmed", phone: "03001234567", email: "sarah@example.com", address: "House 1, Street 2", status: "ACTIVE" },
    { admissionNo: "STD-DEMO-002", name: "Ali Raza", guardianName: "Mrs. Raza", phone: "03009876543", email: "ali@example.com", address: "House 3, Street 4", status: "ACTIVE" },
    { admissionNo: "STD-DEMO-003", name: "Mariam Khan", guardianName: "Mr. Khan", phone: "03005554433", email: "mariam@example.com", address: "House 5, Street 6", status: "ACTIVE" },
  ];

  for (const row of studentRows) {
    await prisma.student.create({
      data: {
        ...row,
        classId: className.id,
        userId: admin.id,
      },
    });
  }

  const sarah = await prisma.student.findFirst({
    where: { admissionNo: "STD-DEMO-001", userId: admin.id },
  });
  await prisma.student.update({
    where: { id: sarah.id },
    data: { accountId: studentAccount.id },
  });

  const tuition = await prisma.feeType.create({
    data: { name: "Tuition Fee", amount: 15000, period: "MONTHLY", userId: admin.id },
  });
  await prisma.feeType.create({
    data: { name: "Session Fee", amount: 25000, period: "SESSION", userId: admin.id },
  });

  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), 1);
  const plan = await prisma.studentFee.create({
    data: {
      studentId: sarah.id,
      feeTypeId: tuition.id,
      totalAmount: 30000,
      installmentCount: 2,
      userId: admin.id,
      installments: {
        create: [
          { amount: 15000, dueDate: due, paidAmount: 15000, status: "PAID", paidAt: now, userId: admin.id },
          { amount: 15000, dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), status: "PARTIAL", paidAmount: 5000, paidAt: now, userId: admin.id },
        ],
      },
    },
    include: { installments: { orderBy: { dueDate: "asc" } } },
  });

  const receiptOne = await prisma.receipt.create({
    data: { number: `RC-PENDING-${randomUUID()}`, amount: 15000, paidAt: now, notes: "First installment", userId: admin.id },
  });
  const receiptTwo = await prisma.receipt.create({
    data: { number: `RC-PENDING-${randomUUID()}`, amount: 5000, paidAt: now, notes: "Partial second installment", userId: admin.id },
  });
  await prisma.receipt.update({ where: { id: receiptOne.id }, data: { number: "RC-000001" } });
  await prisma.receipt.update({ where: { id: receiptTwo.id }, data: { number: "RC-000002" } });

  await prisma.feeInstallment.update({
    where: { id: plan.installments[0].id },
    data: { receiptId: receiptOne.id },
  });
  await prisma.feeInstallment.update({
    where: { id: plan.installments[1].id },
    data: { receiptId: receiptTwo.id },
  });

  const staff = await prisma.staff.create({
    data: { staffNo: "STF-DEMO-001", name: "Ayesha Siddiqui", designation: "TEACHER", salary: 45000, email: "ayesha@example.com", userId: admin.id },
  });

  await prisma.salaryPayment.create({
    data: { staffId: staff.id, amount: 45000, periodMonth: "2026-09", paidOn: new Date(), notes: "Monthly salary", userId: admin.id },
  });

  await prisma.expense.createMany({
    data: [
      { description: "Electricity bill", amount: 8500, paidOn: new Date(), userId: admin.id },
      { description: "Lab equipment", amount: 22000, paidOn: new Date(Date.now() - 86400000), userId: admin.id },
      { description: "Stationery", amount: 3200, paidOn: new Date(Date.now() - 2 * 86400000), userId: admin.id },
    ],
  });

  console.log("institute demo data created");
} else {
  console.log("institute demo data already present, skipping");
}

await prisma.$disconnect();
console.log("seed complete");