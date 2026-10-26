import { AppError } from "../errors/AppError.js";

export function orderByObject(sortQuery: string, sortableFields: string[]) {
  //* The sort query should be in this form : "createdAt/-updatedAt"
  //* where craetedAt is in ascending order
  //* and updatedAt is in descending order

  if (!sortQuery.trim()) return {};

  const sortParts = sortQuery.split("/");
  const orderBy: Record<string, "asc" | "desc"> = {};

  for (const part of sortParts) {
    const isDescending = part.startsWith("-");
    const field = isDescending ? part.slice(1) : part;

    if (!sortableFields.includes(field)) {
      throw new AppError(`Invalid sort field: ${field}`, 400);
    }

    orderBy[field] = isDescending ? "desc" : "asc";
  }

  return orderBy;
}
