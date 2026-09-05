export const validRoles = ["STUDENT", "INSTRUCTOR", "ADMIN"] as const;

export type Role = (typeof validRoles)[number];
