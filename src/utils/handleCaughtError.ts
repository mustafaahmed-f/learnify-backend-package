import { NextFunction } from "express";
import { AppError } from "../errors/AppError.js";
import { handlePrismaError } from "../errors/handlePrismaError.js";

export function handleCaughtError(error: unknown, next: NextFunction) {
  if (error instanceof AppError) {
    return next(error);
  }

  const { status, message } = handlePrismaError(error);

  // Client errors (e.g. P2002, P2025) become an AppError so globalErrorHandler
  // responds with the mapped status. Server errors are forwarded untouched so
  // their internal messages are logged but never sent to the client.
  if (status < 500) {
    return next(new AppError(message, status));
  }

  return next(error);
}
