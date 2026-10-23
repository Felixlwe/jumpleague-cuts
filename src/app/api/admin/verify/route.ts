import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    const serverPassword = process.env.ADMIN_PASSWORD?.trim() || 'jumpleague-admin';

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Bitte ein Passwort eingeben.' },
        { status: 400 }
      );
    }

    if (password.trim() === serverPassword) {
      return NextResponse.json({ success: true });
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
