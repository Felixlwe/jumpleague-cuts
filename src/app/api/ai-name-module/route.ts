import { NextRequest, NextResponse } from 'next/server';

interface RequestBody {
  compositeDataUrl?: string;
  frequentBlocks?: string[];
  dimensions?: { x?: number; y?: number; z?: number };
}

/**
 * Heuristic block & 3D geometry analyzer as a seamless server fallback
 * if GEMINI_API_KEY is not configured or Google Gemini API errors.
 */
function heuristicAnalyzeModuleName(
  frequentBlocks?: string[],
  dimensions?: { x?: number; y?: number; z?: number }
): string {
  const blocks = (frequentBlocks || []).map((b) => b.toLowerCase());
  const blockStr = blocks.join(' ');

  const dx = dimensions?.x || 10;
  const dy = dimensions?.y || 10;
  const dz = dimensions?.z || 10;
  const isTall = dy >= 22 && dy > Math.max(dx, dz) * 1.4;
  const isLong = Math.max(dx, dz) >= 28 && Math.max(dx, dz) > dy * 1.5;

  // 1. Cherry / Sakura Theme
  if (blockStr.includes('cherry') || blockStr.includes('pink')) {
    return isTall ? 'Kirschblüten Pagode' : 'Kirschblüten Schrein';
  }

  // 2. Nether & Lava Theme
  if (
    blockStr.includes('crimson') ||
    blockStr.includes('nether') ||
    blockStr.includes('lava') ||
    blockStr.includes('magma') ||
    blockStr.includes('blackstone') ||
    blockStr.includes('basalt')
  ) {
    if (blockStr.includes('crimson')) return 'Karmesin Wald';
    if (blockStr.includes('basalt') || blockStr.includes('delta')) return 'Basalt Delta';
    return isTall ? 'Vulkan Festung' : 'Nether Festung';
  }

  // 3. Warped & Blue Nether Theme
  if (blockStr.includes('warped') || blockStr.includes('shroomlight')) {
    return 'Wirrwald Insel';
  }

  // 4. Ocean & Prismarine Theme
  if (
    blockStr.includes('prismarine') ||
    blockStr.includes('sea_lantern') ||
    blockStr.includes('coral') ||
    blockStr.includes('sponge')
  ) {
    if (blockStr.includes('coral')) return 'Korallen Riff';
    return isTall ? 'Atlantis Turm' : 'Ozean Tempel';
  }

  // 5. Desert & Pyramids / Mesa
  if (
    blockStr.includes('sandstone') ||
    blockStr.includes('red_sandstone') ||
    blockStr.includes('terracotta') ||
    (blockStr.includes('sand') && !blockStr.includes('soul'))
  ) {
    if (isTall) return 'Wüsten Obelisk';
    if (blockStr.includes('terracotta')) return 'Mesa Canyon';
    return 'Wüsten Oase';
  }

  // 6. Ice, Snow & Frozen Peaks
  if (
    blockStr.includes('ice') ||
    blockStr.includes('snow') ||
    blockStr.includes('powder_snow')
  ) {
    if (isTall) return 'Frost Nadel';
    return 'Eis Gletscher';
  }

  // 7. End Dimension
  if (
    blockStr.includes('end_stone') ||
    blockStr.includes('purpur') ||
    blockStr.includes('chorus')
  ) {
    return isLong ? 'End Schiff' : 'End Stadt';
  }

  // 8. Crystals, Amethyst & Sculk
  if (
    blockStr.includes('amethyst') ||
    blockStr.includes('sculk') ||
    blockStr.includes('crying_obsidian')
  ) {
    return 'Kristall Höhle';
  }

  // 9. Industrial, Steampunk & Copper
  if (
    blockStr.includes('copper') ||
    blockStr.includes('chain') ||
    blockStr.includes('anvil') ||
    blockStr.includes('iron_block') ||
    blockStr.includes('hopper')
  ) {
    return isTall ? 'Industrie Kran' : 'Steampunk Fabrik';
  }

  // 10. Honey & Slime
  if (blockStr.includes('honey') || blockStr.includes('slime') || blockStr.includes('beehive')) {
    return blockStr.includes('honey') ? 'Goldener Bienenstock' : 'Schleim Grotte';
  }

  // 11. Mushrooms
  if (blockStr.includes('mushroom') || blockStr.includes('mycelium')) {
    return 'Pilz Insel';
  }

  // 12. Ancient Library & Magic
  if (
    blockStr.includes('bookshelf') ||
    blockStr.includes('enchanting') ||
    blockStr.includes('lectern')
  ) {
    return isTall ? 'Magie Turm' : 'Alte Bibliothek';
  }

  // 13. Mangrove & Swamp
  if (blockStr.includes('mangrove') || blockStr.includes('mud')) {
    return 'Mangroven Sumpf';
  }

  // 14. Bamboo & Dojo
  if (blockStr.includes('bamboo')) {
    return 'Bambus Tempel';
  }

  // 15. Jungle & Vines
  if (blockStr.includes('jungle') || blockStr.includes('vine') || blockStr.includes('moss')) {
    return isTall ? 'Dschungel Baumhaus' : 'Dschungel Ruine';
  }

  // 16. Dark Oak & Haunted
  if (blockStr.includes('dark_oak') || blockStr.includes('spooky') || blockStr.includes('web')) {
    return 'Finsterwald Anwesen';
  }

  // 17. Farm & Windmill
  if (blockStr.includes('hay_block') || blockStr.includes('wheat') || blockStr.includes('farmland')) {
    return isTall ? 'Alte Windmühle' : 'Historischer Bauernhof';
  }

  // 18. Castle & Medieval Stone
  if (
    blockStr.includes('stone_bricks') ||
    blockStr.includes('mossy_cobblestone') ||
    blockStr.includes('deepslate_bricks')
  ) {
    if (isTall) return 'Kerker Turm';
    if (isLong) return 'Burg Mauer';
    return 'Ritter Burg';
  }

  // 19. Wood & Ships
  if (blockStr.includes('planks') || blockStr.includes('log')) {
    if (isLong) return 'Piratenschiff';
    if (isTall) return 'Ausguck Turm';
    return 'Holzfäller Hütte';
  }

  // 20. Shape-based general fallbacks
  if (isTall) return 'Himmels Turm';
  if (isLong) return 'Hänge Brücke';

  return 'Abenteuer Insel';
}

