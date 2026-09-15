import { NextFunction, Request, Response } from "express";
import z from "zod";
import { Location } from "../types/locationType.js";
import {
  ValidationError,
  type ValidationErrorItem,
} from "../errors/validationError.js";

type validationSchemaType = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

export function validationMiddleware(validaitonSchema: validationSchemaType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: ValidationErrorItem[] = [];

    for (const [location, schema] of Object.entries(validaitonSchema)) {
      if (!schema) continue;

      const result = schema.safeParse(req[location as keyof Request]);

      if (!result.success) {
        validationErrors.push(
          ...result.error.issues.map((issue) => ({
            location: location as Location,
            field: issue.path.join("."),
            message: issue.message,
          })),
        );
      } else {
        switch (location as Location) {
          case "body":
            req.body = result.data;
            break;
          case "params":
            req.params = result.data as typeof req.params;
            break;
          case "query":
            req.query = result.data as typeof req.query;
            break;
        }
      }
    }

    if (validationErrors.length > 0) {
      return next(new ValidationError("Validation failed", validationErrors));
    } else {
      return next();
    }
  };
}
