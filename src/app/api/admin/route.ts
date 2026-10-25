import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminSecretPassword,
  verifyAdminRequest,
  setAdminSessionCookie,
  clearAdminSessionCookie,
} from '@/lib/serverAuth';
import {
  deleteModuleInSupabase,
  bulkSoftDeleteModulesInSupabase,
  updateCutInSupabase,
  deleteCutFromSupabase,
} from '@/lib/supabase';

/**
 * GET /api/admin
 * Checks whether the client currently holds a valid admin session.
 */
export async function GET(req: NextRequest) {
  const isAuth = verifyAdminRequest(req);
  return NextResponse.json({ authenticated: isAuth });
}

/**
 * POST /api/admin
 * Unified endpoint for Admin login, logout, and protected mutations:
 * - action: 'login' | 'verify' -> authenticates password and sets httpOnly cookie
 * - action: 'logout' -> clears httpOnly cookie
 * - action: 'delete_module' -> soft-deletes a module (admin only)
 * - action: 'bulk_delete_modules' -> bulk soft-deletes modules (admin only)
 * - action: 'approve_cut' -> marks cut as APPROVED (admin only)
 * - action: 'reject_cut' -> marks cut as REJECTED (admin only)
 * - action: 'delete_cut' -> permanently deletes cut (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || 'login').toLowerCase();

    // 1. Login / Verify
    if (action === 'login' || action === 'verify') {
      const password = typeof body.password === 'string' ? body.password.trim() : '';
      const serverPassword = getAdminSecretPassword();

      if (!serverPassword) {
        return NextResponse.json(
          {
            success: false,
            error:
              'ADMIN_SECRET_PASSWORD ist auf dem Server nicht konfiguriert.',
          },
          { status: 500 }
        );
      }

      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Bitte ein Passwort eingeben.' },
          { status: 400 }
        );
      }

      if (password === serverPassword) {
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
    }

    // 2. Logout
    if (action === 'logout') {
      const res = NextResponse.json({
        success: true,
        authenticated: false,
        message: 'Erfolgreich abgemeldet.',
      });
      clearAdminSessionCookie(res);
      return res;
    }

    // 3. For all other actions: Strict Admin Authorization Gate
    if (!verifyAdminRequest(req)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nicht autorisiert. Für diese Aktion sind Administrator-Rechte erforderlich.',
        },
        { status: 401 }
      );
    }

    // 4. Admin Action: delete_module
    if (action === 'delete_module') {
      const moduleId = String(body.moduleId || '').trim();
      if (!moduleId) {
        return NextResponse.json(
          { success: false, error: 'moduleId ist erforderlich.' },
          { status: 400 }
        );
      }
      const success = await deleteModuleInSupabase(moduleId, body.fallbackModule);
      return NextResponse.json({ success });
    }

    // 5. Admin Action: bulk_delete_modules
    if (action === 'bulk_delete_modules') {
      const modulesToDelete = Array.isArray(body.modulesToDelete)
        ? body.modulesToDelete
        : [];
      const success = await bulkSoftDeleteModulesInSupabase(modulesToDelete);
      return NextResponse.json({ success });
    }

    // 6. Admin Action: approve_cut
    if (action === 'approve_cut') {
      const cutId = String(body.cutId || '').trim();
      if (!cutId) {
        return NextResponse.json(
          { success: false, error: 'cutId ist erforderlich.' },
          { status: 400 }
        );
      }
      const overrides = body.overrides && typeof body.overrides === 'object' ? body.overrides : {};
      const success = await updateCutInSupabase(cutId, {
        ...overrides,
        status: 'APPROVED',
      });
      return NextResponse.json({ success });
    }

    // 7. Admin Action: reject_cut
    if (action === 'reject_cut') {
      const cutId = String(body.cutId || '').trim();
      if (!cutId) {
        return NextResponse.json(
          { success: false, error: 'cutId ist erforderlich.' },
          { status: 400 }
        );
      }
      const success = await updateCutInSupabase(cutId, {
        status: 'REJECTED',
      });
      return NextResponse.json({ success });
    }

    // 8. Admin Action: delete_cut
    if (action === 'delete_cut') {
      const cutId = String(body.cutId || '').trim();
      if (!cutId) {
        return NextResponse.json(
          { success: false, error: 'cutId ist erforderlich.' },
          { status: 400 }
        );
      }
      const success = await deleteCutFromSupabase(cutId);
      return NextResponse.json({ success });
    }

    return NextResponse.json(
      { success: false, error: `Unbekannte Aktion: "${action}"` },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverfehler.';
    console.error('[API /api/admin] Fehler:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
