import { ROLES } from "../constants/roles";
import { businessErrorToResponse } from "../utils/errors";
import { getAllStudents } from "./student.service";
import {
  getAllClasses,
  createClass,
  createClassSchedule,
  createCourseMaterial,
} from "./class.service";
import {
  getAllFeeTypes,
  getAllFeePlans,
  getFeePlanById,
  createFeeType,
  createFeePlan,
  collectFeePayment,
} from "./fee.service";
import { createExpense } from "./expense.service";
import { createRefund } from "./refund.service";
import { getTeachers, createUserService } from "./user.service";
import { createStaff } from "./staff.service";

const OFFICE = [ROLES.ADMIN, ROLES.FINANCE];
const CLASS_ROLES = [ROLES.ADMIN, ROLES.FINANCE, ROLES.TEACHER];

const def = (name, description, properties, required = []) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});

const dateProp = {
  type: "string",
  description: "Date in YYYY-MM-DD format. Defaults to today.",
};

const findStudent = async (user, { studentId, studentName }) => {
  const students = await getAllStudents(user.id, user.role);
  if (studentId) {
    return students.find((student) => student.id === Number(studentId)) ?? null;
  }
  const query = String(studentName ?? "").trim().toLowerCase();
  if (!query) return null;
  return (
    students.find((student) => student.name.toLowerCase() === query) ??
    students.find((student) => student.name.toLowerCase().includes(query)) ??
    students.find((student) =>
      String(student.admissionNo ?? "").toLowerCase().includes(query),
    ) ??
    null
  );
};

