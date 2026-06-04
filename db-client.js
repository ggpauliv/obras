/**
 * Gerenciador de conexão com PostgreSQL
 * Usa a biblioteca pg (node-postgres)
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Carregar .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Configuração da conexão
const dbConfig = {
  user: process.env.DB_USER || 'pawliv_user',
  password: process.env.DB_PASSWORD || '123',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5433,
  database: process.env.DB_NAME || 'pawliv_obras',
};

console.log('🔧 Configuração DB:', { user: dbConfig.user, host: dbConfig.host, port: dbConfig.port, database: dbConfig.database, password_length: dbConfig.password ? dbConfig.password.length : 0, password_first_3: dbConfig.password ? dbConfig.password.substring(0, 3) : 'NONE' });

const pool = new Pool(dbConfig);

// Event listeners para debugging
pool.on('error', (err) => {
  console.error('❌ Erro não esperado na pool do PostgreSQL:', err);
});

pool.on('connect', () => {
  console.log('✅ Conexão com PostgreSQL estabelecida');
});

/**
 * Executa uma query no banco
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    // Apenas log para queries lentas (> 500ms)
    if (duration > 500) {
      console.log('⏱️  Query lenta detectada:', { text, duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('❌ Erro na query:', { text, error });
    throw error;
  }
}

/**
 * Obtém uma transação
 */
async function getClient() {
  return pool.connect();
}

module.exports = {
  query,
  getClient,
  pool,
};
