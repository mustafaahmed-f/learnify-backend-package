import { NextFunction } from "express";
import { AppError } from "../errors/AppError.js";
import { handlePrismaError } from "../errors/handlePrismaError.js";

export function handleCaughtError(error: unknown, next: NextFunction) {
  if (error instanceof AppError) {
    return next(error);
  }
  const prismaError = handlePrismaError(error);
  return next(prismaError);
}
