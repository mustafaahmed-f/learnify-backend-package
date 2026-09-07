import { NextFunction, Request, Response } from "express";
import z from "zod";

export function validationMiddleware(validaitonSchema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = validaitonSchema.safeParse(req.body);
      if (!result.success) {
        const formattedErrors = result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        req.validationErrorArr = formattedErrors;

        return next(new Error(""));
      } else {
        return next();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        (req as any).validationErrorArr = error.issues;
        return next(error.issues);
      }
      return next(error);
    }
  };
}
