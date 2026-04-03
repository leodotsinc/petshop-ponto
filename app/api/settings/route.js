import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * GET /api/settings
 * Retorna configurações públicas (nome da loja, carga horária).
 */
export async function GET() {
  try {
    const rows = await db('settings').whereIn('key', ['store_name', 'weekly_hours']);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    return NextResponse.json({
      store_name: map.store_name || 'Pet Patas',
      weekly_hours: parseFloat(map.weekly_hours) || 44,
    });
  } catch (err) {
    console.error('Erro ao buscar settings:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Atualiza configurações. Requer autenticação admin.
 * Body: { store_name?, new_password?, weekly_hours? }
 */
export async function PUT(request) {
  try {
    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { store_name, new_password, weekly_hours } = await request.json();

    if (store_name !== undefined) {
      await db('settings')
        .insert({ key: 'store_name', value: store_name.trim() || 'Pet Patas' })
        .onConflict('key')
        .merge();
    }

    if (weekly_hours !== undefined) {
      const hours = parseFloat(weekly_hours);
      if (isNaN(hours) || hours < 1 || hours > 80) {
        return NextResponse.json(
          { error: 'Carga horária semanal deve ser entre 1 e 80 horas' },
          { status: 400 },
        );
      }
      await db('settings')
        .insert({ key: 'weekly_hours', value: String(hours) })
        .onConflict('key')
        .merge();
    }

    if (new_password) {
      if (new_password.length < 8) {
        return NextResponse.json(
          { error: 'Senha deve ter ao menos 8 caracteres' },
          { status: 400 },
        );
      }
      const hash = await bcrypt.hash(new_password, 12);
      await db('settings')
        .where('key', 'admin_password')
        .update({ value: hash });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar settings:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
