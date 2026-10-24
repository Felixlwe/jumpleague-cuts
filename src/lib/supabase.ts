import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Cut, JLModule, Vector3D, VoxelBlock } from '@/types/jumpleague';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseUrl = rawUrl
  ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  : undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export interface SupabaseCutRow {
  id: string;
  module_id: string;
  name: string;
  difficulty: string;
  time_saved: number;
  consistency: number;
  techs: string[];
  start_block: Vector3D;
  end_block: Vector3D;
  mid_block?: Vector3D[] | null;
  camera_position: Vector3D;
  camera_target: Vector3D;
  video_url: string;
  instructions: string;
  author: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at?: string;
}

/**
 * Transforms a Supabase database row (snake_case) into our frontend Cut model (camelCase).
 */
export function mapDbRowToCut(row: Record<string, unknown>): Cut {
  return {
    id: String(row.id),
    moduleId: String(row.module_id || row.moduleId || ''),
    name: String(row.name || 'Unbenannter Cut'),
    description: String(row.instructions || row.description || ''),
    timeSavedSeconds: Number(row.time_saved ?? row.timeSavedSeconds ?? 1.5),
    difficulty: (row.difficulty || 'MEDIUM') as Cut['difficulty'],
    consistencyRating: Number(row.consistency ?? row.consistencyRating ?? 3),
    techniques: Array.isArray(row.techs)
      ? (row.techs as Cut['techniques'])
      : Array.isArray(row.techniques)
      ? (row.techniques as Cut['techniques'])
      : ['TIMING'],
    startBlock: (row.start_block || row.startBlock || { x: 0, y: 0, z: 0 }) as Vector3D,
    endBlock: (row.end_block || row.endBlock || { x: 0, y: 0, z: 0 }) as Vector3D,
    midPoints:
      Array.isArray(row.mid_block) && row.mid_block.length > 0
        ? (row.mid_block as Vector3D[])
        : Array.isArray(row.midPoints) && row.midPoints.length > 0
        ? (row.midPoints as Vector3D[])
        : undefined,
    cameraPosition: (row.camera_position || row.cameraPosition || { x: 10, y: 10, z: 10 }) as Vector3D,
    cameraTarget: (row.camera_target || row.cameraTarget || { x: 0, y: 0, z: 0 }) as Vector3D,
    videoUrl: String(row.video_url || row.videoUrl || ''),
    status: (row.status || 'PENDING') as Cut['status'],
    submittedBy: String(row.author || row.submittedBy || 'Community'),
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
  };
}

/**
 * Transforms our frontend Cut model into a Supabase database row.
 */
export function mapCutToDbRow(cut: Cut): SupabaseCutRow {
  return {
    id: cut.id,
    module_id: cut.moduleId,
    name: cut.name,
    difficulty: cut.difficulty,
    time_saved: cut.timeSavedSeconds,
    consistency: cut.consistencyRating,
    techs: cut.techniques,
    start_block: cut.startBlock,
    end_block: cut.endBlock,
    mid_block: cut.midPoints && cut.midPoints.length > 0 ? cut.midPoints : null,
    camera_position: cut.cameraPosition,
    camera_target: cut.cameraTarget,
    video_url: cut.videoUrl,
    instructions: cut.description,
    author: cut.submittedBy,
    status: cut.status,
    created_at: cut.createdAt,
  };
}

/**
 * Loads all cuts from Supabase. Returns null if Supabase is not configured or an error occurs.
 */
export async function fetchCutsFromSupabase(): Promise<Cut[] | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('cuts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Error fetching cuts:', error.message);
      return null;
    }

    if (!data) return [];
    return data.map(mapDbRowToCut);
  } catch (err) {
    console.warn('[Supabase] Exception fetching cuts:', err);
    return null;
  }
}

/**
 * Inserts a new Cut into Supabase.
 */
