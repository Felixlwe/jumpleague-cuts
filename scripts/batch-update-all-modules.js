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

function getDimensionsFromBlocks(blocks) {
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
  if (!Number.isFinite(minX)) return { x: 10, y: 10, z: 10 };
  return {
    x: Math.max(1, maxX - minX + 1),
    y: Math.max(1, maxY - minY + 1),
    z: Math.max(1, maxZ - minZ + 1),
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

  const dim = getDimensionsFromBlocks(blocks);
  const dx = dim.x;
  const dy = dim.y;
  const dz = dim.z;
  const isTall = dy >= 18 && dy > Math.max(dx, dz) * 1.2;
  const isLong = Math.max(dx, dz) >= 24 && Math.max(dx, dz) > dy * 1.35;

  const getCount = (...keys) => keys.reduce((sum, k) => sum + (counts[k] || 0), 0);
  const has = (...keys) => keys.some((k) => (counts[k] || 0) > 0);

  // 1. Specific Character & Pop-Culture Detections
  // SpongeBob
  const spongeCount = getCount('sponge', 'wet_sponge');
  if (spongeCount > 500 || (spongeCount > 40 && has('yellow_wool', 'brown_wool', 'white_wool'))) {
    return 'SpongeBob';
  }

  // Giant Carrot
  const orangeCount = getCount('orange_terracotta', 'orange_wool', 'orange_concrete');
  const greenTop = getCount('green_terracotta', 'lime_wool', 'green_wool', 'oak_leaves', 'spruce_leaves');
  if (orangeCount > 80 && greenTop > 20 && isTall) {
    return 'Karotte';
  }

  // Ghost Rider / Burning Motorcycle
  const blackstone = getCount('blackstone', 'polished_blackstone', 'deepslate', 'coal_block', 'obsidian');
  const fireMagma = getCount('fire', 'magma_block', 'lava');
  if (blackstone > 80 && fireMagma > 15 && isLong) {
    return 'Ghost Rider';
  }

  // Pokeball
  const redCount = getCount('red_wool', 'red_concrete');
  const whiteCount = getCount('white_wool', 'white_concrete', 'quartz_block');
  const blackCount = getCount('black_wool', 'black_concrete');
  if (redCount > 50 && whiteCount > 50 && blackCount > 20 && Math.abs(dx - dz) <= 6 && !isLong) {
    return 'Pokeball';
  }

  // Super Mario
  const blueCount = getCount('blue_wool', 'blue_concrete');
  const brownCount = getCount('brown_wool', 'brown_concrete');
  if (redCount > 80 && blueCount > 50 && brownCount > 25) {
    return 'Super Mario';
  }

  // Pikachu
  const yellowCount = getCount('yellow_wool', 'yellow_concrete');
  if (yellowCount > 120 && blackCount > 15 && redCount > 15 && redCount < 80) {
    return 'Pikachu';
  }

  // 2. Structures, Vehicles & Architecture
  // Hot Air Balloon (Heißluftballon)
  const colorfulSphere = redCount + yellowCount + blueCount + getCount('lime_wool', 'purple_wool', 'orange_wool');
  const burnerAndFence = getCount('fire', 'campfire', 'oak_fence', 'iron_bars', 'chain');
  if (isTall && colorfulSphere > 180 && burnerAndFence > 8) {
    return 'Heißluftballon';
  }

  // Pirate Ship / Ship (Piratenschiff)
  const woodPlanks = getCount('oak_planks', 'spruce_planks', 'dark_oak_planks', 'birch_planks', 'jungle_planks');
  const sails = getCount('white_wool', 'white_concrete', 'black_wool');
  if (isLong && woodPlanks > 180 && sails > 35) {
    return 'Piratenschiff';
  }

  // Windmill (Windmühle)
  const millBlades = getCount('white_wool', 'oak_fence', 'iron_bars');
  if (isTall && woodPlanks > 90 && millBlades > 40) {
    return 'Alte Windmühle';
  }

  // Lighthouse (Leuchtturm)
  const lightSource = getCount('sea_lantern', 'glowstone', 'lantern', 'redstone_lamp');
  if (isTall && lightSource > 6 && (redCount > 40 || whiteCount > 80)) {
    return 'Leuchtturm';
  }

  // Castle / Fortress
  const stoneBricks = getCount('stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'chiseled_stone_bricks');
  const cobble = getCount('cobblestone', 'mossy_cobblestone');
  if (stoneBricks + cobble > 220) {
    if (isTall) return 'Burgturm';
    if (isLong) return 'Festungsmauer';
    return 'Ritterburg';
  }

  // Cherry Blossom Pagoda / Shrine
  const cherryCount = getCount('cherry_planks', 'cherry_leaves', 'cherry_log', 'cherry_wood', 'pink_petals');
  if (cherryCount > 60 || getCount('pink_wool', 'pink_concrete') > 120) {
    if (isTall) return 'Kirschblüten Pagode';
    return 'Kirschblüten Schrein';
  }

  // Nether & Magma
  const netherBricks = getCount('nether_bricks', 'red_nether_bricks', 'nether_brick_fence');
  const crimson = getCount('crimson_planks', 'crimson_stem', 'crimson_hyphae', 'crimson_nylium');
  const warped = getCount('warped_planks', 'warped_stem', 'warped_nylium', 'shroomlight');
  if (warped > 40) return 'Wirrwald Insel';
  if (crimson > 40) return 'Karmesin Wald';
  if (netherBricks > 80) return 'Nether Festung';
  if (fireMagma + getCount('basalt', 'blackstone') > 60) {
    return isTall ? 'Vulkan Festung' : 'Basalt Delta';
  }

  // Ocean / Coral / Prismarine
  const prismarine = getCount('prismarine', 'prismarine_bricks', 'dark_prismarine', 'sea_lantern');
  const coral = getCount('tube_coral_block', 'brain_coral_block', 'bubble_coral_block', 'fire_coral_block', 'horn_coral_block');
  if (coral > 25) return 'Korallenriff';
  if (prismarine > 40) return isTall ? 'Atlantis Turm' : 'Ozean Tempel';

  // Desert & Pyramid
  const sandstone = getCount('sandstone', 'cut_sandstone', 'smooth_sandstone', 'red_sandstone', 'chiseled_sandstone');
  const sand = getCount('sand', 'red_sand');
  if (sandstone + sand > 90) {
    if (isTall) return 'Wüsten Obelisk';
    if (sandstone > 180) return 'Wüsten Pyramide';
    return 'Wüsten Oase';
  }

  // Mesa & Terracotta Canyons
  const terracotta = getCount('terracotta', 'orange_terracotta', 'red_terracotta', 'yellow_terracotta', 'white_terracotta', 'brown_terracotta');
  if (terracotta > 120) {
    if (isTall) return 'Mesa Felsnadel';
    if (isLong) return 'Mesa Schlucht';
    return 'Mesa Plateau';
  }

  // Ice & Snow
  const iceSnow = getCount('ice', 'packed_ice', 'blue_ice', 'snow_block', 'snow', 'powder_snow');
  if (iceSnow > 80) {
    if (isTall) return 'Frost Nadel';
    return 'Eis Gletscher';
  }

  // End Dimension
  const endBlocks = getCount('end_stone', 'end_stone_bricks', 'purpur_block', 'purpur_pillar', 'chorus_plant', 'chorus_flower');
  if (endBlocks > 40) {
    return isLong ? 'Enderschiff' : 'Enderstadt';
  }

  // Industrial & Copper
  const copper = getCount('copper_block', 'cut_copper', 'exposed_copper', 'weathered_copper', 'oxidized_copper');
  const iron = getCount('iron_block', 'iron_bars', 'chain', 'anvil', 'hopper', 'cauldron');
  if (copper + iron > 50) {
    if (isTall) return 'Industriekran';
    return 'Steampunk Fabrik';
  }

  // Bamboo & Dojo
  const bamboo = getCount('bamboo_planks', 'bamboo_mosaic', 'bamboo_block');
  if (bamboo > 30) return 'Bambus Tempel';

  // Jungle & Vines
  const jungle = getCount('jungle_planks', 'jungle_log', 'vine', 'moss_block', 'moss_carpet');
  if (jungle > 60) {
    return isTall ? 'Dschungel Baumhaus' : 'Dschungel Tempel';
  }

  // Deep Dark & Sculk
  const sculk = getCount('sculk', 'sculk_catalyst', 'sculk_shrieker', 'sculk_sensor', 'echo_shard');
  if (sculk > 15) return 'Antike Tiefen';

  // Amethyst
  const amethyst = getCount('amethyst_block', 'budding_amethyst', 'amethyst_cluster');
  if (amethyst > 15) return 'Kristall Geode';

  // Honey & Slime
  const honey = getCount('honey_block', 'honeycomb_block', 'beehive', 'bee_nest');
  if (honey > 15) return 'Goldener Bienenstock';
  if (getCount('slime_block') > 15) return 'Schleim Grotte';

  // Farm
  const farm = getCount('hay_block', 'wheat', 'farmland', 'carrots', 'potatoes');
  if (farm > 15) return 'Bauernhof';

  // Wood & Forest
  if (woodPlanks > 90) {
    if (isLong) return 'Hängebrücke';
    if (isTall) return 'Ausguckturm';
    return 'Holzfäller Hütte';
  }

  // General shape fallbacks
  if (isTall) return 'Himmelsturm';
  if (isLong) return 'Skyblock Steg';

  return 'Abenteuer Insel';
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
          if (updatedCount % 50 === 0 || optimalName === 'SpongeBob' || optimalName === 'Karotte' || optimalName === 'Ghost Rider') {
            console.log(`[Batch Progress] ${updatedCount} updated. Modul #${mod.id}: "${mod.name}" -> "${optimalName}"`);
          }
        }
      }
    }
    console.log(`[Batch] Processed chunk ${i + fullChunk.length} / ${allModules.length}...`);
  }

  console.log(`\n========================================`);
  console.log(`[Batch Complete] Successfully processed all ${allModules.length} modules!`);
  console.log(`Total modules updated in Supabase: ${updatedCount}`);
  console.log(`========================================\n`);
}

runBatchUpdate();
