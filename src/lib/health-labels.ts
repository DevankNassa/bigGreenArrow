/** What connecting to Health found, e.g. "Imported 124 weigh-ins from Apple Health." */
export function importedSummary(count: number, name: string): string {
  if (count === 0) return `No new weigh-ins found in ${name}.`;
  return `Imported ${count} weigh-in${count === 1 ? '' : 's'} from ${name}.`;
}
