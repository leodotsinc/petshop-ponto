import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

/**
 * DELETE /api/records/clear
 * Apaga todos os registros de ponto. Requer autenticação admin.
 */
export async function DELETE(request) {
  try {
    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const deleted = await db('records').del();

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (err) {
    console.error('Erro ao apagar registros:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
