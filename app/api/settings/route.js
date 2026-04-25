import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * GET /api/settings
 * Retorna configurações públicas e, quando autenticado como admin, dados do relatório.
 */
export async function GET(request) {
  try {
    const auth = verifyAuth(request);
    const rows = await db('settings').whereIn('key', [
      'store_name',
      'weekly_hours',
      'employer_document',
      'employer_registration',
      'contractual_schedule',
    ]);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const settings = {
      store_name: map.store_name || 'Pet Patas',
      weekly_hours: parseFloat(map.weekly_hours) || 44,
    };

    if (auth?.role === 'admin') {
      settings.employer_document = map.employer_document || '';
      settings.employer_registration = map.employer_registration || '';
      settings.contractual_schedule = map.contractual_schedule || '';
    }

    return NextResponse.json(settings);
  } catch (err) {
    console.error('Erro ao buscar settings:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Atualiza configurações. Requer autenticação admin.
 * Body: { store_name?, new_password?, weekly_hours?, employer_document?, employer_registration?, contractual_schedule? }
 */
export async function PUT(request) {
  try {
    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const {
      store_name,
      new_password,
      weekly_hours,
      employer_document,
      employer_registration,
      contractual_schedule,
    } = await request.json();

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

    const optionalSettings = {
      employer_document,
      employer_registration,
      contractual_schedule,
    };

    for (const [key, value] of Object.entries(optionalSettings)) {
      if (value === undefined) continue;
      await db('settings')
        .insert({ key, value: String(value || '').trim() })
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
