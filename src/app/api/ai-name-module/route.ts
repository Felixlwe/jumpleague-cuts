import { NextRequest, NextResponse } from 'next/server';

interface RequestBody {
  compositeDataUrl?: string;
  frequentBlocks?: string[];
  dimensions?: { x?: number; y?: number; z?: number };
  apiKey?: string;
}

/**
 * Intelligent character & geometry analyzer as a seamless server fallback
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
  const isTall = dy >= 20 && dy > Math.max(dx, dz) * 1.3;
  const isLong = Math.max(dx, dz) >= 24 && Math.max(dx, dz) > dy * 1.4;

  // 1. SpongeBob Character Detection (Yellow body + Brown pants + White shirt)
  const hasYellow =
    blockStr.includes('yellow_wool') ||
    blockStr.includes('yellow_concrete') ||
    blockStr.includes('sponge') ||
    blockStr.includes('yellow_terracotta');
  const hasBrown =
    blockStr.includes('brown_wool') ||
    blockStr.includes('brown_concrete') ||
    blockStr.includes('brown_terracotta');
  const hasWhite =
    blockStr.includes('white_wool') ||
    blockStr.includes('white_concrete') ||
    blockStr.includes('quartz');

  if (hasYellow && hasBrown && hasWhite) {
    return 'SpongeBob';
  }

  // 2. Carrot / Giant Carrot Detection (Orange body + Green foliage top)
  const hasOrange =
    blockStr.includes('orange_terracotta') ||
    blockStr.includes('orange_wool') ||
    blockStr.includes('orange_concrete');
  const hasGreen =
    blockStr.includes('green_terracotta') ||
    blockStr.includes('lime_wool') ||
    blockStr.includes('green_wool') ||
    blockStr.includes('leaves');
  if (hasOrange && hasGreen && isTall) {
    return 'Riesenkarotte';
  }

  // 3. Ghost Rider / Burning Motorcycle Detection (Blackstone/Obsidian/Coal + Fire/Lava/Magma)
  const hasDark =
    blockStr.includes('blackstone') ||
    blockStr.includes('obsidian') ||
    blockStr.includes('coal') ||
    blockStr.includes('deepslate');
  const hasFire =
    blockStr.includes('fire') ||
    blockStr.includes('magma') ||
    blockStr.includes('lava');
  if (hasDark && hasFire && isLong) {
    return 'Feuer Motorrad';
  }

  // 4. Patrick Star Detection (Pink + Lime/Green)
  if (
    (blockStr.includes('pink_wool') || blockStr.includes('pink_concrete')) &&
    (blockStr.includes('lime') || blockStr.includes('green'))
  ) {
    return 'Patrick Star';
  }

  // 5. Super Mario Detection (Red + Blue + Brown)
  if (
    (blockStr.includes('red_wool') || blockStr.includes('red_concrete')) &&
    (blockStr.includes('blue_wool') || blockStr.includes('blue_concrete')) &&
    (blockStr.includes('brown_wool') || blockStr.includes('brown_concrete'))
  ) {
    return 'Super Mario';
  }

  // 6. Pikachu Detection (Yellow + Black + Red)
  if (
    hasYellow &&
    (blockStr.includes('black_wool') || blockStr.includes('black_concrete')) &&
    (blockStr.includes('red_wool') || blockStr.includes('red_concrete'))
  ) {
    return 'Pikachu';
  }

  // 7. Pokeball Detection (Red + White + Black)
  if (
    (blockStr.includes('red_wool') || blockStr.includes('red_concrete')) &&
    hasWhite &&
    (blockStr.includes('black_wool') || blockStr.includes('black_concrete'))
  ) {
    return 'Pokeball';
  }

  // 8. Cherry / Sakura Theme
  if (blockStr.includes('cherry') || blockStr.includes('pink')) {
    return isTall ? 'Kirschblüten Pagode' : 'Kirschblüten Schrein';
  }

  // 9. Nether & Lava Theme
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

  // 10. Warped & Blue Nether Theme
  if (blockStr.includes('warped') || blockStr.includes('shroomlight')) {
    return 'Wirrwald Insel';
  }

  // 11. Ocean & Prismarine Theme
  if (
    blockStr.includes('prismarine') ||
    blockStr.includes('sea_lantern') ||
    blockStr.includes('coral') ||
    blockStr.includes('sponge')
  ) {
    if (blockStr.includes('coral')) return 'Korallen Riff';
    return isTall ? 'Atlantis Turm' : 'Ozean Tempel';
  }

  // 12. Desert & Pyramids / Mesa
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

  // 13. Ice, Snow & Frozen Peaks
  if (
    blockStr.includes('ice') ||
    blockStr.includes('snow') ||
    blockStr.includes('powder_snow')
  ) {
    if (isTall) return 'Frost Nadel';
    return 'Eis Gletscher';
  }

  // 14. End Dimension
  if (
    blockStr.includes('end_stone') ||
    blockStr.includes('purpur') ||
    blockStr.includes('chorus')
  ) {
    return isLong ? 'End Schiff' : 'End Stadt';
  }

  // 15. Crystals, Amethyst & Sculk
  if (
    blockStr.includes('amethyst') ||
    blockStr.includes('sculk') ||
    blockStr.includes('crying_obsidian')
  ) {
    return 'Kristall Höhle';
  }

  // 16. Industrial, Steampunk & Copper
  if (
    blockStr.includes('copper') ||
    blockStr.includes('chain') ||
    blockStr.includes('anvil') ||
    blockStr.includes('iron_block') ||
    blockStr.includes('hopper')
  ) {
    return isTall ? 'Industrie Kran' : 'Steampunk Fabrik';
  }

  // 17. Honey & Slime
  if (blockStr.includes('honey') || blockStr.includes('slime') || blockStr.includes('beehive')) {
    return blockStr.includes('honey') ? 'Goldener Bienenstock' : 'Schleim Grotte';
  }

  // 18. Mushrooms
  if (blockStr.includes('mushroom') || blockStr.includes('mycelium')) {
    return 'Pilz Insel';
  }

  // 19. Ancient Library & Magic
  if (
    blockStr.includes('bookshelf') ||
    blockStr.includes('enchanting') ||
    blockStr.includes('lectern')
  ) {
    return isTall ? 'Magie Turm' : 'Alte Bibliothek';
  }

  // 20. Mangrove & Swamp
  if (blockStr.includes('mangrove') || blockStr.includes('mud')) {
    return 'Mangroven Sumpf';
  }

  // 21. Bamboo & Dojo
  if (blockStr.includes('bamboo')) {
    return 'Bambus Tempel';
  }

  // 22. Jungle & Vines
  if (blockStr.includes('jungle') || blockStr.includes('vine') || blockStr.includes('moss')) {
    return isTall ? 'Dschungel Baumhaus' : 'Dschungel Ruine';
  }

  // 23. Dark Oak & Haunted
  if (blockStr.includes('dark_oak') || blockStr.includes('spooky') || blockStr.includes('web')) {
    return 'Finsterwald Anwesen';
  }

  // 24. Farm & Windmill
  if (blockStr.includes('hay_block') || blockStr.includes('wheat') || blockStr.includes('farmland')) {
    return isTall ? 'Alte Windmühle' : 'Historischer Bauernhof';
  }

  // 25. Castle & Medieval Stone
  if (
    blockStr.includes('stone_bricks') ||
    blockStr.includes('mossy_cobblestone') ||
    blockStr.includes('deepslate_bricks')
  ) {
    if (isTall) return 'Kerker Turm';
    if (isLong) return 'Burg Mauer';
    return 'Ritter Burg';
  }

  // 26. Wood & Ships
  if (blockStr.includes('planks') || blockStr.includes('log')) {
    if (isLong) return 'Piratenschiff';
    if (isTall) return 'Ausguck Turm';
    return 'Holzfäller Hütte';
  }

  // 27. Shape-based general fallbacks
  if (isTall) return 'Himmels Turm';
  if (isLong) return 'Hänge Brücke';

  return 'Abenteuer Insel';
}

/**
 * Cleans and sanitizes the Gemini AI output:
 * max 2 words, no quotes, no numbers, no trailing dots, strips generic filler words like "Statue", "Figur", "Modul".
 */
