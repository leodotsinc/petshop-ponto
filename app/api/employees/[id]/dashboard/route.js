import { NextResponse } from 'next/server';
import db from '@/lib/db';
const jwt = require('jsonwebtoken');
import {
  calculateExpectedMonthlyMinutes,
  calculateWorkedHours,
  formatBusinessDate,
  getBusinessDateKey,
  getBusinessDayRange,
  getBusinessMonthKey,
  getBusinessMonthRange,
} from '@/lib/timekeeping';

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
    const monthKey = getBusinessMonthKey(now);
    const todayKey = getBusinessDateKey(now);
    const monthRange = getBusinessMonthRange(monthKey);
    const todayRange = getBusinessDayRange(todayKey);

    const monthRecords = await db('records')
      .where({ employee_id: employeeId })
      .where('timestamp', '>=', monthRange.start.toISOString())
      .andWhere('timestamp', '<', monthRange.end.toISOString())
      .select('id', 'type', 'timestamp')
      .orderBy('timestamp', 'asc');

    const todayRecords = monthRecords.filter((record) => {
      const timestamp = new Date(record.timestamp);
      return timestamp >= todayRange.start && timestamp < todayRange.end;
    });

    const monthHours = calculateWorkedHours(monthRecords);
    const todayHours = calculateWorkedHours(todayRecords);
    const workedMinutes = monthHours.totalMinutes;
    const expectedMinutes = calculateExpectedMonthlyMinutes(monthKey, weeklyHours, now);
    const balanceMinutes = workedMinutes - expectedMinutes;

    return NextResponse.json({
      employee: { id: employee.id, name: employee.name },
      today: {
        records: todayRecords,
        currentStatus: todayHours.currentStatus,
        lastRecord: todayHours.lastRecord,
        openEntry: todayHours.openEntry,
      },
      month: {
        yearMonth: monthKey,
        monthName: formatBusinessDate(now, { month: 'long', year: 'numeric' }),
        records: monthRecords,
        workedMinutes,
        expectedMinutes,
        balanceMinutes,
        weeklyHours,
        openEntry: monthHours.openEntry,
      },
    });
  } catch (err) {
    console.error('Erro ao buscar dashboard:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
