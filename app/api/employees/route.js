import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/employees?include_inactive=true
 * Retorna funcionários ativos (padrão) ou todos incluindo inativos.
 * Público — usado pela tela de seleção e pelo painel admin.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';

    const query = db('employees').orderBy('name');
    if (!includeInactive) query.where('active', true);

    const employees = await query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const emp of employees) {
      const lastRecord = await db('records')
        .where('employee_id', emp.id)
        .where('timestamp', '>=', today.toISOString())
        .orderBy('timestamp', 'desc')
        .first();

      emp.lastRecord = lastRecord || null;
      emp.nextType =
        !lastRecord || lastRecord.type === 'saida' ? 'entrada' : 'saida';
    }

    return NextResponse.json(employees);
  } catch (err) {
    console.error('Erro ao listar funcionários:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * POST /api/employees
 * Cadastra um novo funcionário. Requer autenticação admin.
 */
export async function POST(request) {
  try {
    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const [employee] = await db('employees')
      .insert({ name: name.trim() })
      .returning('*');

    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    console.error('Erro ao cadastrar funcionário:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
