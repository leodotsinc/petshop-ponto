import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/rate-limit';
const jwt = require('jsonwebtoken');

/**
 * POST /api/employees/[id]/verify-pin
 * Verifica o PIN de um funcionário antes de abrir a câmera.
 * Público (não requer token admin) — protegido por rate limit.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  const employeeId = parseInt(id, 10);

  if (!employeeId || isNaN(employeeId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  // Rate limit por employee_id: 10 tentativas a cada 15 minutos
  const limit = rateLimit(`pin:${employeeId}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(limit.retryAfter / 1000)) },
      },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { pin } = body;

  if (!pin) {
    return NextResponse.json({ error: 'PIN obrigatório' }, { status: 400 });
  }

  try {
    const employee = await db('employees').where({ id: employeeId, active: true }).first();

    if (!employee) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 });
    }

    if (!employee.pin_hash) {
      return NextResponse.json({ error: 'Funcionário sem PIN cadastrado' }, { status: 401 });
    }

    const valid = await bcrypt.compare(String(pin), employee.pin_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'PIN incorreto', remaining: limit.remaining },
        { status: 401 },
      );
    }

    const token = jwt.sign(
      { role: 'employee', employeeId: employee.id },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '2h' },
    );
    return NextResponse.json({ ok: true, token, employeeName: employee.name });
  } catch (err) {
    console.error('Erro ao verificar PIN:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
