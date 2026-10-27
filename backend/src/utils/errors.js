export const businessErrorToResponse = (error) => {
  const map = {
    STUDENT_NOT_FOUND: { status: 404, message: "Student not found" },
    STUDENT_ADMISSION_EXISTS: {
      status: 409,
      message: "That admission number is already in use",
    },
    INVALID_INPUT: {
      status: 400,
      message: "Some required details were missing. Please provide them and try again.",
    },
    USER_DELETE_SELF: {
      status: 400,
      message: "You cannot delete your own account",
    },
    EXPENSE_NOT_FOUND: { status: 404, message: "Expense not found" },
    FEE_PLAN_NOT_FOUND: { status: 404, message: "Fee plan not found" },
    CLASS_SCHEDULE_NOT_FOUND: { status: 404, message: "Class schedule not found" },
    COURSE_MATERIAL_NOT_FOUND: { status: 404, message: "Course material not found" },
    RECEIPT_NOT_FOUND: { status: 404, message: "Receipt not found" },
    RECEIPT_STUDENT_MISMATCH: {
      status: 400,
      message: "That receipt does not belong to this student",
    },
    REFUND_EXCEEDS_RECEIPT: {
      status: 400,
      message: "This refund exceeds the amount left on that receipt",
    },
    USER_NOT_FOUND: { status: 404, message: "User not found" },
    INVALID_ROLE: {
      status: 400,
      message: "Role must be ADMIN, FINANCE, TEACHER or STUDENT",
    },
    STUDENT_ALREADY_LINKED: {
      status: 409,
      message: "This student already has a login account",
    },
    STUDENT_NOT_LINKED: {
      status: 400,
      message: "This student does not have a login account",
    },
    FEETYPE_NOT_FOUND: { status: 404, message: "Fee type not found" },
    CLASS_NOT_FOUND: { status: 404, message: "Class not found" },
    CLASS_TEACHER_REQUIRED: {
      status: 400,
      message: "Choose a teacher for this class",
    },
    CLASS_DELETE_FORBIDDEN: {
      status: 403,
      message: "Only an admin or finance user can delete this class.",
    },
    STUDENT_DELETE_FORBIDDEN: {
      status: 403,
      message: "Only an admin or finance user can delete this student.",
    },
    STUDENT_ACCOUNT_FORBIDDEN: {
      status: 403,
      message: "Only an admin or finance user can manage this student's login.",
    },
    PLAN_EXISTS: { status: 409, message: "This student already has this fee assigned" },
    PLAN_HAS_PAYMENTS: {
      status: 400,
      message: "Cannot delete: this fee plan already has payments",
    },
    PLAN_UPDATE_HAS_PAYMENTS: {
      status: 400,
      message:
        "Cannot edit: this fee plan already has collected payments. Add a new fee plan instead.",
    },
    TEACHER_NOT_FOUND: {
      status: 400,
      message: "Choose a teacher from the list. That account is not a teacher.",
    },
    REFUND_NOT_FOUND: { status: 404, message: "Refund not found" },
    PAYMENT_NOT_FOUND: { status: 404, message: "Salary payment not found" },
    FEETYPE_HAS_PLANS: {
      status: 400,
      message: "Cannot delete: this fee type is assigned to students",
    },
    INSTALLMENT_NOT_FOUND: { status: 404, message: "Installment not found" },
    INSTALLMENT_ALREADY_PAID: { status: 400, message: "Installment already fully paid" },
    AMOUNT_EXCEEDS_REMAINING: {
      status: 400,
      message: "Amount exceeds the remaining balance",
    },
    REFUND_EXCEEDS_PAID: {
      status: 400,
      message: "Refund cannot exceed the amount collected from this student",
    },
    RECEIPT_INVALID_AMOUNT: {
      status: 400,
      message: "Enter an amount greater than zero",
    },
    RECEIPT_NOT_LINKED: {
      status: 400,
      message: "This receipt is not linked to an installment",
    },
    USER_EMAIL_EXISTS: {
      status: 409,
      message: "That email is already in use",
    },
    USER_PASSWORD_TOO_SHORT: {
      status: 400,
      message: "Password must be at least 8 characters",
    },
    STAFF_NO_EXISTS: {
      status: 409,
      message: "That staff number is already in use",
    },
    STAFF_NOT_FOUND: { status: 404, message: "Staff not found" },
    ALREADY_PAID: {
      status: 409,
      message: "This staff has already been paid for this period",
    },
    STAFF_HAS_PAYMENTS: {
      status: 400,
      message: "Cannot delete: this staff already has salary payments",
    },
  };

  return map[error] ?? { status: 400, message: "Invalid request" };
};