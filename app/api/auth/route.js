import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request) {
  try {
    // Rate limit por IP — 5 tentativas a cada 15 min
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const rl = rateLimit(`auth:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Muitas tentativas. Tente novamente em ${Math.ceil(rl.retryAfter / 60)} minutos.` },
        { status: 429 },
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Senha é obrigatória' }, { status: 400 });
    }

    const setting = await db('settings').where('key', 'admin_password').first();
    if (!setting) {
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 500 });
    }

    const valid = await bcrypt.compare(password, setting.value);
    if (!valid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '24h',
    });

    return NextResponse.json({ token });
  } catch (err) {
    console.error('Erro no login:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
