import { NextResponse } from 'next/server';
import db from '@/lib/db';
const jwt = require('jsonwebtoken');

function verifyEmployeeToken(request, expectedId) {
  if (!process.env.JWT_SECRET) return null;
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.role !== 'employee' || payload.employeeId !== expectedId) return null;
    return payload;
  } catch {
    return null;
  }
}

function calcWorkedMinutes(records) {
  const sorted = [...records].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  let minutes = 0;
  let entryTime = null;
  for (const r of sorted) {
    if (r.type === 'entrada') {
      entryTime = new Date(r.timestamp);
    } else if (r.type === 'saida' && entryTime) {
      minutes += (new Date(r.timestamp) - entryTime) / 60000;
      entryTime = null;
    }
  }
  return Math.round(minutes);
}

function calcExpectedMinutes(now, weeklyHours) {
  const days = now.getDate();
  return Math.round((weeklyHours / 7) * 60 * days);
}

/**
 * GET /api/employees/[id]/dashboard
 * Retorna registros do mês atual e banco de horas do funcionário.
 * Requer token de funcionário (emitido pelo verify-pin).
 */
export async function GET(request, { params }) {
  const { id } = await params;
  const employeeId = parseInt(id, 10);

  if (!employeeId || isNaN(employeeId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  if (!verifyEmployeeToken(request, employeeId)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const employee = await db('employees').where({ id: employeeId, active: true }).first();
    if (!employee) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 });
    }

    const weeklyHoursSetting = await db('settings').where({ key: 'weekly_hours' }).first();
    const weeklyHours = parseFloat(weeklyHoursSetting?.value || '44');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthRecords = await db('records')
      .where({ employee_id: employeeId })
      .whereBetween('timestamp', [startOfMonth.toISOString(), endOfMonth.toISOString()])
      .select('id', 'type', 'timestamp')
      .orderBy('timestamp', 'asc');

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayRecords = monthRecords.filter((r) => new Date(r.timestamp) >= startOfToday);

    const workedMinutes = calcWorkedMinutes(monthRecords);
    const expectedMinutes = calcExpectedMinutes(now, weeklyHours);
    const balanceMinutes = workedMinutes - expectedMinutes;

    const lastRecord = monthRecords.length > 0 ? monthRecords[monthRecords.length - 1] : null;
    const currentStatus = lastRecord?.type === 'entrada' ? 'presente' : 'ausente';

    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return NextResponse.json({
      employee: { id: employee.id, name: employee.name },
      today: { records: todayRecords, currentStatus, lastRecord },
      month: {
        yearMonth,
        monthName,
        records: monthRecords,
        workedMinutes,
        expectedMinutes,
        balanceMinutes,
        weeklyHours,
      },
    });
  } catch (err) {
    console.error('Erro ao buscar dashboard:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
