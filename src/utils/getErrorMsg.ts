export function getErrorMsg(
  resource: string,
  verb: "was" | "were",
  message: string,
): string {
  return `${resource} ${verb} ${message}`;
}