function cleanAiName(raw: string): string {
  let name = raw
    .replace(/[*_~`"„“«»'#]+/g, '')
    .replace(/[.,:;!?]+$/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  // Strip conversational introductions like "Das ist...", "Name: ..."
  name = name.replace(/^(das ist|name:|titel:|modulname:|es ist)\s*/i, '');

  // Strip forbidden generic words
  name = name
    .replace(/\b(parkour|sprung|pfad|modul|module|gipfel|minecraft|level)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If the model appended filler words like "Statue", "Figur", "Skulptur", remove them
  if (/\b(statue|figur|skulptur|bauwerk|modell)\b/i.test(name)) {
    const stripped = name.replace(/\b(statue|figur|skulptur|bauwerk|modell)\b/gi, '').trim();
    if (stripped.length >= 2) {
      name = stripped;
    }
  }

  // If name became empty or is just numbers
  if (!name || /^[0-9\s_-]+$/.test(name)) {
    return '';
  }

  // Truncate to maximum 2 words
  const words = name.split(/\s+/).filter(Boolean);
  const selectedWords = words.slice(0, 2);

  // Capitalize each word properly, preserving internal casing like SpongeBob or TIE-Fighter
  return selectedWords
    .map((w) => {
      if (/[a-z][A-Z]/.test(w) || w.includes('-')) {
        return w;
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const { compositeDataUrl, frequentBlocks, dimensions } = body;

    // Check API Key from header, request body, or environment variable
    const apiKey =
      req.headers.get('x-gemini-api-key') ||
      body.apiKey ||
      process.env.GEMINI_API_KEY;

    // 1. If Gemini API key and composite image are available, execute Vision AI visual identification
    if (apiKey && compositeDataUrl && compositeDataUrl.startsWith('data:image/')) {
      const base64Data = compositeDataUrl.replace(/^data:image\/\w+;base64,/, '');

      const promptText = `Du bist ein hochpräziser Experte für Minecraft-Skulpturen, Parkour-Module, Popkultur und Bilderkennung.
Du siehst hier ein Minecraft-Modul aus 4 verschiedenen Kamerawinkeln (Vorne-Schräg, Hinten-Schräg, Seite, Oben).

DEINE AUFGABE:
Identifiziere anhand der visuellen Gestalt, Konturen, Farben und Silhouette, WAS in dieser 3D-Minecraft-Voxel-Skulptur dargestellt ist.
WICHTIG: Die Blöcke (Wolle, Terrakotta, Holz etc.) sind nur das Baumaterial! Achte primär auf das abgebildete Motiv, die Figur oder das reale/fiktive Objekt.

PRIORITÄTEN BEI DER ERKENNUNG:
1. Bekannte Charaktere, Cartoon-, Gaming- & Popkultur-Figuren (HÖCHSTE PRIORITÄT):
   - Wenn das Modell eine Figur darstellt, benenne sie DIREKT beim Namen!
   - Beispiele:
     * Gelber Schwamm mit eckigem Kopf, Krawatte/Hemd = "SpongeBob"
     * Rosa Seestern mit grüner Hose = "Patrick Star"
     * Tintenfisch = "Thaddäus"
     * Rote Mütze mit Schnurrbart / Latzhose = "Super Mario"
     * Grüne Mütze = "Luigi"
     * Gelbe Maus/Kreatur mit spitzen Ohren und roten Wangen = "Pikachu"
     * Blauer Igel = "Sonic"
     * Gelbe zylindrische Figur mit Brille / Latzhose = "Minion"
     * Fledermaus-Maske / schwarzer Umhang = "Batman"
     * Grüner Oger = "Shrek"
     * Gelbe Zeichentrickfigur mit weißem Hemd = "Homer Simpson"
     * Gelber Kreis mit offenem Mund = "Pac-Man"
     * Grüner Zwerg mit spitzen Ohren = "Yoda"
     * Schwarzer Helm mit Atemmaske = "Darth Vader"
     * Weißer Totenkopf / Skelett = "Totenkopf" oder "Skelett"
     * Brennendes Skelett auf Motorrad = "Ghost Rider" oder "Feuer Motorrad"
2. Erkennbare Objekte, Werkzeuge, Fahrzeuge & Symbole:
   - Karotte / Möhre = "Karotte" oder "Riesenkarotte"
   - Motorrad / Bike = "Motorrad"
   - Piratenschiff / Segelboot = "Piratenschiff"
   - Heißluftballon = "Heißluftballon"
   - Flugzeug / Raumschiff / U-Boot = "Flugzeug" / "Raumschiff" / "U-Boot"
   - Diamantschwert / Schwert = "Diamantschwert"
   - Pokeball = "Pokeball"
   - Herz = "Pixel Herz"
   - Krone = "Goldene Krone"
   - Dampflokomotive = "Dampflok"
   - Gitarre = "Gitarre"
3. Tiere & Lebewesen:
   - Z. B. Drache, Wal, Dinosaurier, Ente, Frosch, Elefant, Schildkröte, Bär, Spinne, Pinguin.
4. Spezifische Architektur & Biome:
   - Z. B. Windmühle, Leuchtturm, Eiffelturm, Pagode, Schloss, Pyramide, Iglu.

STRIKTE FORMATIERUNGS-REGELN:
- Antworte AUSSCHLIESSLICH mit dem deutschen Namen des erkannten Objekts / der erkannten Figur.
- Maximal 1 bis 2 Wörter (z. B. "SpongeBob", "Patrick Star", "Super Mario", "Pikachu", "Riesenkarotte", "Piratenschiff", "Ghost Rider", "Windmühle").
- VERWENDE NIEMALS generische Wörter wie: Modul, Parkour, Sprung, Pfad, Gipfel, Insel, Statue, Figur, Skulptur, Bauwerk, Minecraft, Level.
- Wenn es SpongeBob ist, antworte genau "SpongeBob" (nicht "SpongeBob Statue" oder "Gelbe Insel").
- Wenn es eine Karotte ist, antworte "Karotte" oder "Riesenkarotte".
- Wenn es ein brennendes Motorrad ist, antworte "Ghost Rider" oder "Feuer Motorrad".
- KEINE Anführungszeichen, KEINE Satzzeichen am Ende, KEINE Begründung.`;

      // Supported Gemini vision models in order of performance and availability
      const modelsToTry = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-2.0-flash-exp',
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
                temperature: 0.15,
                maxOutputTokens: 25,
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
                method: 'gemini_vision',
                model: modelName,
              });
            }
          } else {
            const errDetails = await res.text();
            console.warn(`[AI-Name] Gemini API model ${modelName} returned status ${res.status}:`, errDetails);
          }
        } catch (callErr) {
          console.warn(`[AI-Name] Gemini API model ${modelName} network error:`, callErr);
        }
      }
    }

    // 2. Seamless Server Fallback: Intelligent Character & Geometry Detection
    const fallbackName = heuristicAnalyzeModuleName(frequentBlocks, dimensions);
    return NextResponse.json({
      name: fallbackName,
      method: 'heuristic',
      warning: apiKey
        ? 'Gemini vision models failed to return a name, used smart fallback.'
        : 'GEMINI_API_KEY is not configured. Add GEMINI_API_KEY in .env.local or UI settings for full visual character recognition (e.g. SpongeBob).',
    });
  } catch (err) {
    console.warn('[AI-Name] Request failed, using safe fallback:', err);
    return NextResponse.json({
      name: 'Abenteuer Insel',
      method: 'fallback_error',
    });
  }
}
