const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wubfytewpfeoujdmfnnz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_gMdoRn6QKKXGn36XdlJRUw_1WNTHPmC';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Verified curated modules with ground-truth visual identifications
const VERIFIED_NAMES = {
  '1372': 'SpongeBob',
  '1116': 'Karotte',
  '2009': 'Ghost Rider',
  '393': 'Sirfetch\'d',
  '1101': 'Arcade-Automat',
  '2057': 'Bowser Kart',
  '2021': 'Nintendo Switch',
  '569': 'Bonsai Baum',
  '2077': 'Ritterschild',
  '1149': 'Axolotl',
  '1332': 'Sternwarte',
  '1171': 'Honigbär',
  '198': 'Vulkan',
  '2': 'Erschaffung Adams',
  'E-11': 'Star Wars',
};

// Load pre-rendered 3D thumbnails if available
let allThumbnails = {};
try {
  const thumbPath = '/Users/felixlwe/.gemini/antigravity/brain/97527ffd-f20f-468c-85c0-7c288dd6e040/all_thumbnails.json';
  if (fs.existsSync(thumbPath)) {
    allThumbnails = JSON.parse(fs.readFileSync(thumbPath, 'utf8'));
    console.log(`[Batch] Loaded ${Object.keys(allThumbnails).length} pre-rendered thumbnails.`);
  }
} catch (err) {
  console.warn('[Batch] Note: Could not load local all_thumbnails.json:', err.message);
}

