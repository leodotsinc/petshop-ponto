import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/employees
 * Retorna todos os funcionários ativos com o status de hoje (Dentro/Fora).
 * Público — usado pela tela de seleção.
 */
export async function GET() {
  try {
    const employees = await db('employees').where('active', true).orderBy('name');

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
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'Funcionário já cadastrado' },
        { status: 409 },
      );
    }
    console.error('Erro ao cadastrar funcionário:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
