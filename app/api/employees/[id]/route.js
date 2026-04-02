import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

/**
 * DELETE /api/employees/:id
 * Desativa um funcionário (soft delete). Requer autenticação admin.
 */
export async function DELETE(request, { params }) {
  try {
    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const updated = await db('employees')
      .where('id', id)
      .update({ active: false });

    if (!updated) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro ao remover funcionário:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
