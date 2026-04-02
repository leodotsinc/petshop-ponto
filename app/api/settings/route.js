import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * GET /api/settings
 * Retorna configurações públicas (nome da loja).
 */
export async function GET() {
  try {
    const storeName = await db('settings').where('key', 'store_name').first();

    return NextResponse.json({
      store_name: storeName?.value || 'Pet Patas',
    });
  } catch (err) {
    console.error('Erro ao buscar settings:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Atualiza configurações. Requer autenticação admin.
 * Body: { store_name?, new_password? }
 */
export async function PUT(request) {
  try {
    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { store_name, new_password } = await request.json();

    if (store_name !== undefined) {
      await db('settings')
        .insert({ key: 'store_name', value: store_name.trim() || 'Pet Patas' })
        .onConflict('key')
        .merge();
    }

    if (new_password) {
      if (new_password.length < 4) {
        return NextResponse.json(
          { error: 'Senha deve ter ao menos 4 caracteres' },
          { status: 400 },
        );
      }
      const hash = await bcrypt.hash(new_password, 10);
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
