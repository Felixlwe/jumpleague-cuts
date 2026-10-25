import { Cut, JLModule } from '@/types/jumpleague';

export { compareModuleIds, sortModulesNumerically } from '@/lib/moduleUtils';

/**
 * Empty initial modules & cuts arrays - all data is loaded exclusively from Supabase.
 */
export const INITIAL_MODULES: JLModule[] = [];
export const INITIAL_CUTS: Cut[] = [];
