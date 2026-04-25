import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { getBusinessDateKey, getBusinessDayRange, getNextRecordType } from '@/lib/timekeeping';

function sanitizeEmployeePayload(body) {
  const name = body.name?.trim();
  const cpf = body.cpf ? String(body.cpf).replace(/\D/g, '').slice(0, 11) : null;
  const role = body.role ? String(body.role).trim().slice(0, 120) : null;
  const admissionDate = body.admission_date || null;

  if (admissionDate && !/^\d{4}-\d{2}-\d{2}$/.test(admissionDate)) {
    return { error: 'Data de admissão inválida' };
  }

  return {
    values: {
      name,
      cpf,
      role,
      admission_date: admissionDate || null,
    },
  };
}

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

    const { start, end } = getBusinessDayRange(getBusinessDateKey());

    await Promise.all(employees.map(async (emp) => {
      const todayRecords = await db('records')
        .where('employee_id', emp.id)
        .where('timestamp', '>=', start.toISOString())
        .andWhere('timestamp', '<', end.toISOString())
        .select('id', 'type', 'timestamp')
        .orderBy('timestamp', 'asc');

      const lastRecord = todayRecords.length > 0 ? todayRecords[todayRecords.length - 1] : null;

      emp.lastRecord = lastRecord;
      emp.nextType = getNextRecordType(todayRecords);
    }));

    const safe = employees.map(({ pin_hash, cpf, role, admission_date, ...rest }) => {
      const base = {
        ...rest,
        hasPin: !!pin_hash,
      };

      if (includeInactive) {
        base.cpf = cpf;
        base.role = role;
        base.admission_date = admission_date;
      }

      return base;
    });

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

    const body = await request.json();
    const sanitized = sanitizeEmployeePayload(body);
    if (sanitized.error) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }
    const { name, cpf, role, admission_date } = sanitized.values;
    const { pin } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Nome muito longo (máx. 100 caracteres)' }, { status: 400 });
    }
    if (!pin || pin.length < 4 || pin.length > 8) {
      return NextResponse.json({ error: 'PIN obrigatório (4 a 8 dígitos)' }, { status: 400 });
    }
    if (admission_date && !/^\d{4}-\d{2}-\d{2}$/.test(admission_date)) {
      return NextResponse.json({ error: 'Data de admissão inválida' }, { status: 400 });
    }

    const pin_hash = await bcrypt.hash(pin, 10);

    const [employee] = await db('employees')
      .insert({ name: name.trim(), cpf, role, admission_date, pin_hash })
      .returning(['id', 'name', 'cpf', 'role', 'admission_date', 'active', 'created_at']);

    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    console.error('Erro ao cadastrar funcionário:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
