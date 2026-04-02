import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
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
      expiresIn: '24h',
    });

    return NextResponse.json({ token });
  } catch (err) {
    console.error('Erro no login:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
