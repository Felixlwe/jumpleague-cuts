import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminSecretPassword,
  setAdminSessionCookie,
} from '@/lib/serverAuth';

/**
 * POST /api/admin/verify
 * Legacy / convenience endpoint that verifies admin password and sets httpOnly cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    const serverPassword = getAdminSecretPassword();

    if (!serverPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'ADMIN_SECRET_PASSWORD ist auf dem Server nicht konfiguriert.',
        },
        { status: 500 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Bitte ein Passwort eingeben.' },
        { status: 400 }
      );
    }

    if (password.trim() === serverPassword) {
      const res = NextResponse.json({
        success: true,
        authenticated: true,
        message: 'Admin-Zugriff autorisiert.',
      });
      setAdminSessionCookie(res);
      return res;
    }

    return NextResponse.json(
      { success: false, error: 'Ungültiges Admin-Passwort.' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Serverfehler bei der Passwortüberprüfung.' },
      { status: 500 }
    );
  }
}
