import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/records?employee_id=&date=&month=
 * Lista registros com filtros opcionais. Requer autenticação admin.
 * Não retorna a foto por padrão (campo pesado).
 */
export async function GET(request) {
  try {
    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    let query = db('records')
      .join('employees', 'records.employee_id', 'employees.id')
      .select(
        'records.id',
        'records.employee_id',
        'records.type',
        'records.timestamp',
        'records.lat',
        'records.lng',
        'records.created_at',
        'employees.name as employee_name',
      )
      .orderBy('records.timestamp', 'desc');

    if (employeeId) {
      query = query.where('records.employee_id', employeeId);
    }

    if (date) {
      query = query.whereRaw('DATE(records.timestamp) = ?', [date]);
    }

    if (month) {
      const [y, m] = month.split('-');
      query = query.whereRaw(
        'EXTRACT(YEAR FROM records.timestamp) = ? AND EXTRACT(MONTH FROM records.timestamp) = ?',
        [y, m],
      );
    }

    const records = await query;
    return NextResponse.json(records);
  } catch (err) {
    console.error('Erro ao listar registros:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * POST /api/records
 * Cria um novo registro de ponto. Público — usado pelo tablet na loja.
 */
export async function POST(request) {
  try {
    const { employee_id, type, photo, lat, lng } = await request.json();

    if (!employee_id || !type) {
      return NextResponse.json(
        { error: 'employee_id e type são obrigatórios' },
        { status: 400 },
      );
    }

    if (!['entrada', 'saida'].includes(type)) {
      return NextResponse.json(
        { error: 'type deve ser "entrada" ou "saida"' },
        { status: 400 },
      );
    }

    const [record] = await db('records')
      .insert({
        employee_id,
        type,
        photo: photo || null,
        lat: lat || null,
        lng: lng || null,
        timestamp: new Date(),
      })
      .returning('*');

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error('Erro ao registrar ponto:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
