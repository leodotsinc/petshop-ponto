import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/rate-limit';
import {
  getBusinessDateKey,
  getBusinessDayRange,
  getBusinessMonthRange,
  getNextRecordType,
} from '@/lib/timekeeping';

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
        'employees.cpf as employee_cpf',
        'employees.role as employee_role',
        'employees.admission_date as employee_admission_date',
      )
      .orderBy('records.timestamp', 'desc');

    if (employeeId) {
      query = query.where('records.employee_id', employeeId);
    }

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'Formato de data inválido (YYYY-MM-DD)' }, { status: 400 });
      }
      const { start, end } = getBusinessDayRange(date);
      query = query
        .where('records.timestamp', '>=', start.toISOString())
        .andWhere('records.timestamp', '<', end.toISOString());
    }

    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: 'Formato de mês inválido (YYYY-MM)' }, { status: 400 });
      }
      const { start, end } = getBusinessMonthRange(month);
      query = query
        .where('records.timestamp', '>=', start.toISOString())
        .andWhere('records.timestamp', '<', end.toISOString());
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
 * Cria um novo registro de ponto. Requer PIN do funcionário.
 */
export async function POST(request) {
  try {
    const { employee_id, photo, lat, lng, pin } = await request.json();

    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id é obrigatório' }, { status: 400 });
    }

    // Rate limit por funcionário (10 tentativas por 15min)
    const rl = rateLimit(`pin:${employee_id}`, 10);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Muitas tentativas. Tente novamente em ${rl.retryAfter}s.` },
        { status: 429 },
      );
    }

    // Valida que o funcionário existe e está ativo
    const employee = await db('employees').where({ id: employee_id, active: true }).first();
    if (!employee) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 });
    }

    // Verifica PIN
    if (!pin) {
      return NextResponse.json({ error: 'PIN obrigatório' }, { status: 401 });
    }
    if (!employee.pin_hash) {
      return NextResponse.json({ error: 'Funcionário sem PIN cadastrado. Contate o administrador.' }, { status: 400 });
    }
    const validPin = await bcrypt.compare(pin, employee.pin_hash);
    if (!validPin) {
      return NextResponse.json({ error: 'PIN incorreto' }, { status: 401 });
    }

    const { start, end } = getBusinessDayRange(getBusinessDateKey());
    const todayRecords = await db('records')
      .where({ employee_id })
      .where('timestamp', '>=', start.toISOString())
      .andWhere('timestamp', '<', end.toISOString())
      .select('type', 'timestamp')
      .orderBy('timestamp', 'asc');

    const resolvedType = getNextRecordType(todayRecords);

    if (!photo || typeof photo !== 'string') {
      return NextResponse.json({ error: 'Foto é obrigatória' }, { status: 400 });
    }

    if (!/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)) {
      return NextResponse.json({ error: 'Formato de foto inválido' }, { status: 400 });
    }

    // Limita tamanho da foto (~5MB em base64 ≈ 7MB string)
    if (photo.length > 7 * 1024 * 1024) {
      return NextResponse.json({ error: 'Foto muito grande (máx. 5MB)' }, { status: 413 });
    }

    // Valida coordenadas se fornecidas
    if (lat !== null && lat !== undefined && (lat < -90 || lat > 90)) {
      return NextResponse.json({ error: 'Latitude inválida' }, { status: 400 });
    }
    if (lng !== null && lng !== undefined && (lng < -180 || lng > 180)) {
      return NextResponse.json({ error: 'Longitude inválida' }, { status: 400 });
    }

    const [record] = await db('records')
      .insert({
        employee_id,
        type: resolvedType,
        photo,
        lat: lat || null,
        lng: lng || null,
        timestamp: new Date(),
      })
      .returning(['id', 'employee_id', 'type', 'timestamp', 'lat', 'lng', 'created_at']);

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error('Erro ao registrar ponto:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