function getDimensions(blocks) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const b of blocks || []) {
    const x = Number(b.position?.x ?? b.x);
    const y = Number(b.position?.y ?? b.y);
    const z = Number(b.position?.z ?? b.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  if (!Number.isFinite(minX)) {
    return { x: 10, y: 10, z: 10, isTall: false, isLong: false };
  }
  const dx = Math.max(1, maxX - minX + 1);
  const dy = Math.max(1, maxY - minY + 1);
  const dz = Math.max(1, maxZ - minZ + 1);
  return {
    x: dx,
    y: dy,
    z: dz,
    isTall: dy >= 18 && dy > Math.max(dx, dz) * 1.15,
    isLong: Math.max(dx, dz) >= 24 && Math.max(dx, dz) > dy * 1.35,
  };
}

function classifyModule(m) {
  if (VERIFIED_NAMES[m.id]) return VERIFIED_NAMES[m.id];

  const blocks = Array.isArray(m.blocks) ? m.blocks : [];
  const counts = {};
  let totalBlocks = 0;

  for (const b of blocks) {
    if (!b) continue;
    const rawType = String(b.type || '').toLowerCase().replace(/^minecraft:/, '').split('[')[0].trim();
    if (['air', 'cave_air', 'void_air', 'barrier', 'light', 'structure_void'].includes(rawType)) continue;
    counts[rawType] = (counts[rawType] || 0) + 1;
    totalBlocks++;
  }

  const dim = getDimensions(blocks);
  const c = (...keys) => keys.reduce((sum, k) => sum + (counts[k] || 0), 0);

  // 1. Pop-Culture & Character builds
  if (c('sponge', 'wet_sponge') > 500) return 'SpongeBob';
  if (c('orange_terracotta', 'orange_wool', 'orange_concrete') > 80 && c('green_terracotta', 'lime_wool', 'green_wool') > 20 && dim.isTall) return 'Karotte';
  if (c('blackstone', 'deepslate', 'coal_block') > 60 && c('fire', 'magma_block', 'lava') > 15 && dim.isLong) return 'Ghost Rider';
  if (c('black_concrete') > 300 && c('light_gray_stained_glass_pane') > 150 && c('cyan_concrete') > 100) return 'Nintendo Switch';
  if (c('yellow_concrete') > 500 && c('lime_concrete') > 300 && c('orange_concrete') > 200) return 'Bowser Kart';
  if (c('red_wool', 'red_concrete') > 50 && c('white_wool', 'white_concrete', 'quartz_block') > 50 && c('black_wool', 'black_concrete') > 20 && !dim.isLong) return 'Pokeball';

  // 2. Mining & Ores
  const ores = c('iron_ore', 'coal_ore', 'gold_ore', 'diamond_ore', 'deepslate_iron_ore', 'deepslate_coal_ore', 'deepslate_diamond_ore', 'deepslate_gold_ore', 'copper_ore', 'lapis_ore', 'redstone_ore');
  if (ores > 30 || c('raw_iron_block', 'raw_gold_block', 'raw_copper_block') > 10) {
    if (c('diamond_ore', 'deepslate_diamond_ore', 'diamond_block') > 5) return 'Diamantmine';
    if (c('gold_ore', 'deepslate_gold_ore', 'gold_block') > 5) return 'Goldmine';
    return 'Erzmine';
  }

  // 3. Foliage & Forest Types
  const oakLeaves = c('oak_leaves', 'oak_wood', 'oak_log');
  const birchLeaves = c('birch_leaves', 'birch_wood', 'birch_log');
  const spruceLeaves = c('spruce_leaves', 'spruce_wood', 'spruce_log');
  const jungleLeaves = c('jungle_leaves', 'jungle_wood', 'jungle_log');
  const darkOakLeaves = c('dark_oak_leaves', 'dark_oak_wood', 'dark_oak_log');
  const cherryLeaves = c('cherry_leaves', 'cherry_wood', 'cherry_log', 'pink_petals');
  const mangrove = c('mangrove_leaves', 'mangrove_roots', 'muddy_mangrove_roots', 'mangrove_wood');
  const azalea = c('azalea_leaves', 'flowering_azalea_leaves', 'azalea', 'flowering_azalea', 'moss_block', 'moss_carpet');

  if (azalea > 35) return 'Azaleengarten';
  if (cherryLeaves > 35) return dim.isTall ? 'Kirschblüten Pagode' : 'Kirschblüten Schrein';
  if (mangrove > 35) return 'Mangrovenwald';
  if (jungleLeaves > 120) return dim.isTall ? 'Urwald Riese' : 'Dschungelpfad';
  if (spruceLeaves > 120) return 'Taiga Nadelwald';
  if (darkOakLeaves > 120) return 'Finsterwald Dickicht';
  if (birchLeaves > 120) return 'Birkenhain';
  if (oakLeaves > 250) return dim.isTall ? 'Rieseneiche' : 'Baumkronen Pfad';

  // 4. Aquatic & Water
  const water = c('water');
  const coral = c('tube_coral_block', 'brain_coral_block', 'bubble_coral_block', 'fire_coral_block', 'horn_coral_block');
  const prismarine = c('prismarine', 'prismarine_bricks', 'dark_prismarine', 'sea_lantern');
  if (coral > 18) return 'Korallenriff';
  if (prismarine > 30) return dim.isTall ? 'Atlantis Turm' : 'Ozean Tempel';
  if (water > 180) return dim.isTall ? 'Bergwasserfall' : 'Unterwasser Grotte';

  // 5. Nether Dimensions
  const warped = c('warped_planks', 'warped_stem', 'warped_hyphae', 'warped_nylium', 'shroomlight');
  const crimson = c('crimson_planks', 'crimson_stem', 'crimson_hyphae', 'crimson_nylium');
  const basalt = c('basalt', 'polished_basalt', 'smooth_basalt');
  const soul = c('soul_sand', 'soul_soil', 'soul_fire', 'soul_lantern');
  const netherBricks = c('nether_bricks', 'red_nether_bricks', 'nether_brick_fence');
  const magma = c('magma_block', 'lava', 'fire');
  if (warped > 25) return 'Wirrwald Dickicht';
  if (crimson > 25) return 'Karmesin Wald';
  if (netherBricks > 35) return 'Nether Festung';
  if (soul > 25) return 'Seelensand Tal';
  if (basalt > 35 || (magma > 18 && c('blackstone') > 35)) return 'Basalt Delta';
  if (magma > 25) return 'Vulkan Kammer';

  // 6. End Dimension
  const purpur = c('purpur_block', 'purpur_pillar', 'purpur_slab', 'purpur_stairs');
  const endStone = c('end_stone', 'end_stone_bricks', 'end_stone_brick_wall');
  const chorus = c('chorus_plant', 'chorus_flower');
  if (purpur > 20) return 'Purpur Palast';
  if (endStone > 35) return dim.isLong ? 'Enderschiff' : 'Endstadt Turm';
  if (chorus > 8) return 'Chorus Garten';

  // 7. Cold & Ice
  const ice = c('ice', 'packed_ice', 'blue_ice');
  const snow = c('snow_block', 'snow', 'powder_snow');
  if (ice > 35) return dim.isTall ? 'Frost Nadel' : 'Packeis Kluft';
  if (snow > 40) return 'Schneegipfel';

  // 8. Desert & Mesa
  const sandstone = c('sandstone', 'cut_sandstone', 'smooth_sandstone', 'chiseled_sandstone');
  const redSandstone = c('red_sandstone', 'cut_red_sandstone');
  const terracotta = c('terracotta', 'orange_terracotta', 'red_terracotta', 'yellow_terracotta', 'brown_terracotta', 'white_terracotta');
  if (sandstone > 50) return dim.isTall ? 'Wüsten Obelisk' : (sandstone > 120 ? 'Wüsten Pyramide' : 'Wüsten Oase');
  if (redSandstone > 35) return 'Roter Canyon';
  if (terracotta > 80) return dim.isTall ? 'Mesa Felsnadel' : (dim.isLong ? 'Mesa Schlucht' : 'Mesa Plateau');

  // 9. Modern / Tech / Glass
  const glass = c('glass', 'white_stained_glass', 'yellow_stained_glass', 'red_stained_glass', 'cyan_stained_glass', 'light_blue_stained_glass', 'purple_stained_glass', 'lime_stained_glass');
  const glassPanes = c('glass_pane', 'white_stained_glass_pane', 'cyan_stained_glass_pane', 'red_stained_glass_pane');
  if (glass > 60) return 'Buntglas Kathedrale';
  if (glassPanes > 45) return 'Glasscheiben Grat';

  const concrete = c('black_concrete', 'white_concrete', 'cyan_concrete', 'lime_concrete', 'yellow_concrete', 'red_concrete', 'blue_concrete');
  if (concrete > 120) {
    if (c('black_concrete') > 60 && c('white_concrete') > 60) return 'Schachbrett Arena';
    return 'Neon Passage';
  }

  // 10. Industrial, Copper, Chains & Iron
  const copper = c('copper_block', 'cut_copper', 'exposed_copper', 'weathered_copper', 'oxidized_copper');
  const iron = c('iron_block', 'iron_bars', 'chain', 'anvil', 'hopper');
  if (copper > 25) return 'Kupfer Labor';
  if (iron > 30) return dim.isTall ? 'Industriekran' : 'Schmiede Fabrik';

  // 11. Castle, Dungeon & Stone
  const stoneBricks = c('stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'chiseled_stone_bricks');
  const cobble = c('cobblestone', 'mossy_cobblestone');
  const deepslate = c('deepslate', 'cobbled_deepslate', 'deepslate_tiles', 'deepslate_bricks', 'polished_deepslate');
  if (deepslate > 60) return 'Tiefenschiefer Gruft';
  if (stoneBricks + cobble > 100) {
    if (c('mossy_stone_bricks', 'mossy_cobblestone') > 25) return 'Moosstein Ruine';
    return dim.isTall ? 'Burgturm' : (dim.isLong ? 'Festungsmauer' : 'Ritterburg');
  }

  // 12. Magic & Library
  if (c('bookshelf', 'enchanting_table', 'lectern') > 12) return 'Magier Bibliothek';
  if (c('amethyst_block', 'amethyst_cluster', 'budding_amethyst') > 12) return 'Kristall Geode';
  if (c('sculk', 'sculk_catalyst', 'sculk_shrieker') > 12) return 'Antike Tiefen';
  if (c('crying_obsidian', 'obsidian') > 20) return 'Obsidian Krater';

  // 13. Village, Farm & Wood
  if (c('hay_block', 'farmland', 'wheat', 'carrots') > 12) return 'Kornfeld Bauernhof';
  if (c('honey_block', 'honeycomb_block', 'beehive') > 12) return 'Bienenstock';
  if (c('slime_block') > 12) return 'Schleim Grotte';
  if (c('bamboo', 'bamboo_planks', 'bamboo_mosaic') > 20) return 'Bambus Tempel';
  if (c('mud_bricks', 'packed_mud') > 25) return 'Lehmziegel Dorf';
  if (c('quartz_block', 'smooth_quartz', 'quartz_pillar') > 40) return 'Marmor Palast';

  const wood = c('oak_planks', 'spruce_planks', 'dark_oak_planks', 'birch_planks', 'jungle_planks', 'acacia_planks');
  if (wood > 60) {
    if (c('acacia_planks') > 30) return 'Savannen Camp';
    if (dim.isLong && c('white_wool') > 20) return 'Piratenschiff';
    if (dim.isLong) return 'Hängebrücke';
    if (dim.isTall) return 'Ausguckturm';
    return 'Holzfäller Hütte';
  }

  // 14. Stone & Mineral Specifics
  if (c('smooth_stone', 'smooth_stone_slab') > 50) return 'Monolith Fels';
  if (c('granite', 'polished_granite') > 40) return 'Granit Klippe';
  if (c('diorite', 'polished_diorite') > 40) return 'Diorit Terrasse';
  if (c('andesite', 'polished_andesite') > 40) return 'Andesit Kamm';
  if (c('calcite') > 25) return 'Kalzit Grotte';
  if (c('tuff') > 25) return 'Tuffstein Kessel';

  // 15. Fine-grained Material Fallbacks (No more generic "Skyblock Steg" repetition!)
  if (c('grass_block', 'dirt', 'podzol', 'coarse_dirt') > 80) return 'Erdhügel Pfad';
  if (c('stone') > 80) return 'Felsengrat';
  if (c('cobblestone') > 60) return 'Bruchstein Steg';
  if (c('sand', 'gravel') > 50) return 'Dünengrat';
  if (c('oak_log', 'spruce_log', 'birch_log') > 30) return 'Holzstamm Pfad';
  if (c('iron_bars') > 20) return 'Eisengitter Steg';
  if (c('chain') > 15) return 'Kettenbrücke';
  if (c('ladder', 'scaffolding') > 15) return 'Klettersteig';
  if (c('wool', 'carpet') > 40) return 'Farbfelder Pfad';
  if (c('terracotta') > 40) return 'Terracotta Pfad';

  if (dim.isTall) return 'Himmelsturm';
  if (dim.isLong) return 'Himmelsbrücke';

  return 'Abenteuerinsel';
}

async function runBatchUpdate() {
  console.log('[Batch] Fetching all module IDs...');
  const { data: allModules, error: listErr } = await supabase.from('modules').select('id, name, thumbnail_url');
  if (listErr) {
    console.error('[Batch] Failed to fetch modules:', listErr);
    process.exit(1);
  }

  console.log(`[Batch] Total modules to evaluate: ${allModules.length}`);

  let updatedCount = 0;
  const CHUNK_SIZE = 20;

  for (let i = 0; i < allModules.length; i += CHUNK_SIZE) {
    const chunk = allModules.slice(i, i + CHUNK_SIZE);
    const chunkIds = chunk.map((c) => c.id);

    const { data: fullChunk, error: chunkErr } = await supabase
      .from('modules')
      .select('id, name, blocks, thumbnail_url')
      .in('id', chunkIds);

    if (chunkErr) {
      console.warn(`[Batch] Error fetching chunk ${i}:`, chunkErr.message);
      continue;
    }

    for (const mod of fullChunk || []) {
      const optimalName = classifyModule(mod);
      const thumbFallback = !mod.thumbnail_url && allThumbnails[mod.id] ? allThumbnails[mod.id] : undefined;

      const needsUpdate = mod.name !== optimalName || Boolean(thumbFallback);

      if (needsUpdate) {
        const updatePayload = {
          name: optimalName,
          ...(thumbFallback ? { thumbnail_url: thumbFallback } : {}),
        };

        const { error: updErr } = await supabase.from('modules').update(updatePayload).eq('id', mod.id);
        if (!updErr) {
          updatedCount++;
        }
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`[Batch Complete] Successfully processed all ${allModules.length} modules!`);
  console.log(`Total modules updated in Supabase: ${updatedCount}`);
  console.log(`========================================\n`);
}

runBatchUpdate();
