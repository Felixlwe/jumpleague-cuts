import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js API Route: POST /api/import-module
 * Proxies and fetches raw Minecraft NBT data from modules.top to bypass CORS in the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawModuleId = body.moduleId;
    const source = String(body.source || '120').trim();

    if (rawModuleId === undefined || rawModuleId === null || String(rawModuleId).trim() === '') {
      return NextResponse.json(
        { error: 'Parameter "moduleId" ist erforderlich (z. B. 11).' },
        { status: 400 }
      );
    }

    const moduleId = String(rawModuleId).trim();
    const targetUrl = `https://modules.top/modules/${encodeURIComponent(source)}/${encodeURIComponent(moduleId)}/__data.json`;

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Modul ${moduleId} existiert nicht auf modules.top (HTTP ${res.status}).`,
        },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const json = await res.json();

    if (json.nodes?.[1]?.type === 'error') {
      return NextResponse.json(
        {
          error:
            json.nodes[1].error?.message ||
            `Modul ${moduleId} existiert nicht auf modules.top.`,
        },
        { status: 404 }
      );
    }

    const dataArray = json.nodes?.[1]?.data;
    if (!Array.isArray(dataArray)) {
      return NextResponse.json(
        {
          error: `Unerwartete Datenstruktur für Modul ${moduleId} von modules.top.`,
        },
        { status: 502 }
      );
    }

    // Traverse the SvelteKit devalue array and find ["ArrayBuffer", "<base64>"]
    let base64String: string | null = null;
    for (const item of dataArray) {
      if (
        Array.isArray(item) &&
        item.length >= 2 &&
        item[0] === 'ArrayBuffer' &&
        typeof item[1] === 'string'
      ) {
        base64String = item[1];
        break;
      }
    }

    if (!base64String) {
      return NextResponse.json(
        {
          error: `Keine ArrayBuffer/Base64 NBT-Daten für Modul ${moduleId} in der Antwort gefunden.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      moduleId,
      source,
      base64: base64String,
    });
  } catch (err: any) {
    console.error('[API /api/import-module] Fehler:', err);
    return NextResponse.json(
      {
        error:
          err.message || 'Interner Serverfehler beim Abrufen des Moduls von modules.top.',
      },
      { status: 500 }
    );
  }
}
