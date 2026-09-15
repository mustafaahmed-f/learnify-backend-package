import { Role, validRoles } from "../constants/validRoles.js";

export function checkValidRoles(arr: string[]): boolean {
  return arr.every((item: string) => validRoles.includes(item as Role));
}
