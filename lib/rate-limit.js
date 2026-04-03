/**
 * Rate limiter simples em memória.
 * Para apps pequenos (< 20 funcionários) não precisa de Redis.
 */
const attempts = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;

function rateLimit(key, maxAttempts = MAX_ATTEMPTS, windowMs = WINDOW_MS) {
  const now = Date.now();
  const record = attempts.get(key);

  // Primeira tentativa ou janela expirou
  if (!record || now - record.firstAttempt > windowMs) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  // Excedeu o limite
  if (record.count >= maxAttempts) {
    const retryAfter = Math.ceil((record.firstAttempt + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  record.count++;
  return { allowed: true, remaining: maxAttempts - record.count };
}

// Limpa entradas antigas a cada minuto
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now - record.firstAttempt > WINDOW_MS) attempts.delete(key);
  }
}, 60_000).unref();

module.exports = { rateLimit };
