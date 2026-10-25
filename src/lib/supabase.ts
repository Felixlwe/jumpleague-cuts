import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Cut, JLModule, Vector3D, VoxelBlock } from '@/types/jumpleague';
import { parseBase64Schematic } from './schematicParser';

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
    verified: row.status === 'APPROVED',
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
  description?: string;
  thumbnail_url?: string | null;
  blocks: VoxelBlock[];
  spawn_point?: Vector3D | number[] | null;
  finish_point?: Vector3D | number[] | null;
  is_deleted: boolean;
  created_at?: string;
}

function parseVectorPoint(val: unknown): Vector3D | undefined {
  if (!val) return undefined;
  if (Array.isArray(val) && val.length >= 3) {
    return {
      x: Number(val[0]) || 0,
      y: Number(val[1]) || 0,
      z: Number(val[2]) || 0,
    };
  }
  if (typeof val === 'object' && val !== null && 'x' in val && 'y' in val && 'z' in val) {
    const obj = val as Record<string, unknown>;
    return {
      x: Number(obj.x) || 0,
      y: Number(obj.y) || 0,
      z: Number(obj.z) || 0,
    };
  }
  return undefined;
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
    description: String(row.description || ''),
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : undefined,
    dimensions: {
      x: maxX || 12,
      y: maxY || 12,
      z: maxZ || 24,
    },
    blockCount: blocks.length,
    blocks,
    spawnPoint: parseVectorPoint(row.spawn_point),
    finishPoint: parseVectorPoint(row.finish_point),
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
    description: module.description || '',
    thumbnail_url: module.thumbnailUrl || null,
    blocks: module.blocks,
    spawn_point: module.spawnPoint
      ? [module.spawnPoint.x, module.spawnPoint.y, module.spawnPoint.z]
      : [0, 0, 0],
    finish_point: module.finishPoint
      ? [module.finishPoint.x, module.finishPoint.y, module.finishPoint.z]
      : [0, 0, 0],
    is_deleted: Boolean(module.isDeleted),
    created_at: module.createdAt || new Date().toISOString(),
  };
}

/**
 * Result structure when querying modules from Supabase
 */
export interface FetchModulesResult {
  activeModules: JLModule[];
  deletedIds: string[];
}

/**
 * Loads all modules from Supabase (both active and soft-deleted).
 * Uses fast metadata-only query with pagination to avoid statement timeouts.
 * Returns null if offline or table does not exist.
 */
