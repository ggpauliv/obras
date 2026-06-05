/**
 * Backend API REST completa com PostgreSQL
 * Roda em http://localhost:3001
 * Inclui: CRUD de obras, fases, despesas, fornecedores, usuários, autenticação e auditoria
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const bcryptjs = require('bcryptjs');
const fs = require('fs');
const os = require('os');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Converte qualquer valor para número seguro para NUMERIC(15,2)
function sanitizeNumero(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'string') {
    // Remove formatação brasileira: "1.234.567,89" -> 1234567.89
    val = val.replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  }
  const n = parseFloat(val);
  if (isNaN(n) || !isFinite(n)) return null;
  // Limita a NUMERIC(15,2): max 9.999.999.999.999,99
  const clamped = Math.min(Math.abs(n), 9999999999999.99) * (n < 0 ? -1 : 1);
  return parseFloat(clamped.toFixed(2));
}

// Importar módulos customizados
const db = require('./db-client');
const { autenticar, gerarToken } = require('./auth-middleware');
const { extrairOrcamento } = require('./orcamento-extrator');

// Carregar .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = 3001;
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

if (!GEMINI_API_KEY) {
  console.warn('⚠️  REACT_APP_GEMINI_API_KEY não está configurada');
}

console.log('✅ Servidor API iniciando...');

// ============================================
// ROTAS DE SAÚDE
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API REST rodando' });
});

// DEBUG: Listar usuários
app.get('/api/debug/usuarios', async (req, res) => {
  try {
    const result = await db.query('SELECT id, email, nome FROM usuarios LIMIT 5');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// ============================================
// AUTENTICAÇÃO
// ============================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    console.log(`🔐 Login tentativa: ${email}`);

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha obrigatórios' });
    }

    console.log(`📧 Procurando usuário: ${email}`);
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    console.log(`✅ Query executada, ${result.rows.length} usuários encontrados`);

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const usuario = result.rows[0];
    console.log(`👤 Usuário encontrado: ${usuario.nome}, ativo: ${usuario.ativo}`);

    if (!usuario.ativo) {
      return res.status(403).json({ erro: 'Usuário inativo' });
    }

    // Verificar senha (bcryptjs usa callback, não promise)
    bcryptjs.compare(senha, usuario.senha_hash, (err, senhaValida) => {
      if (err) {
        console.error('❌ Erro ao comparar:', err);
        return res.status(500).json({ erro: 'Erro ao verificar senha' });
      }

      if (!senhaValida) {
        return res.status(401).json({ erro: 'Email ou senha inválidos' });
      }

      const token = gerarToken(usuario.id, usuario.email);

      res.json({
        sucesso: true,
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
        },
      });
    });
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, email e senha obrigatórios' });
    }

    // Verificar se usuário já existe
    const existing = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }

    // Hash da senha
    const senhaHash = await bcryptjs.hash(senha, 10);

    const result = await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, ativo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email',
      [nome, email, senhaHash, true]
    );

    const usuarioNovo = result.rows[0];
    const token = gerarToken(usuarioNovo.id, usuarioNovo.email);

    res.status(201).json({
      sucesso: true,
      token,
      usuario: usuarioNovo,
    });
  } catch (error) {
    console.error('❌ Erro no registro:', error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// ============================================
// OBRAS
// ============================================

// GET /api/obras
app.get('/api/obras', autenticar, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nome, cliente, tipo, inicio, termino, pct, status FROM obras ORDER BY criado_em DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao listar obras:', error);
    res.status(500).json({ erro: 'Erro ao listar obras' });
  }
});

// GET /api/obras/:id
app.get('/api/obras/:id', autenticar, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nome, cliente, tipo, inicio, termino, pct, status FROM obras WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Obra não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao obter obra:', error);
    res.status(500).json({ erro: 'Erro ao obter obra' });
  }
});

// POST /api/obras
app.post('/api/obras', autenticar, async (req, res) => {
  try {
    const { nome, cliente, tipo, inicio, termino, status, pct } = req.body;

    if (!nome || !cliente || !inicio || !termino) {
      return res.status(400).json({ erro: 'Campos obrigatórios: nome, cliente, inicio, termino' });
    }

    const result = await db.query(
      'INSERT INTO obras (nome, cliente, tipo, inicio, termino, pct, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [nome, cliente, tipo, inicio, termino, pct || 0, status || 'planejamento']
    );

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [result.rows[0].id, 'CREATE', 'Obra criada', `Obra "${nome}" criada`, req.usuario.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao criar obra:', error);
    res.status(500).json({ erro: 'Erro ao criar obra' });
  }
});

// PUT /api/obras/:id
app.put('/api/obras/:id', autenticar, async (req, res) => {
  try {
    const { nome, cliente, tipo, inicio, termino, status, pct } = req.body;

    const result = await db.query(
      'UPDATE obras SET nome = COALESCE($1, nome), cliente = COALESCE($2, cliente), tipo = COALESCE($3, tipo), inicio = COALESCE($4, inicio), termino = COALESCE($5, termino), status = COALESCE($6, status), pct = COALESCE($7, pct) WHERE id = $8 RETURNING *',
      [nome, cliente, tipo, inicio, termino, status, pct, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Obra não encontrada' });
    }

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, 'UPDATE', 'Obra atualizada', `Obra "${result.rows[0].nome}" atualizada`, req.usuario.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao atualizar obra:', error);
    res.status(500).json({ erro: 'Erro ao atualizar obra' });
  }
});

// DELETE /api/obras/:id
app.delete('/api/obras/:id', autenticar, async (req, res) => {
  try {
    // Obter nome da obra antes de deletar
    const obraResult = await db.query('SELECT nome FROM obras WHERE id = $1', [req.params.id]);

    if (obraResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Obra não encontrada' });
    }

    const nomObra = obraResult.rows[0].nome;

    // Deletar obra (cascata deletará fases, despesas relacionadas)
    const result = await db.query('DELETE FROM obras WHERE id = $1', [req.params.id]);

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4)',
      ['DELETE', 'Obra deletada', `Obra "${nomObra}" foi removida`, req.usuario.id]
    );

    res.json({ sucesso: true, mensagem: 'Obra deletada' });
  } catch (error) {
    console.error('❌ Erro ao deletar obra:', error);
    res.status(500).json({ erro: 'Erro ao deletar obra' });
  }
});

// ============================================
// FASES
// ============================================

// GET /api/fases?obraId=...
app.get('/api/fases', autenticar, async (req, res) => {
  try {
    const { obraId } = req.query;

    let query = 'SELECT id, obra_id, ordem, nome, inicio, termino, pct, status, categoria, descricao FROM fases';
    let params = [];

    if (obraId) {
      query += ' WHERE obra_id = $1';
      params.push(obraId);
    }

    query += ' ORDER BY ordem';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao listar fases:', error);
    res.status(500).json({ erro: 'Erro ao listar fases' });
  }
});

// POST /api/fases
app.post('/api/fases', autenticar, async (req, res) => {
  try {
    const { obraId, ordem, nome, inicio, termino, pct, status, categoria, descricao } = req.body;

    if (!obraId || !ordem || !nome || !inicio || !termino) {
      return res.status(400).json({ erro: 'Campos obrigatórios: obraId, ordem, nome, inicio, termino' });
    }

    const result = await db.query(
      'INSERT INTO fases (obra_id, ordem, nome, inicio, termino, pct, status, categoria, descricao) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [obraId, ordem, nome, inicio, termino, pct || 0, status || 'nao_iniciada', categoria, descricao]
    );

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [obraId, 'CREATE', 'Fase criada', `Fase "${nome}" adicionada`, req.usuario.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao criar fase:', error);
    res.status(500).json({ erro: 'Erro ao criar fase' });
  }
});

// PUT /api/fases/:id
app.put('/api/fases/:id', autenticar, async (req, res) => {
  try {
    const { nome, inicio, termino, pct, status, categoria, descricao } = req.body;

    const result = await db.query(
      'UPDATE fases SET nome = COALESCE($1, nome), inicio = COALESCE($2, inicio), termino = COALESCE($3, termino), pct = COALESCE($4, pct), status = COALESCE($5, status), categoria = COALESCE($6, categoria), descricao = COALESCE($7, descricao) WHERE id = $8 RETURNING *',
      [nome, inicio, termino, pct, status, categoria, descricao, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Fase não encontrada' });
    }

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [result.rows[0].obra_id, 'UPDATE', 'Fase atualizada', `Fase "${result.rows[0].nome}" atualizada`, req.usuario.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao atualizar fase:', error);
    res.status(500).json({ erro: 'Erro ao atualizar fase' });
  }
});

// DELETE /api/fases/:id
app.delete('/api/fases/:id', autenticar, async (req, res) => {
  try {
    const faseResult = await db.query('SELECT nome, obra_id FROM fases WHERE id = $1', [req.params.id]);

    if (faseResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Fase não encontrada' });
    }

    const { nome, obra_id } = faseResult.rows[0];

    await db.query('DELETE FROM fases WHERE id = $1', [req.params.id]);

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [obra_id, 'DELETE', 'Fase deletada', `Fase "${nome}" foi removida`, req.usuario.id]
    );

    res.json({ sucesso: true, mensagem: 'Fase deletada' });
  } catch (error) {
    console.error('❌ Erro ao deletar fase:', error);
    res.status(500).json({ erro: 'Erro ao deletar fase' });
  }
});

// ============================================
// DESPESAS
// ============================================

// GET /api/despesas?obraId=...
app.get('/api/despesas', autenticar, async (req, res) => {
  try {
    const { obraId } = req.query;

    let query = 'SELECT id, obra_id, fase_id, descricao, categoria, valor, data, fornecedor, cnpj, numero_nota, chave_acesso FROM despesas';
    let params = [];

    if (obraId) {
      query += ' WHERE obra_id = $1';
      params.push(obraId);
    }

    query += ' ORDER BY data DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao listar despesas:', error);
    res.status(500).json({ erro: 'Erro ao listar despesas' });
  }
});

// POST /api/despesas
app.post('/api/despesas', autenticar, async (req, res) => {
  try {
    const { obraId, faseId, descricao, categoria, valor, data, fornecedor, cnpj, numeroNota, chaveAcesso } = req.body;

    if (!obraId || !descricao || !valor || !data) {
      return res.status(400).json({ erro: 'Campos obrigatórios: obraId, descricao, valor, data' });
    }

    const result = await db.query(
      'INSERT INTO despesas (obra_id, fase_id, descricao, categoria, valor, data, fornecedor, cnpj, numero_nota, chave_acesso) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [obraId, faseId || null, descricao, categoria, valor, data, fornecedor, cnpj, numeroNota, chaveAcesso]
    );

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [obraId, 'CREATE', 'Despesa lançada', `Despesa "${descricao}" de R$ ${valor} registrada`, req.usuario.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao criar despesa:', error);
    res.status(500).json({ erro: 'Erro ao criar despesa' });
  }
});

// PUT /api/despesas/:id
app.put('/api/despesas/:id', autenticar, async (req, res) => {
  try {
    const { descricao, categoria, valor, data, fornecedor, cnpj, numeroNota, chaveAcesso } = req.body;

    const result = await db.query(
      'UPDATE despesas SET descricao = COALESCE($1, descricao), categoria = COALESCE($2, categoria), valor = COALESCE($3, valor), data = COALESCE($4, data), fornecedor = COALESCE($5, fornecedor), cnpj = COALESCE($6, cnpj), numero_nota = COALESCE($7, numero_nota), chave_acesso = COALESCE($8, chave_acesso) WHERE id = $9 RETURNING *',
      [descricao, categoria, valor, data, fornecedor, cnpj, numeroNota, chaveAcesso, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Despesa não encontrada' });
    }

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [result.rows[0].obra_id, 'UPDATE', 'Despesa atualizada', `Despesa "${result.rows[0].descricao}" atualizada`, req.usuario.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao atualizar despesa:', error);
    res.status(500).json({ erro: 'Erro ao atualizar despesa' });
  }
});

// DELETE /api/despesas/:id
app.delete('/api/despesas/:id', autenticar, async (req, res) => {
  try {
    const despesaResult = await db.query('SELECT descricao, valor, obra_id FROM despesas WHERE id = $1', [req.params.id]);

    if (despesaResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Despesa não encontrada' });
    }

    const { descricao, valor, obra_id } = despesaResult.rows[0];

    await db.query('DELETE FROM despesas WHERE id = $1', [req.params.id]);

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [obra_id, 'DELETE', 'Despesa deletada', `Despesa "${descricao}" (R$ ${valor}) foi removida`, req.usuario.id]
    );

    res.json({ sucesso: true, mensagem: 'Despesa deletada' });
  } catch (error) {
    console.error('❌ Erro ao deletar despesa:', error);
    res.status(500).json({ erro: 'Erro ao deletar despesa' });
  }
});

// ============================================
// FORNECEDORES
// ============================================

// GET /api/fornecedores
app.get('/api/fornecedores', autenticar, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nome, categoria, cnpj, contato, status FROM fornecedores ORDER BY nome'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao listar fornecedores:', error);
    res.status(500).json({ erro: 'Erro ao listar fornecedores' });
  }
});

// POST /api/fornecedores
app.post('/api/fornecedores', autenticar, async (req, res) => {
  try {
    const { nome, categoria, cnpj, contato, status } = req.body;

    if (!nome) {
      return res.status(400).json({ erro: 'Campo obrigatório: nome' });
    }

    const result = await db.query(
      'INSERT INTO fornecedores (nome, categoria, cnpj, contato, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, categoria, cnpj, contato, status || 'ativo']
    );

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4)',
      ['CREATE', 'Fornecedor criado', `Fornecedor "${nome}" cadastrado`, req.usuario.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao criar fornecedor:', error);
    res.status(500).json({ erro: 'Erro ao criar fornecedor' });
  }
});

// PUT /api/fornecedores/:id
app.put('/api/fornecedores/:id', autenticar, async (req, res) => {
  try {
    const { nome, categoria, cnpj, contato, status } = req.body;

    const result = await db.query(
      'UPDATE fornecedores SET nome = COALESCE($1, nome), categoria = COALESCE($2, categoria), cnpj = COALESCE($3, cnpj), contato = COALESCE($4, contato), status = COALESCE($5, status) WHERE id = $6 RETURNING *',
      [nome, categoria, cnpj, contato, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Fornecedor não encontrado' });
    }

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4)',
      ['UPDATE', 'Fornecedor atualizado', `Fornecedor "${result.rows[0].nome}" atualizado`, req.usuario.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao atualizar fornecedor:', error);
    res.status(500).json({ erro: 'Erro ao atualizar fornecedor' });
  }
});

// DELETE /api/fornecedores/:id
app.delete('/api/fornecedores/:id', autenticar, async (req, res) => {
  try {
    const fornecedorResult = await db.query('SELECT nome FROM fornecedores WHERE id = $1', [req.params.id]);

    if (fornecedorResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Fornecedor não encontrado' });
    }

    const nome = fornecedorResult.rows[0].nome;

    await db.query('DELETE FROM fornecedores WHERE id = $1', [req.params.id]);

    // Registrar auditoria
    await db.query(
      'INSERT INTO auditoria (tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4)',
      ['DELETE', 'Fornecedor deletado', `Fornecedor "${nome}" foi removido`, req.usuario.id]
    );

    res.json({ sucesso: true, mensagem: 'Fornecedor deletado' });
  } catch (error) {
    console.error('❌ Erro ao deletar fornecedor:', error);
    res.status(500).json({ erro: 'Erro ao deletar fornecedor' });
  }
});

// ============================================
// AUDITORIA
// ============================================

// GET /api/auditoria?obraId=...
app.get('/api/auditoria', autenticar, async (req, res) => {
  try {
    const { obraId } = req.query;

    let query = `SELECT a.id, a.obra_id, a.tipo, a.titulo, a.descricao, a.usuario_id, a.data, u.nome as usuario_nome
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id`;
    let params = [];

    if (obraId) {
      query += ' WHERE a.obra_id = $1';
      params.push(obraId);
    }

    query += ' ORDER BY a.data DESC LIMIT 100';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao listar auditoria:', error);
    res.status(500).json({ erro: 'Erro ao listar auditoria' });
  }
});

// ============================================
// ORÇAMENTOS
// ============================================

// GET /api/orcamentos?obraId=...
app.get('/api/orcamentos', autenticar, async (req, res) => {
  try {
    const { obraId } = req.query;

    let query = `SELECT o.id, o.obra_id, o.fornecedor_id, o.nome, o.descricao, o.valor_total,
      o.prazo_dias, o.status, o.data_envio, o.data_emissao, o.numero_cotacao, o.criado_em,
      f.nome as fornecedor_nome
      FROM orcamentos o
      LEFT JOIN fornecedores f ON o.fornecedor_id = f.id`;
    let params = [];

    if (obraId) {
      query += ' WHERE o.obra_id = $1';
      params.push(obraId);
    }

    query += ' ORDER BY o.criado_em DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao listar orçamentos:', error);
    res.status(500).json({ erro: 'Erro ao listar orçamentos' });
  }
});

// GET /api/orcamentos/:id
app.get('/api/orcamentos/:id', autenticar, async (req, res) => {
  try {
    const orcamento = await db.query(
      `SELECT o.*, f.nome as fornecedor_nome FROM orcamentos o
       LEFT JOIN fornecedores f ON o.fornecedor_id = f.id
       WHERE o.id = $1`,
      [req.params.id]
    );

    if (orcamento.rows.length === 0) {
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }

    const linhas = await db.query(
      'SELECT * FROM linhas_orcamento WHERE orcamento_id = $1 ORDER BY item_numero',
      [req.params.id]
    );

    res.json({
      ...orcamento.rows[0],
      linhas: linhas.rows,
    });
  } catch (error) {
    console.error('❌ Erro ao obter orçamento:', error);
    res.status(500).json({ erro: 'Erro ao obter orçamento' });
  }
});

// POST /api/orcamentos
app.post('/api/orcamentos', autenticar, async (req, res) => {
  try {
    const { obraId, fornecedorId, nome, descricao, valorTotal, prazoDias, dataEmissao, dataCotacao, linhas } = req.body;

    if (!obraId || !nome) {
      return res.status(400).json({ erro: 'Campos obrigatórios: obraId, nome' });
    }

    const result = await db.query(
      `INSERT INTO orcamentos (obra_id, fornecedor_id, nome, descricao, valor_total, prazo_dias, data_emissao, numero_cotacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [obraId, fornecedorId || null, nome, descricao, valorTotal, prazoDias, dataEmissao, dataCotacao]
    );

    const orcamentoId = result.rows[0].id;

    // Inserir linhas se fornecidas
    if (Array.isArray(linhas) && linhas.length > 0) {
      for (const linha of linhas) {
        await db.query(
          `INSERT INTO linhas_orcamento (orcamento_id, item_numero, descricao, quantidade, valor_unitario, valor_total, categoria)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [orcamentoId, linha.itemNumero, linha.descricao, linha.quantidade, linha.valorUnitario, linha.valorTotal, linha.categoria]
        );
      }
    }

    // Auditoria
    await db.query(
      'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [obraId, 'CREATE', 'Orçamento criado', `Orçamento "${nome}" adicionado`, req.usuario.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao criar orçamento:', error);
    res.status(500).json({ erro: 'Erro ao criar orçamento' });
  }
});

// DELETE /api/orcamentos/:id
app.delete('/api/orcamentos/:id', autenticar, async (req, res) => {
  try {
    const orcResult = await db.query('SELECT nome, obra_id FROM orcamentos WHERE id = $1', [req.params.id]);

    if (orcResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }

    const { nome, obra_id } = orcResult.rows[0];

    await db.query('DELETE FROM orcamentos WHERE id = $1', [req.params.id]);

    // Auditoria
    await db.query(
      'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [obra_id, 'DELETE', 'Orçamento deletado', `Orçamento "${nome}" foi removido`, req.usuario.id]
    );

    res.json({ sucesso: true, mensagem: 'Orçamento deletado' });
  } catch (error) {
    console.error('❌ Erro ao deletar orçamento:', error);
    res.status(500).json({ erro: 'Erro ao deletar orçamento' });
  }
});

// Chama Gemini com retry automático em caso de 503 (sobrecarga) ou 429 (cota/rate-limit)
async function chamarGeminiComRetry(prompt, maxTentativas = 4) {
  const modelos = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
  let ultimoErro;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    const modelo = modelos[Math.min(tentativa - 1, modelos.length - 1)];
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: modelo,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          maxOutputTokens: 65536,
        },
      });
      const result = await model.generateContent(prompt);
      const cand = result.response?.candidates?.[0];
      const finish = cand?.finishReason;
      const texto = result.response.text();
      if (finish && finish !== 'STOP') {
        console.warn(`⚠️ Gemini finishReason=${finish} (resposta possivelmente truncada), ${texto.length} chars`);
      }
      return texto;
    } catch (err) {
      ultimoErro = err;
      const msg = err.message || '';
      const is503 = msg.includes('503') || msg.includes('overloaded') || msg.includes('high demand');
      const is429 = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota');
      if (!is503 && !is429) throw err; // erro não-transitório, não tentar de novo

      // Respeita o retryDelay sugerido pela API (se houver), com teto de 40s.
      let espera = tentativa * 8000;
      const m = msg.match(/retry in ([\d.]+)s/i) || msg.match(/"retryDelay":\s*"(\d+)s"/);
      if (m) espera = Math.min(Math.ceil(parseFloat(m[1])) * 1000 + 1000, 40000);
      console.log(`⏳ Gemini ${is429 ? '429' : '503'} — tentativa ${tentativa}/${maxTentativas} (${modelo}), aguardando ${Math.round(espera/1000)}s...`);
      await new Promise(r => setTimeout(r, espera));
    }
  }
  throw ultimoErro;
}

// POST /api/orcamentos/analisar — Analisa Excel OU PDF com Gemini, retorna JSON sem salvar.
// Detecta automaticamente UM ou VÁRIOS fornecedores (mapas de equalização) e
// retorna sempre uma lista "orcamentos" (um objeto por fornecedor).
app.post('/api/orcamentos/analisar', autenticar, async (req, res) => {
  const XLSX = require('xlsx');
  if (!GEMINI_API_KEY) return res.status(500).json({ erro: 'Gemini API não configurada' });

  try {
    const { arquivo } = req.body;
    if (!arquivo) return res.status(400).json({ erro: 'arquivo é obrigatório' });

    const buffer = Buffer.from(arquivo, 'base64');
    const ehPDF = buffer.slice(0, 5).toString('latin1') === '%PDF-';

    const instrucoes = `Você é um especialista em orçamentos de construção civil.
O documento pode conter UM único fornecedor OU VÁRIOS fornecedores (mapa de
equalização / comparação, com fornecedores em colunas ou seções distintas).
Identifique CADA fornecedor distinto e gere um objeto de orçamento por fornecedor.

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "orcamentos": [
    {
      "fornecedor": "nome da empresa fornecedora",
      "cnpj": "CNPJ formatado ou null",
      "numeroCotacao": "número da cotação ou null",
      "dataEmissao": "YYYY-MM-DD ou null",
      "prazoDias": número de dias de prazo ou null,
      "valorTotal": número (sem R$, pontos ou vírgulas de milhar),
      "linhas": [
        {
          "itemNumero": "1.1",
          "descricao": "descrição do item",
          "unidade": "un/m²/kg/etc",
          "quantidade": número,
          "valorUnitario": número,
          "valorTotal": número,
          "categoria": "uma de: Estrutura, Alvenaria, Cobertura, Instalações Elétricas, Instalações Hidráulicas, Acabamento, Pintura, Fundações, Terraplanagem, Serviços Gerais, Materiais, Mão de Obra"
        }
      ],
      "avisos": ["inconsistências detectadas, se houver"]
    }
  ]
}
REGRAS:
- Se houver apenas um fornecedor, retorne o array com um único item.
- Em mapas de equalização, cada coluna/seção de preços é um fornecedor; as descrições
  dos itens costumam ser compartilhadas — replique a descrição em cada fornecedor com
  os respectivos preços daquele fornecedor.
- Valores numéricos devem ser números (sem R$, pontos ou vírgulas de milhar).
- Se o valorTotal de um fornecedor não estiver explícito, some os itens dele.
- Ignore cabeçalhos, totalizadores duplicados e células vazias.
- Para categoria, infira pelo contexto do item.`;

    let content;
    if (ehPDF) {
      content = [
        { text: instrucoes },
        { inlineData: { mimeType: 'application/pdf', data: arquivo } },
      ];
    } else {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let conteudoTexto = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
        if (csv.trim().length > 0) conteudoTexto += `\n=== ABA: ${sheetName} ===\n${csv}\n`;
      }
      if (conteudoTexto.length > 60000) conteudoTexto = conteudoTexto.substring(0, 60000) + '\n...[truncado]';
      content = `${instrucoes}\n\nPLANILHA:\n${conteudoTexto}`;
    }

    const resposta = await chamarGeminiComRetry(content);

    let parsed;
    try {
      // Remove cercas de código e isola do primeiro "{" ao último "}".
      let txt = resposta.replace(/```json/gi, '').replace(/```/g, '').trim();
      const ini = txt.indexOf('{');
      const fim = txt.lastIndexOf('}');
      if (ini >= 0 && fim > ini) txt = txt.slice(ini, fim + 1);
      parsed = JSON.parse(txt);
    } catch (e) {
      console.error('❌ JSON inválido da IA. Tamanho:', resposta.length, '| início:', resposta.slice(0, 200), '| fim:', resposta.slice(-200));
      return res.status(500).json({
        erro: 'A IA retornou uma resposta grande demais ou incompleta para este documento. ' +
              'Tente um arquivo com menos fornecedores/itens, ou me avise para ajustar a extração.',
      });
    }

    // Aceita {orcamentos:[...]} ou, por robustez, um objeto único antigo.
    let orcamentos = Array.isArray(parsed.orcamentos)
      ? parsed.orcamentos
      : (parsed.fornecedor || parsed.linhas) ? [parsed] : [];

    orcamentos = orcamentos
      .map((o) => {
        let valorTotal = sanitizeNumero(o.valorTotal);
        if (!valorTotal && Array.isArray(o.linhas)) {
          valorTotal = o.linhas.reduce((acc, l) => acc + (sanitizeNumero(l.valorTotal) || 0), 0);
        }
        return { ...o, valorTotal, linhas: o.linhas || [], avisos: o.avisos || [] };
      })
      .filter((o) => o.fornecedor || (o.linhas && o.linhas.length));

    if (orcamentos.length === 0) {
      return res.status(422).json({ erro: 'Nenhum fornecedor/orçamento foi identificado no documento.' });
    }

    // "dados" mantido para compatibilidade; "orcamentos" é a lista completa.
    res.json({ sucesso: true, orcamentos, dados: orcamentos[0] });
  } catch (error) {
    console.error('❌ Erro ao analisar orçamento:', error);
    res.status(500).json({ erro: 'Erro ao analisar: ' + error.message });
  }
});

// POST /api/orcamentos/salvar — Salva orçamento já analisado no banco
app.post('/api/orcamentos/salvar', autenticar, async (req, res) => {
  try {
    const { obraId, dados } = req.body;
    if (!obraId || !dados) return res.status(400).json({ erro: 'obraId e dados são obrigatórios' });

    const nomeFornecedor = dados.fornecedor || 'Fornecedor Desconhecido';

    // Upsert fornecedor
    let fornecedorId = null;
    if (dados.cnpj) {
      const found = await db.query('SELECT id FROM fornecedores WHERE cnpj = $1', [dados.cnpj]);
      if (found.rows.length > 0) {
        fornecedorId = found.rows[0].id;
      } else {
        const novo = await db.query('INSERT INTO fornecedores (nome, cnpj, status) VALUES ($1, $2, $3) RETURNING id',
          [nomeFornecedor, dados.cnpj, 'ativo']);
        fornecedorId = novo.rows[0].id;
      }
    } else {
      const found = await db.query('SELECT id FROM fornecedores WHERE LOWER(nome) = LOWER($1)', [nomeFornecedor]);
      if (found.rows.length > 0) {
        fornecedorId = found.rows[0].id;
      } else {
        const novo = await db.query('INSERT INTO fornecedores (nome, status) VALUES ($1, $2) RETURNING id',
          [nomeFornecedor, 'ativo']);
        fornecedorId = novo.rows[0].id;
      }
    }

    const valorTotal = sanitizeNumero(dados.valorTotal) ||
      (dados.linhas || []).reduce((acc, l) => acc + (sanitizeNumero(l.valorTotal) || 0), 0);

    const nomeOrca = `${nomeFornecedor} - ${dados.numeroCotacao || new Date().toLocaleDateString('pt-BR')}`;
    const orcResult = await db.query(
      `INSERT INTO orcamentos (obra_id, fornecedor_id, nome, valor_total, prazo_dias, data_emissao, numero_cotacao, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [obraId, fornecedorId, nomeOrca, valorTotal, dados.prazoDias || null,
       dados.dataEmissao || null, dados.numeroCotacao || null, 'ativo']
    );
    const orcamentoId = orcResult.rows[0].id;

    if (Array.isArray(dados.linhas)) {
      for (const linha of dados.linhas) {
        await db.query(
          `INSERT INTO linhas_orcamento (orcamento_id, item_numero, descricao, quantidade, valor_unitario, valor_total, categoria)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [orcamentoId, String(linha.itemNumero || ''), linha.descricao || '',
           sanitizeNumero(linha.quantidade) || 1, sanitizeNumero(linha.valorUnitario),
           sanitizeNumero(linha.valorTotal), linha.categoria || 'Serviços Gerais']
        );
      }
    }

    await db.query(
      'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1,$2,$3,$4,$5)',
      [obraId, 'CREATE', 'Orçamento salvo (IA)',
       `${nomeFornecedor}: ${dados.linhas?.length || 0} itens, R$ ${valorTotal?.toLocaleString('pt-BR') || '—'}`,
       req.usuario.id]
    );

    res.status(201).json({ sucesso: true, orcamento: { ...orcResult.rows[0], nome: nomeOrca, valorTotal } });
  } catch (error) {
    console.error('❌ Erro ao salvar orçamento:', error);
    res.status(500).json({ erro: 'Erro ao salvar: ' + error.message });
  }
});

// GET /api/orcamentos/comparar?obraId=...
app.get('/api/orcamentos/comparar', autenticar, async (req, res) => {
  try {
    const { obraId } = req.query;

    if (!obraId) {
      return res.status(400).json({ erro: 'obraId é obrigatório' });
    }

    // Obter todos os orçamentos da obra
    const orcamentos = await db.query(
      `SELECT o.id, o.nome, o.valor_total, f.nome as fornecedor_nome
       FROM orcamentos o
       LEFT JOIN fornecedores f ON o.fornecedor_id = f.id
       WHERE o.obra_id = $1 ORDER BY o.valor_total ASC`,
      [obraId]
    );

    const comparacao = {
      totalOrcamentos: orcamentos.rows.length,
      orcamentos: orcamentos.rows,
      melhorPreco: orcamentos.rows[0]?.valor_total || null,
      maiorPreco: orcamentos.rows[orcamentos.rows.length - 1]?.valor_total || null,
      diferenca: (orcamentos.rows[orcamentos.rows.length - 1]?.valor_total || 0) - (orcamentos.rows[0]?.valor_total || 0),
    };

    // Calcular economia relativa
    if (comparacao.melhorPreco && comparacao.maiorPreco) {
      comparacao.economiaPercentual = ((comparacao.diferenca / comparacao.maiorPreco) * 100).toFixed(2);
    }

    res.json(comparacao);
  } catch (error) {
    console.error('❌ Erro ao comparar orçamentos:', error);
    res.status(500).json({ erro: 'Erro ao comparar orçamentos' });
  }
});

// ============================================
// PROCESSAMENTO DE DOCUMENTOS (GEMINI)
// ============================================

app.post('/api/process-document', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ erro: 'Gemini API não configurada' });
  }

  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ erro: 'Content é obrigatório' });
    }

    const systemPrompt = `Você é um especialista em gestão de obras industriais e comerciais. Analise o documento fornecido e extraia itens de obra em formato JSON.

O documento pode ser de DIVERSOS tipos, todos válidos:
- Cronograma físico-financeiro
- Orçamento detalhado / planilha orçamentária
- Estrutura Analítica de Projeto (EAP)
- Nota Fiscal (NF-e / NFS-e), pedido de compra, ordem de serviço ou contrato

IMPORTANTE: Em uma obra industrial, cada AQUISIÇÃO, INSTALAÇÃO, MANUTENÇÃO ou SERVIÇO é um item válido da obra — mesmo que o documento descreva um único item.

Retorne APENAS um JSON VÁLIDO com a seguinte estrutura:
{
  "fases": [
    {
      "id": "01",
      "nome": "Nome da fase",
      "inicio": "DD/MM/YYYY",
      "termino": "DD/MM/YYYY",
      "orc": "R$ X.XXX,XX",
      "categoria": "compra",
      "descricao": "Descrição breve",
      "confianca": 95
    }
  ],
  "avisos": [],
  "financeiro": null,
  "confiancaGeral": 90,
  "tipoDocumento": "Cronograma/Orçamento/Nota Fiscal/Pedido de Compra/Projeto/Outro"
}`;

    let parts = [];

    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === 'text') {
          parts.push({ text: part.text });
        } else if (part.type === 'image') {
          parts.push({
            inlineData: {
              mimeType: part.source.media_type,
              data: part.source.data,
            },
          });
        }
      }
    } else if (typeof content === 'string') {
      parts.push({ text: content });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: parts,
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Erro Gemini (${response.status}): ${
          errorData.error?.message || JSON.stringify(errorData)
        }`
      );
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Resposta sem texto');
    }

    const textoResposta = data.candidates[0].content.parts[0].text;
    const dadosExtraidos = JSON.parse(textoResposta);

    res.json({
      sucesso: true,
      fases: dadosExtraidos.fases || [],
      avisos: dadosExtraidos.avisos || [],
      financeiro: dadosExtraidos.financeiro || null,
      metadados: {
        tipoDocumento: dadosExtraidos.tipoDocumento || 'Desconhecido',
        confiancaGeral: dadosExtraidos.confiancaGeral || 75,
      },
    });
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    res.status(500).json({ erro: `Erro no servidor: ${error.message}` });
  }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`\n🚀 API REST rodando em http://localhost:${PORT}`);
  console.log(`📝 Documentação: consulte README ou Postman collection\n`);
});
