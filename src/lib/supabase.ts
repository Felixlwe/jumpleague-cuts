import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Cut, Vector3D } from '@/types/jumpleague';

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