export async function fetchModulesFromSupabase(): Promise<FetchModulesResult | null> {
  if (!supabase) return null;

  try {
    const activeModules: JLModule[] = [];
    const deletedIds: string[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      let selectFields =
        'id, short_code, name, difficulty, description, thumbnail_url, spawn_point, finish_point, is_deleted, created_at';

      let { data, error } = await supabase
        .from('modules')
        .select(selectFields)
        .order('created_at', { ascending: true })
        .range(from, from + pageSize - 1);

      // Fault-tolerance: if thumbnail_url column is not yet migrated in Supabase, retry without it
      if (error && error.message.toLowerCase().includes('thumbnail_url')) {
        selectFields =
          'id, short_code, name, difficulty, description, spawn_point, finish_point, is_deleted, created_at';
        const retry = await supabase
          .from('modules')
          .select(selectFields)
          .order('created_at', { ascending: true })
          .range(from, from + pageSize - 1);
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.warn('[Supabase] Modules table not ready or error:', error.message);
        if (from === 0) return null;
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      const rows = (data as unknown as Record<string, unknown>[]) || [];
      for (const row of rows) {
        if (row.is_deleted) {
          deletedIds.push(String(row.id));
        } else {
          activeModules.push(mapDbRowToModule(row));
        }
      }

      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    }

    return { activeModules, deletedIds };
  } catch (err) {
    console.warn('[Supabase] Exception fetching modules:', err);
    return null;
  }
}

/**
 * Safely updates the thumbnail URL for a module in Supabase.
 * Returns true on success, false if the column does not exist or an error occurs.
 */
export async function updateModuleThumbnailInSupabase(
  moduleId: string,
  thumbnailUrl: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('modules')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', moduleId);

    if (error) {
      console.warn('[Supabase] Could not update thumbnail_url in database:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception updating thumbnail_url:', err);
    return false;
  }
}

/**
 * Loads a single module with its full 3D voxel blocks array from Supabase by ID.
 */
export async function fetchModuleById(id: string): Promise<JLModule | null> {
  const trimmed = id ? id.trim() : '';
  if (!trimmed) return null;
  const cleanId = trimmed.replace(/^#+/, '');
  const searchKeys = Array.from(new Set([cleanId, `#${cleanId}`, trimmed]));

  if (supabase) {
    try {
      // 1. Try finding by id
      let { data, error } = await supabase
        .from('modules')
        .select('*')
        .in('id', searchKeys)
        .limit(1)
        .maybeSingle();

      // 2. Try finding by short_code
      if (!data && !error) {
        const byShort = await supabase
          .from('modules')
          .select('*')
          .in('short_code', searchKeys)
          .limit(1)
          .maybeSingle();
        data = byShort.data;
        error = byShort.error;
      }

      if (error) {
        console.warn('[Supabase] Error fetching module by id:', id, error.message);
      }

      if (data) {
        return mapDbRowToModule(data);
      }
    } catch (err) {
      console.warn('[Supabase] Exception fetching module by id:', id, err);
    }
  }

  // 3. Fallback: If numeric ID (from modules.top 1.20) and not found in Supabase or Supabase offline,
  // fetch directly via /api/import-module on client
  if (typeof window !== 'undefined' && /^\d+$/.test(cleanId)) {
    try {
      const res = await fetch('/api/import-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: cleanId, source: '120' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.base64) {
          const parsed = await parseBase64Schematic(json.base64, `Modul ${cleanId}`, {
            shortCode: `#${cleanId}`,
            name: `Modul ${cleanId}`,
          });
          const mod: JLModule = {
            id: cleanId,
            shortCode: `#${cleanId}`,
            name: parsed.name || `Modul ${cleanId}`,
            difficulty: parsed.module?.difficulty || 'EASY',
            dimensions: parsed.dimensions,
            blockCount: parsed.blocks.length,
            blocks: parsed.blocks,
            spawnPoint: parsed.module?.spawnPoint,
            finishPoint: parsed.module?.finishPoint,
            createdAt: new Date().toISOString(),
          };
          if (supabase) {
            void upsertModuleInSupabase(mod);
          }
          return mod;
        }
      }
    } catch (importErr) {
      console.warn('[Supabase] Fallback import from modules.top failed for id:', id, importErr);
    }
  }

  return null;
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
 * Performs a persistent soft-delete via upsert in Supabase.
 * By writing id, is_deleted: true, and required fields (name, difficulty, short_code, blocks),
 * Supabase remembers that this module ID is permanently deleted, even for mock/default modules
 * that did not originally have a database record!
 */
export async function deleteModuleInSupabase(
  moduleId: string,
  fallbackModule?: Partial<JLModule>
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const row: SupabaseModuleRow = {
      id: moduleId,
      short_code: fallbackModule?.shortCode || moduleId,
      name: fallbackModule?.name || moduleId,
      difficulty: fallbackModule?.difficulty || 'EASY',
      description: fallbackModule?.description || '',
      blocks: fallbackModule?.blocks || [],
      spawn_point: fallbackModule?.spawnPoint
        ? [fallbackModule.spawnPoint.x, fallbackModule.spawnPoint.y, fallbackModule.spawnPoint.z]
        : [0, 0, 0],
      finish_point: fallbackModule?.finishPoint
        ? [fallbackModule.finishPoint.x, fallbackModule.finishPoint.y, fallbackModule.finishPoint.z]
        : [0, 0, 0],
      is_deleted: true,
      created_at: fallbackModule?.createdAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('modules').upsert([row], {
      onConflict: 'id',
    });

    if (error) {
      console.warn('[Supabase] Error soft-deleting module via upsert:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception deleting module:', err);
    return false;
  }
}

/**
 * Soft deletes multiple modules at once in Supabase using upsert.
 */
export async function bulkSoftDeleteModulesInSupabase(
  modulesToDelete: Partial<JLModule>[]
): Promise<boolean> {
  if (!supabase || modulesToDelete.length === 0) return false;

  try {
    const rows: SupabaseModuleRow[] = modulesToDelete
      .map((m) => ({
        id: m.id || '',
        short_code: m.shortCode || m.id || '',
        name: m.name || m.id || '',
        difficulty: m.difficulty || 'EASY',
        description: m.description || '',
        blocks: m.blocks || [],
        spawn_point: m.spawnPoint
          ? [m.spawnPoint.x, m.spawnPoint.y, m.spawnPoint.z]
          : [0, 0, 0],
        finish_point: m.finishPoint
          ? [m.finishPoint.x, m.finishPoint.y, m.finishPoint.z]
          : [0, 0, 0],
        is_deleted: true,
        created_at: m.createdAt || new Date().toISOString(),
      }))
      .filter((r) => r.id.length > 0);

    const { error } = await supabase.from('modules').upsert(rows, {
      onConflict: 'id',
    });

    if (error) {
      console.warn('[Supabase] Error bulk soft-deleting modules:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception bulk soft-deleting modules:', err);
    return false;
  }
}

/**
 * Restores multiple soft-deleted modules in Supabase by setting is_deleted: false.
 */
export async function bulkRestoreModulesInSupabase(
  modulesToRestore: JLModule[]
): Promise<boolean> {
  if (!supabase || modulesToRestore.length === 0) return false;

  try {
    const rows = modulesToRestore.map((m) =>
      mapModuleToDbRow({ ...m, isDeleted: false })
    );
    const { error } = await supabase.from('modules').upsert(rows, {
      onConflict: 'id',
    });

    if (error) {
      console.warn('[Supabase] Error bulk restoring modules:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception bulk restoring modules:', err);
    return false;
  }
}
