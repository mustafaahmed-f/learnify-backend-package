export function checkUnique(arr: string[]): boolean {
  return arr.every(
    (item: string, index: number) => arr.indexOf(item) === index,
  );
}
