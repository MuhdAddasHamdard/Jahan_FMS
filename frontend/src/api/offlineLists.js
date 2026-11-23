import { api, getSyncStatus } from "./client";
import { PERMISSIONS } from "../auth/permissions";

const groups = [
  [PERMISSIONS.CLASSES, ["FINANCE", "TEACHER"], ["/classes"]],
  [PERMISSIONS.STUDENTS, ["FINANCE", "TEACHER"], ["/students"]],
  [PERMISSIONS.STAFF, ["FINANCE"], ["/staff"]],
  [PERMISSIONS.FINANCE, ["FINANCE"], [
    "/fees/types", "/fees/plans", "/fees/receipts", "/refunds", "/salaries/rates", "/salaries/payments", "/expenses",
  ]],
];

export const downloadOfflineLists = (user) => {
  if (getSyncStatus().offline) return;
  const paths = ["/settings/institute"];
  for (const [permission, roles, endpoints] of groups) {
    if (user.role === "ADMIN" || roles.includes(user.role) || user.permissions?.includes(permission)) {
      paths.push(...endpoints);
    }
  }
  if (user.role === "ADMIN" || user.role === "FINANCE" || user.permissions?.includes(PERMISSIONS.CLASSES)) {
    paths.push("/users/teachers");
  }
  if (user.role === "STUDENT") paths.push("/students/me");
  void Promise.allSettled(paths.map((path) => api.get(path)));
};
