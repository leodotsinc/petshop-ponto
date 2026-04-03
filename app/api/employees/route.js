import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * GET /api/employees?include_inactive=true
 * Sem parâmetros: retorna funcionários ativos (público — tablet).
 * Com include_inactive=true: requer autenticação admin.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';

    // Listar inativos requer auth admin
    if (includeInactive) {
      const auth = verifyAuth(request);
      if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

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

    // Remove campos sensíveis do retorno público
    const safe = employees.map(({ pin_hash, ...rest }) => ({
      ...rest,
      hasPin: !!pin_hash,
    }));

    return NextResponse.json(safe);
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

    const { name, pin } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Nome muito longo (máx. 100 caracteres)' }, { status: 400 });
    }
    if (!pin || pin.length < 4 || pin.length > 8) {
      return NextResponse.json({ error: 'PIN obrigatório (4 a 8 dígitos)' }, { status: 400 });
    }

    const pin_hash = await bcrypt.hash(pin, 10);

    const [employee] = await db('employees')
      .insert({ name: name.trim(), pin_hash })
      .returning(['id', 'name', 'active', 'created_at']);

    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    console.error('Erro ao cadastrar funcionário:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
