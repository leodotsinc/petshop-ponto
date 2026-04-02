import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/records/[id]/photo
 * Retorna apenas a foto de um registro específico. Requer autenticação admin.
 * Separado do GET /api/records para não carregar base64 em cada linha da tabela.
 */
export async function GET(request, { params }) {
  try {
    const auth = verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const record = await db('records').where({ id }).select('id', 'photo').first();

    if (!record) {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ photo: record.photo ?? null });
  } catch (err) {
    console.error('Erro ao buscar foto do registro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