const TOOLS = {
  find_students: {
    roles: CLASS_ROLES,
    definition: def(
      "find_students",
      "Look up students by name or admission number to get their ids. Always call this before an action that needs a studentId.",
      {
        query: {
          type: "string",
          description: "Name or admission number to search for. Empty returns all visible students.",
        },
      },
    ),
    execute: async ({ user, args }) => {
      const students = await getAllStudents(user.id, user.role);
      const query = String(args.query ?? "").trim().toLowerCase();
      const matches = (
        query
          ? students.filter(
              (student) =>
                student.name.toLowerCase().includes(query) ||
                String(student.admissionNo ?? "").toLowerCase().includes(query),
            )
          : students
      )
        .slice(0, 10)
        .map((student) => ({
          id: student.id,
          name: student.name,
          admissionNo: student.admissionNo,
          class: student.class ? student.class.name : null,
          status: student.status,
        }));

      return {
        payload: matches.length
          ? { students: matches }
          : { students: [], note: "No student matched that search." },
      };
    },
  },

  list_classes: {
    roles: CLASS_ROLES,
    definition: def(
      "list_classes",
      "List the classes you can see, with their ids. Call this before an action that needs a classId.",
      {},
    ),
    execute: async ({ user }) => {
      const classes = await getAllClasses(user.id, user.role);
      return {
        payload: {
          classes: classes.slice(0, 20).map((classRecord) => ({
            id: classRecord.id,
            name: classRecord.name,
            section: classRecord.section,
            teacher: classRecord.teacher ? classRecord.teacher.name : null,
            studentCount: classRecord.studentCount,
          })),
        },
      };
    },
  },

  list_fee_types: {
    roles: OFFICE,
    definition: def(
      "list_fee_types",
      "List fee types with their ids. Call this before creating a fee plan.",
      {},
    ),
    execute: async ({ user }) => {
      const feeTypes = await getAllFeeTypes(user.id);
      return {
        payload: {
          feeTypes: feeTypes.slice(0, 30).map((feeType) => ({
            id: feeType.id,
            name: feeType.name,
            amount: feeType.amount,
            period: feeType.period,
          })),
        },
      };
    },
  },

  list_payment_dues: {
    roles: OFFICE,
    definition: def(
      "list_payment_dues",
      "Show the unpaid installments for a student, with the installmentId needed to record a receipt.",
      {
        studentId: { type: "number", description: "Student id from find_students" },
        studentName: { type: "string", description: "Student name if id is not known yet" },
      },
    ),
    execute: async ({ user, args }) => {
      const student = await findStudent(user, args);
      if (!student) {
        return { payload: { error: "No student matched. Run find_students first." } };
      }

      const plans = (await getAllFeePlans(user.id)).filter(
        (plan) => plan.student.id === student.id,
      );
      if (!plans.length) {
        return {
          payload: {
            student: { id: student.id, name: student.name },
            dues: [],
            note: "This student has no fee plans yet.",
          },
        };
      }

      const dues = [];
      for (const plan of plans.slice(0, 5)) {
        const detail = await getFeePlanById(user.id, plan.id);
        if (!detail) continue;
        dues.push({
          planId: detail.id,
          feeType: detail.feeType.name,
          installments: detail.installments
            .filter(
              (installment) =>
                Number(installment.amount) - Number(installment.paidAmount) > 0,
            )
            .map((installment) => ({
              installmentId: installment.id,
              dueDate: installment.dueDate,
              amount: Number(installment.amount),
              remaining: Number(installment.amount) - Number(installment.paidAmount),
              status: installment.status,
            })),
        });
      }

      return {
        payload: {
          student: { id: student.id, name: student.name, admissionNo: student.admissionNo },
          dues,
        },
      };
    },
  },

  create_class: {
    roles: CLASS_ROLES,
    isAction: true,
    definition: def(
      "create_class",
      "Create a class. A class must have a teacher: admin and finance must pass a teacherId from list_teachers, while a teacher is assigned to their own new class automatically.",
      {
        name: { type: "string", description: "Class name, for example Grade 7" },
        section: { type: "string", description: "Optional section, for example A" },
        teacherId: {
          type: "number",
          description: "Teacher id from list_teachers (required for admin and finance)",
        },
      },
      ["name"],
    ),
    execute: async ({ user, args }) => {
      const result = await createClass(user.id, user.role, {
        name: String(args.name ?? "").trim(),
        section: args.section,
        teacherId: args.teacherId,
      });
      if (result?.error) return { error: result.error };
      return {
        summary: `Class "${result.name}"${
          result.section ? ` (Section ${result.section})` : ""
        } created`,
        payload: result,
      };
    },
  },

  list_teachers: {
    roles: CLASS_ROLES,
    definition: def(
      "list_teachers",
      "List teacher accounts with their ids. Call this before assigning a teacher to a class.",
      {},
    ),
    execute: async () => {
      const teachers = await getTeachers();
      return {
        payload: {
          teachers: teachers.slice(0, 30).map((teacher) => ({
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
          })),
        },
      };
    },
  },

  create_teacher: {
    roles: OFFICE,
    isAction: true,
    definition: def(
      "create_teacher",
      "Create a teacher login account. Once created the teacher can be assigned to classes.",
      {
        name: { type: "string" },
        email: { type: "string", description: "Sign-in email, must be unique" },
        password: { type: "string", description: "At least 8 characters" },
      },
      ["name", "email", "password"],
    ),
    execute: async ({ args }) => {
      const password = String(args.password ?? "");
      if (password.length < 8) {
        return { error: "USER_PASSWORD_TOO_SHORT" };
      }

      try {
        const teacher = await createUserService({
          name: String(args.name ?? "").trim(),
          email: String(args.email ?? "").trim(),
          password,
          role: ROLES.TEACHER,
        });
        return {
          summary: `Teacher account created for ${teacher.name} (${teacher.email})`,
          payload: teacher,
        };
      } catch (error) {
        if (error?.code === "P2002") {
          return { error: "USER_EMAIL_EXISTS" };
        }
        throw error;
      }
    },
  },

  create_staff: {
    roles: OFFICE,
    isAction: true,
    definition: def(
      "create_staff",
      "Add a staff member for payroll. A TEACHER with an email also gets a login account that can be assigned to classes.",
      {
        staffNo: { type: "string", description: "Unique staff number" },
        name: { type: "string" },
        designation: { type: "string", description: "TEACHER, ADMIN or SUPPORT" },
        email: {
          type: "string",
          description: "Optional, but needed to create a teacher login",
        },
        phone: { type: "string" },
        salary: { type: "number" },
      },
      ["staffNo", "name"],
    ),
    execute: async ({ user, args }) => {
      try {
        const staff = await createStaff(user.id, {
          staffNo: String(args.staffNo).trim(),
          name: String(args.name).trim(),
          designation: args.designation,
          email: args.email,
          phone: args.phone,
          salary: args.salary,
        });
        return {
          summary: `Staff "${staff.name}" added (${staff.designation})`,
          payload: staff,
        };
      } catch (error) {
        if (error?.code === "P2002") {
          return { error: "STAFF_NO_EXISTS" };
        }
        throw error;
      }
    },
  },

  create_receipt: {
    roles: OFFICE,
    isAction: true,
    definition: def(
      "create_receipt",
      "Record a fee payment against an installment and issue a receipt. Get the installmentId from list_payment_dues first.",
      {
        installmentId: { type: "number", description: "Unpaid installment id" },
        amount: { type: "number", description: "Amount to collect, not more than the remaining balance" },
        date: dateProp,
        notes: { type: "string", description: "Optional note on the receipt" },
      },
      ["installmentId", "amount"],
    ),
    execute: async ({ user, args }) => {
      const result = await collectFeePayment(user.id, {
        installmentId: Number(args.installmentId),
        amount: Number(args.amount),
        date: args.date,
        notes: args.notes,
      });
      if (result?.error) return { error: result.error };
      return {
        summary: `Receipt ${result.receipt.number} recorded for ${result.receipt.amount}`,
        payload: { receipt: result.receipt, installment: result.installment },
      };
    },
  },

  create_fee_plan: {
    roles: OFFICE,
    isAction: true,
    definition: def(
      "create_fee_plan",
      "Assign a fee to a student and split it into installments. Needs a studentId from find_students and a feeTypeId from list_fee_types.",
      {
        studentId: { type: "number" },
        feeTypeId: { type: "number" },
        totalAmount: { type: "number", description: "Defaults to the fee type amount" },
        installmentCount: { type: "number", description: "Defaults to 1" },
      },
      ["studentId", "feeTypeId"],
    ),
    execute: async ({ user, args }) => {
      const result = await createFeePlan(user.id, {
        studentId: Number(args.studentId),
        feeTypeId: Number(args.feeTypeId),
        totalAmount: args.totalAmount,
        installmentCount: args.installmentCount,
      });
      if (result?.error) return { error: result.error };
      return {
        summary: `Fee plan #${result.id} created (${result.totalAmount}, ${result.installmentCount} installment${result.installmentCount === 1 ? "" : "s"})`,
        payload: result,
      };
    },
  },

  create_fee_type: {
    roles: OFFICE,
    isAction: true,
    definition: def(
      "create_fee_type",
      "Create a new fee type (for example Tuition, Lab fee).",
      {
        name: { type: "string", description: "Fee type name" },
        amount: { type: "number", description: "Default amount, 0 if unknown" },
        period: { type: "string", description: "MONTHLY, QUARTERLY, YEARLY or ONE_TIME" },
      },
      ["name"],
    ),
    execute: async ({ user, args }) => {
      const feeType = await createFeeType(user.id, {
        name: String(args.name).trim(),
        amount: args.amount,
        period: args.period,
      });
      return {
        summary: `Fee type "${feeType.name}" created (${feeType.amount} ${feeType.period})`,
        payload: feeType,
      };
    },
  },

  create_expense: {
    roles: OFFICE,
    isAction: true,
    definition: def(
      "create_expense",
      "Record an institute expense.",
      {
        description: { type: "string", description: "What the money was spent on" },
        amount: { type: "number" },
        paidOn: dateProp,
      },
      ["description", "amount"],
    ),
    execute: async ({ user, args }) => {
      const expense = await createExpense(user.id, {
        description: args.description,
        amount: Number(args.amount),
        paidOn: args.paidOn,
      });
      return {
        summary: `Expense "${expense.description}" of ${expense.amount} recorded`,
        payload: expense,
      };
    },
  },

  create_refund: {
    roles: OFFICE,
    isAction: true,
    definition: def(
      "create_refund",
      "Refund part of what a student has already paid.",
      {
        studentId: { type: "number" },
        amount: { type: "number", description: "Must not exceed what the student paid minus earlier refunds" },
        reason: { type: "string" },
        refundedOn: dateProp,
      },
      ["studentId", "amount"],
    ),
    execute: async ({ user, args }) => {
      const result = await createRefund(user.id, {
        studentId: Number(args.studentId),
        amount: Number(args.amount),
        reason: args.reason,
        refundedOn: args.refundedOn,
      });
      if (result?.error) return { error: result.error };
      return {
        summary: `Refund of ${result.amount} recorded for student #${result.studentId}`,
        payload: result,
      };
    },
  },

  create_class_schedule: {
    roles: CLASS_ROLES,
    isAction: true,
    definition: def(
      "create_class_schedule",
      "Add a weekly schedule slot to a class. Get the classId from list_classes.",
      {
        classId: { type: "number" },
        dayOfWeek: { type: "number", description: "0 = Sunday, 6 = Saturday" },
        startTime: { type: "string", description: "24h HH:MM, for example 09:30" },
        endTime: { type: "string", description: "24h HH:MM, for example 11:00" },
        room: { type: "string" },
      },
      ["classId", "dayOfWeek", "startTime", "endTime"],
    ),
    execute: async ({ user, args }) => {
      const schedule = await createClassSchedule(user.id, user.role, Number(args.classId), {
        dayOfWeek: Number(args.dayOfWeek),
        startTime: args.startTime,
        endTime: args.endTime,
        room: args.room,
      });
      if (schedule?.error) return { error: schedule.error };
      return {
        summary: `Schedule added to class #${schedule.classId}: day ${schedule.dayOfWeek}, ${schedule.startTime}-${schedule.endTime}`,
        payload: schedule,
      };
    },
  },

  add_course_material: {
    roles: CLASS_ROLES,
    isAction: true,
    definition: def(
      "add_course_material",
      "Attach a course material (notes, link, document) to a class. Get the classId from list_classes.",
      {
        classId: { type: "number" },
        title: { type: "string" },
        description: { type: "string" },
        link: { type: "string", description: "Optional URL to the material" },
      },
      ["classId", "title"],
    ),
    execute: async ({ user, args }) => {
      const material = await createCourseMaterial(user.id, user.role, Number(args.classId), {
        title: String(args.title).trim(),
        description: args.description,
        link: args.link,
      });
      if (material?.error) return { error: material.error };
      return {
        summary: `Material "${material.title}" added to class #${material.classId}`,
        payload: material,
      };
    },
  },
};

export const toolsForRole = (role) =>
  Object.values(TOOLS)
    .filter((tool) => tool.roles.includes(role))
    .map((tool) => tool.definition);

export const runTool = async (user, toolCall) => {
  const name = toolCall?.function?.name;
  const tool = TOOLS[name];

  if (!tool) {
    return { payload: { error: `Unknown tool: ${name}` } };
  }
  if (!tool.roles.includes(user.role)) {
    return { payload: { error: "Your role is not allowed to do that." } };
  }

  let args;
  try {
    args = JSON.parse(toolCall.function.arguments || "{}");
  } catch {
    return { payload: { error: "The tool arguments were not valid JSON." } };
  }

  try {
    const result = await tool.execute({ user, args });

    if (result?.error) {
      const mapped = businessErrorToResponse(result.error);
      return { payload: { error: mapped.message } };
    }

    return {
      payload: result.payload,
      action: tool.isAction && result.summary ? { name, summary: result.summary } : null,
    };
  } catch (error) {
    console.error(`chat tool ${name} failed:`, error);
    return { payload: { error: "That action failed on the server. Please try again." } };
  }
};
