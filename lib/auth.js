const jwt = require('jsonwebtoken');

// Falha ruidosamente no startup se JWT_SECRET não estiver definido.
// Nunca deve rodar em produção sem essa variável.
if (!process.env.JWT_SECRET) {
  throw new Error('Variável de ambiente JWT_SECRET não definida.');
}

/**
 * Extrai e valida o JWT do header Authorization.
 * Retorna o payload decodificado ou null se inválido.
 */
function verifyAuth(request) {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;

  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { verifyAuth };
