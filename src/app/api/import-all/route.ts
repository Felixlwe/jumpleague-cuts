import { NextRequest, NextResponse } from 'next/server';
import { ModuleDifficulty } from '@/types/jumpleague';

export interface ScrapedModuleInfo {
  id: string;
  name: string;
  difficulty: ModuleDifficulty;
}

/**
 * Next.js API Route: POST /api/import-all
 * Scrapes and extracts all available 1.20 JumpLeague modules from modules.top
 * along with their difficulty assignment (EASY, MEDIUM, HARD, ULTRA).
 */
export async function POST(req: NextRequest) {
  try {
    let source = '120';
    try {
      const body = await req.json();
      if (body?.source) {
        source = String(body.source).trim();
      }
    } catch {
      // Empty body is acceptable, defaults to 120
    }

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/html, */*',
    };

    let modules: ScrapedModuleInfo[] = [];

    // Method 1: SvelteKit __data.json endpoint
    try {
      const jsonRes = await fetch(
        `https://modules.top/modules/${encodeURIComponent(source)}/__data.json`,
        { headers, cache: 'no-store' }
      );

      if (jsonRes.ok) {
        const json = await jsonRes.json();
        const data = json.nodes?.[1]?.data;
        if (Array.isArray(data)) {
          const mapEntry = data.find(
            (item) => Array.isArray(item) && item[0] === 'Map'
          );
          if (mapEntry) {
            for (let i = 1; i < mapEntry.length; i += 2) {
              const rawDiff = String(data[mapEntry[i]] || '').toUpperCase();
              const diff: ModuleDifficulty =
                rawDiff === 'NORMAL' ? 'MEDIUM' : (rawDiff as ModuleDifficulty);
              const ptrList = data[mapEntry[i + 1]];
              if (Array.isArray(ptrList)) {
                for (const ptr of ptrList) {
                  const modObj = data[ptr];
                  if (modObj && typeof modObj === 'object') {
                    const idVal = data[modObj.id];
                    const nameVal = data[modObj.name];
                    if (idVal !== undefined && idVal !== null) {
                      modules.push({
                        id: String(idVal),
                        name: nameVal ? `Modul ${nameVal}` : `Modul ${idVal}`,
                        difficulty: diff,
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (jsonErr) {
      console.warn('[API import-all] JSON extraction failed, falling back to HTML scraping:', jsonErr);
    }

    // Method 2: Fallback to HTML regex section scraping
    if (modules.length === 0) {
      const htmlRes = await fetch(
        `https://modules.top/modules/${encodeURIComponent(source)}`,
        { headers, cache: 'no-store' }
      );

      if (!htmlRes.ok) {
        return NextResponse.json(
          {
            error: `Konnte modules.top/modules/${source} nicht abrufen (HTTP ${htmlRes.status}).`,
          },
          { status: 502 }
        );
      }

      const html = await htmlRes.text();
      const sectionRegex =
        /<h[1-6][^>]*>\s*(Easy|Normal|Hard|Ultra).*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6]|$)/gi;

      let match: RegExpExecArray | null;
      while ((match = sectionRegex.exec(html)) !== null) {
        const rawDiff = match[1].toUpperCase();
        const diff: ModuleDifficulty =
          rawDiff === 'NORMAL' ? 'MEDIUM' : (rawDiff as ModuleDifficulty);
        const sectionContent = match[2];
        const linkMatches = [
          ...sectionContent.matchAll(
            /href=["']\/modules\/120\/([0-9a-zA-Z_-]+)["']/g
          ),
        ];

        for (const lm of linkMatches) {
          const id = lm[1];
          if (!modules.some((m) => m.id === id)) {
            modules.push({
              id,
              name: `Modul ${id}`,
              difficulty: diff,
            });
          }
        }
      }
    }

    if (modules.length === 0) {
      return NextResponse.json(
        {
          error:
            'Keine Module auf modules.top gefunden. Möglicherweise hat sich das Seitenlayout geändert.',
        },
        { status: 404 }
      );
    }

    // Calculate counts per difficulty
    const counts: Record<ModuleDifficulty, number> = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
      ULTRA: 0,
    };
    for (const m of modules) {
      if (counts[m.difficulty] !== undefined) {
        counts[m.difficulty]++;
      }
    }

    return NextResponse.json({
      success: true,
      source,
      total: modules.length,
      counts,
      modules,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Interner Serverfehler beim Scrapen der Module von modules.top.';
    console.error('[API import-all] Fehler:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
