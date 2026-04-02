const jwt = require('jsonwebtoken');

/**
 * Extrai e valida o JWT do header Authorization.
 * Retorna o payload decodificado ou null se inválido.
 * A validação de JWT_SECRET acontece aqui (runtime), não no import (build time).
 */
function verifyAuth(request) {
  if (!process.env.JWT_SECRET) {
    throw new Error('Variável de ambiente JWT_SECRET não definida.');
  }

  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;

  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { verifyAuth };
