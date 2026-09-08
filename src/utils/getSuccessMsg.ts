export function getSuccessMsg(
  resource: string,
  verb: "has" | "have",
  action: string,
): string {
  return `${resource} ${verb} been ${action} successfully`;
}
