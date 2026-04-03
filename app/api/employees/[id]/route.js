import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * PATCH /api/employees/:id
 * Reativa um funcionário e/ou altera o PIN. Requer autenticação admin.
 * Body: { reactivate?: boolean, pin?: string }
 */
export async function PATCH(request, { params }) {
  try {
    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const updates = {};

    if (body.reactivate) {
      updates.active = true;
    }

    if (body.pin) {
      if (body.pin.length < 4 || body.pin.length > 8) {
        return NextResponse.json({ error: 'PIN deve ter de 4 a 8 dígitos' }, { status: 400 });
      }
      updates.pin_hash = await bcrypt.hash(body.pin, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhuma alteração informada' }, { status: 400 });
    }

    const updated = await db('employees').where('id', id).update(updates);
    if (!updated) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar funcionário:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/employees/:id
 * Com body { permanent: false } → soft delete (desativa).
 * Com body { permanent: true, password: '...' } → hard delete com verificação de senha.
 * Requer autenticação admin.
 */
export async function DELETE(request, { params }) {
  try {
    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (body.permanent) {
      // Verifica senha antes de deletar permanentemente
      if (!body.password) {
        return NextResponse.json({ error: 'Senha é obrigatória para exclusão permanente' }, { status: 400 });
      }

      const setting = await db('settings').where('key', 'admin_password').first();
      const valid = await bcrypt.compare(body.password, setting.value);
      if (!valid) {
        return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
      }

      // Hard delete — registros deletam em cascata pela FK
      const deleted = await db('employees').where('id', id).delete();
      if (!deleted) {
        return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 });
      }

      return NextResponse.json({ success: true, permanent: true });
    }

    // Soft delete padrão
    const updated = await db('employees').where('id', id).update({ active: false });
    if (!updated) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro ao remover funcionário:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
