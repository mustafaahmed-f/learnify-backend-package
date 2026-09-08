export function requiredFieldMsg(field: string): string {
  return `${field} is required`;
}

export function minLengthMsg(minLength: number): string {
  return `Minimum length is ${minLength}`;
}

export function maxLengthMsg(maxLength: number): string {
  return `Maximum length is ${maxLength}`;
}

export function invalidSchemaFormatMsg(field: string, format: string): string {
  return `${field} should match format: ${format}`;
}

export function invalidEmailMsg(): string {
  return "Invalid email format";
}

export function invalidPasswordMsg(): string {
  return "Password should be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character";
}

export function invalidNumberMsg(field: string): string {
  return `Invalid number format for field: ${field}`;
}

export function positiveNumberMsg(field: string): string {
  return `${field} should be positive`;
}

export function invalidUrlMsg(): string {
  return "Invalid URL";
}

export function invalidDateFormatMsg(): string {
  return "Invalid date format";
}

export function futureDateRequiredMsg(): string {
  return "Date must be in the future";
}
