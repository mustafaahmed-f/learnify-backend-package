import { Location } from "../types/locationType.js";
import { AppError } from "./AppError.js";

export type ValidationErrorItem = {
  location: Location;
  field: string;
  message: string;
};

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors: ValidationErrorItem[],
  ) {
    super(message, 400);
  }
}
