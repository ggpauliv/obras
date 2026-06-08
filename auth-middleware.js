/**
 * Middlewares de autenticação JWT
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

/**
 * Verifica se o token JWT é válido
 * Extrai o usuário do token e o adiciona a req.usuario
 */
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    console.error('❌ Token inválido:', error.message);
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

/**
 * Cria um token JWT para um usuário
 */
function gerarToken(usuarioId, email, empresaId, isSuper) {
  return jwt.sign(
    { id: usuarioId, email, empresaId: empresaId || null, isSuper: !!isSuper },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = {
  autenticar,
  gerarToken,
  JWT_SECRET,
};
