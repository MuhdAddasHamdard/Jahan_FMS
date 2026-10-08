export const businessErrorToResponse = (error) => {
  const map = {
    STUDENT_NOT_FOUND: { status: 404, message: "Student not found" },
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
    STAFF_NOT_FOUND: { status: 404, message: "Staff not found" },
    ALREADY_PAID: {
      status: 409,
      message: "This staff has already been paid for this period",
    },
    STAFF_HAS_PAYMENTS: {
      status: 400,
      message: "Cannot delete: this staff already has salary payments",
    },
    CHAT_INVALID_MESSAGE: {
      status: 400,
      message: "Type a message before sending it to the assistant",
    },
    CHAT_MESSAGE_TOO_LONG: {
      status: 400,
      message: "That message is too long. Please keep it under 2000 characters",
    },
    CHAT_NOT_CONFIGURED: {
      status: 503,
      message: "The assistant is not available right now. Please try again later",
    },
    CHAT_RATE_LIMITED: {
      status: 429,
      message: "The assistant is busy right now. Please try again in a moment",
    },
    CHAT_FAILED: {
      status: 502,
      message: "The assistant could not respond. Please try again",
    },
  };

  return map[error] ?? { status: 400, message: "Invalid request" };
};