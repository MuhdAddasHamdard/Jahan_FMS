import { ROLES } from "../constants/roles";

const SHARED_ROLES = [ROLES.ADMIN, ROLES.FINANCE];

export const sharesInstituteData = (role) => SHARED_ROLES.includes(role);

/**
 * Records carry a `userId` for attribution, but admins and finance work on
 * the same institute, so the creator must never limit what they read or
 * edit. Teachers only touch the classes they teach and their students.
 */
export const classScope = (role, userId) =>
  sharesInstituteData(role) ? {} : { OR: [{ teacherId: userId }, { userId }] };

export const studentScope = (role, userId) =>
  sharesInstituteData(role)
    ? {}
    : { OR: [{ userId }, { class: { teacherId: userId } }] };
