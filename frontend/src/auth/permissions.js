export const PERMISSIONS = {
  CLASSES: "CLASSES",
  STUDENTS: "STUDENTS",
  FINANCE: "FINANCE",
  REPORTS: "REPORTS",
  STAFF: "STAFF",
};

export const PERMISSION_OPTIONS = [
  {
    value: PERMISSIONS.CLASSES,
    label: "Classes",
    description: "Manage classes, schedules and course materials.",
  },
  {
    value: PERMISSIONS.STUDENTS,
    label: "Students",
    description: "View and manage student records.",
  },
  {
    value: PERMISSIONS.FINANCE,
    label: "Finance",
    description: "Manage fees, receipts, refunds, expenses and salaries.",
  },
  {
    value: PERMISSIONS.REPORTS,
    label: "Reports",
    description: "View financial and institute reports.",
  },
  {
    value: PERMISSIONS.STAFF,
    label: "Staff",
    description: "Manage staff records.",
  },
];
