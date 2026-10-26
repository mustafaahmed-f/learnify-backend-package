import { AppError } from "../errors/AppError.js";

export function orderByObject(sortQuery: string, sortableFields: string[]) {
  // Example: "createdAt/-updatedAt"
  // createdAt: ascending, updatedAt: descending

  if (!sortQuery.trim()) return [];

  const sortParts = sortQuery.split("/");
  const orderObject: Record<string, "asc" | "desc"> = {};

  for (const part of sortParts) {
    const isDescending = part.startsWith("-");
    const field = isDescending ? part.slice(1) : part;

    if (!sortableFields.includes(field)) {
      throw new AppError(`Invalid sort field: ${field}`, 400);
    }

    orderObject[field] = isDescending ? "desc" : "asc";
  }

  return Object.entries(orderObject).map(([field, direction]) => ({
    [field]: direction,
  }));
}
