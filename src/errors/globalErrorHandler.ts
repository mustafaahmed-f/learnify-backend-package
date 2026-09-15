import { NextFunction, Request, Response } from "express";
import { AppError } from "./AppError.js";
import { ValidationError } from "./validationError.js";

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(err);

  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      error: err.message,
      errors: err.errors,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  return res.status(500).json({
    error: "Internal server error",
  });
}

/*
* Error json due to validation error : 

{
  "error": "Validation failed",
  "errors": [
    {
      "location": "body",
      "field": "role",
      "message": "Invalid role"
    },
    {
      "location": "params",
      "field": "userId",
      "message": "Invalid user ID"
    }
  ]
}

*/
