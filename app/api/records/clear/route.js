import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * DELETE /api/records/clear
 * Apaga todos os registros de ponto mantendo os funcionários.
 * Requer autenticação admin + confirmação de senha no body.
 */
export async function DELETE(request) {
  try {
    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { password } = await request.json().catch(() => ({}));
    if (!password) {
      return NextResponse.json({ error: 'Senha é obrigatória' }, { status: 400 });
    }

    const setting = await db('settings').where('key', 'admin_password').first();
    const valid = await bcrypt.compare(password, setting.value);
    if (!valid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    const deleted = await db('records').del();

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error('Erro ao apagar registros:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