export async function insertCutIntoSupabase(cut: Cut): Promise<boolean> {
  if (!supabase) return false;

  try {
    const row = mapCutToDbRow(cut);
    const { error } = await supabase.from('cuts').insert([row]);
    if (error) {
      console.error('[Supabase] Error inserting cut:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Exception inserting cut:', err);
    return false;
  }
}

/**
 * Updates a Cut in Supabase (e.g. status change to APPROVED / REJECTED).
 */
export async function updateCutInSupabase(
  cutId: string,
  partial: Partial<Cut>
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const updatePayload: Record<string, unknown> = {};

    if (partial.status !== undefined) updatePayload.status = partial.status;
    if (partial.name !== undefined) updatePayload.name = partial.name;
    if (partial.description !== undefined)
      updatePayload.instructions = partial.description;
    if (partial.timeSavedSeconds !== undefined)
      updatePayload.time_saved = partial.timeSavedSeconds;
    if (partial.difficulty !== undefined)
      updatePayload.difficulty = partial.difficulty;
    if (partial.consistencyRating !== undefined)
      updatePayload.consistency = partial.consistencyRating;
    if (partial.techniques !== undefined)
      updatePayload.techs = partial.techniques;
    if (partial.videoUrl !== undefined)
      updatePayload.video_url = partial.videoUrl;
    if (partial.submittedBy !== undefined)
      updatePayload.author = partial.submittedBy;
    if (partial.midPoints !== undefined)
      updatePayload.mid_block = partial.midPoints;

    const { error } = await supabase
      .from('cuts')
      .update(updatePayload)
      .eq('id', cutId);

    if (error) {
      console.error('[Supabase] Error updating cut:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Exception updating cut:', err);
    return false;
  }
}

/**
 * Deletes a Cut from Supabase.
 */
export async function deleteCutFromSupabase(cutId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('cuts').delete().eq('id', cutId);
    if (error) {
      console.error('[Supabase] Error deleting cut:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Exception deleting cut:', err);
    return false;
  }
}

// ==============================================================================
// MODULES SUPABASE CLOUD SYNC & CRUD
// ==============================================================================

export interface SupabaseModuleRow {
  id: string;
  short_code: string;
  name: string;
  difficulty: string;
  blocks: VoxelBlock[];
  spawn_point?: Vector3D | null;
  finish_point?: Vector3D | null;
  is_deleted: boolean;
  created_at?: string;
}

export function mapDbRowToModule(row: Record<string, unknown>): JLModule {
  const blocks = (Array.isArray(row.blocks) ? row.blocks : []) as VoxelBlock[];
  let maxX = 0;
  let maxY = 0;
  let maxZ = 0;
  for (const b of blocks) {
    if (Math.abs(b.position.x) * 2 > maxX) maxX = Math.abs(b.position.x) * 2;
    if (b.position.y > maxY) maxY = b.position.y;
    if (b.position.z > maxZ) maxZ = b.position.z;
  }

  return {
    id: String(row.id),
    shortCode: String(row.short_code || row.id),
    name: String(row.name || 'Unbenanntes Modul'),
    difficulty: (row.difficulty || 'MEDIUM') as JLModule['difficulty'],
    dimensions: {
      x: maxX || 12,
      y: maxY || 12,
      z: maxZ || 24,
    },
    blockCount: blocks.length,
    blocks,
    spawnPoint: (row.spawn_point as Vector3D) || undefined,
    finishPoint: (row.finish_point as Vector3D) || undefined,
    isDeleted: Boolean(row.is_deleted),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapModuleToDbRow(module: JLModule): SupabaseModuleRow {
  return {
    id: module.id,
    short_code: module.shortCode || module.id,
    name: module.name,
    difficulty: module.difficulty,
    blocks: module.blocks,
    spawn_point: module.spawnPoint || null,
    finish_point: module.finishPoint || null,
    is_deleted: Boolean(module.isDeleted),
    created_at: module.createdAt || new Date().toISOString(),
  };
}

/**
 * Loads all active modules from Supabase. Returns null if offline or table does not exist.
 */
export async function fetchModulesFromSupabase(): Promise<JLModule[] | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[Supabase] Modules table not ready or error:', error.message);
      return null;
    }

    if (!data) return [];
    return data.map(mapDbRowToModule);
  } catch (err) {
    console.warn('[Supabase] Exception fetching modules:', err);
    return null;
  }
}

/**
 * Inserts or updates a module in Supabase (upsert).
 */
export async function upsertModuleInSupabase(
  module: JLModule
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const row = mapModuleToDbRow(module);
    const { error } = await supabase.from('modules').upsert([row], {
      onConflict: 'id',
    });

    if (error) {
      console.warn('[Supabase] Error upserting module:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception upserting module:', err);
    return false;
  }
}

/**
 * Deletes a module in Supabase (sets is_deleted=true or hard deletes).
 */
export async function deleteModuleInSupabase(
  moduleId: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    // Soft delete so existing references don't crash, and fallback hard delete
    const { error } = await supabase
      .from('modules')
      .update({ is_deleted: true })
      .eq('id', moduleId);

    if (error) {
      // Try hard delete if soft delete column doesn't match
      await supabase.from('modules').delete().eq('id', moduleId);
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception deleting module:', err);
    return false;
  }
}
