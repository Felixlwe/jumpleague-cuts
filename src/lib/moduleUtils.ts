import { JLModule } from '@/types/jumpleague';

/**
 * Natural numerical sort for JumpLeague Module IDs:
 * E.g. E1, E2, E3, E10, E11, E17 (NOT alphabetical E1, E10, E2)
 * Tier hierarchy when sorted across all categories: E -> M -> H -> U
 * Also safely ignores leading '#' symbols (e.g. #E1 vs E1)
 */
export function compareModuleIds(a: string, b: string): number {
  const cleanA = (a || '').replace(/^#+/, '').trim();
  const cleanB = (b || '').replace(/^#+/, '').trim();

  const matchA = cleanA.match(/^([a-zA-Z]+)(\d+)$/);
  const matchB = cleanB.match(/^([a-zA-Z]+)(\d+)$/);

  if (matchA && matchB) {
    const [, prefixA, numA] = matchA;
    const [, prefixB, numB] = matchB;

    if (prefixA.toUpperCase() !== prefixB.toUpperCase()) {
      const tierOrder: Record<string, number> = { E: 1, M: 2, H: 3, U: 4 };
      const orderA = tierOrder[prefixA.toUpperCase()] ?? 99;
      const orderB = tierOrder[prefixB.toUpperCase()] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return prefixA.localeCompare(prefixB);
    }

    return parseInt(numA, 10) - parseInt(numB, 10);
  }

  return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Sorts an array of JLModules numerically and by difficulty tier
 */
export function sortModulesNumerically(modules: JLModule[]): JLModule[] {
  return [...modules].sort((a, b) => compareModuleIds(a.id, b.id));
}