/**
 * Cleans and sanitizes the Gemini AI output to conform strictly to requirements:
 * max 2 words, no quotes, no numbers, no trailing dots, no generic forbidden words.
 */
function cleanAiName(raw: string): string {
  let name = raw
    .replace(/[*_~`"„“«»'#]+/g, '')
    .replace(/[.,:;!?]+$/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  // Strip generic prefixes/suffixes if present
  name = name
    .replace(/\b(parkour|sprung|pfad|modul|module|gipfel)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If name became empty or is just numbers
  if (!name || /^[0-9\s_-]+$/.test(name)) {
    return '';
  }

  // Truncate to maximum 2 words
  const words = name.split(/\s+/).filter(Boolean);
  const selectedWords = words.slice(0, 2);

  // Capitalize each word properly (German noun style)
  return selectedWords
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const { compositeDataUrl, frequentBlocks, dimensions } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // 1. If Gemini API key and composite image are available, attempt Vision AI recognition
    if (apiKey && compositeDataUrl && compositeDataUrl.startsWith('data:image/')) {
      const base64Data = compositeDataUrl.replace(/^data:image\/\w+;base64,/, '');

      const promptText = `Du siehst hier ein Minecraft JumpLeague Parkour-Modul aus 4 verschiedenen Kamerawinkeln (Vorne-Schräg, Hinten-Schräg, Seite, Oben). Analysiere genau, welches Bauwerk, Objekt, Tier, Fahrzeug, Biom oder Thema hier gebaut wurde (z. B. Piratenschiff, Heißluftballon, Windmühle, Kirschblüten-Tempel, Wüsten-Oase, TIE-Fighter, Eis-Gletscher, Kran, Pilz-Insel). Antworte AUSSCHLIESSLICH mit einem kurzen, prägnanten deutschen Namen für das Modul (maximal 2 Wörter, keine Anführungszeichen, keine Nummer, kein Punkt am Ende). Verwende NIEMALS generische Wörter wie Parkour, Sprung, Pfad, Modul oder Gipfel.${
        frequentBlocks && frequentBlocks.length > 0
          ? `\nHäufigste Blöcke in diesem Modul: ${frequentBlocks.join(', ')}`
          : ''
      }`;

      // Support fallback model names in case gemini-2.5-flash is not yet in public v1beta
      const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
      ];

      for (const modelName of modelsToTry) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: promptText },
                    {
                      inlineData: {
                        mimeType: 'image/webp',
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 30,
              },
            }),
          });

          if (res.ok) {
            const data = (await res.json()) as {
              candidates?: { content?: { parts?: { text?: string }[] } }[];
            };
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleaned = cleanAiName(rawText);

            if (cleaned && cleaned.length >= 2) {
              return NextResponse.json({
                name: cleaned,
                method: 'gemini',
                model: modelName,
              });
            }
          }
        } catch (callErr) {
          console.warn(`[AI-Name] Model ${modelName} call failed:`, callErr);
        }
      }
    }

    // 2. Seamless Server Fallback: Detailed Block & 3D Geometry Analysis
    const fallbackName = heuristicAnalyzeModuleName(frequentBlocks, dimensions);
    return NextResponse.json({
      name: fallbackName,
      method: 'heuristic',
    });
  } catch (err) {
    console.warn('[AI-Name] Request failed, using safe fallback:', err);
    return NextResponse.json({
      name: 'Abenteuer Insel',
      method: 'fallback_error',
    });
  }
}
