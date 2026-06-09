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
    val = val.trim().replace(/[^0-9.,-]/g, '');
    if (val.includes(',')) {
      // Formato brasileiro "1.234.567,89" -> ponto é milhar, vírgula é decimal
      val = val.replace(/\./g, '').replace(',', '.');
    }
    // Caso contrário (ISO "1234.89") o ponto já é o decimal — não remover
  }
  const n = parseFloat(val);
  if (isNaN(n) || !isFinite(n)) return null;
  // Limita a NUMERIC(15,2): max 9.999.999.999.999,99
  const clamped = Math.min(Math.abs(n), 9999999999999.99) * (n < 0 ? -1 : 1);
  return parseFloat(clamped.toFixed(2));
}

// Empresa (tenant) efetiva da requisição:
// - usuário normal: a empresa dele;
// - super-admin: a empresa escolhida no contexto (header x-empresa-id), ou null.
function empresaDaReq(req) {
  if (req.usuario && req.usuario.isSuper) {
    return req.headers['x-empresa-id'] || null;
  }
  return (req.usuario && req.usuario.empresaId) || null;
}
function exigeSuper(req, res) {
  if (!req.usuario || !req.usuario.isSuper) { res.status(403).json({ erro: 'Apenas o super-admin pode fazer isso' }); return false; }
  return true;
}

// Importar módulos customizados
const db = require('./db-client');

// Blindagem multi-tenant: confirma que a obra pertence à empresa do contexto.
// Retorna true se ok; senão já responde 403/404 e retorna false.
async function checarObra(req, res, obraId) {
  const emp = empresaDaReq(req);
  if (!emp && req.usuario.isSuper) return true; // super sem contexto: acesso amplo
  if (!obraId) { res.status(400).json({ erro: 'obraId é obrigatório' }); return false; }
  const r = await db.query('SELECT empresa_id FROM obras WHERE id = $1', [obraId]);
  if (r.rows.length === 0) { res.status(404).json({ erro: 'Obra não encontrada' }); return false; }
  if (r.rows[0].empresa_id !== emp) { res.status(403).json({ erro: 'Sem acesso a esta obra' }); return false; }
  return true;
}
// Confirma que um recurso filho (que tem obra_id) pertence à empresa do contexto.
async function checarPorObraId(req, res, tabela, id) {
  const r = await db.query(`SELECT obra_id FROM ${tabela} WHERE id = $1`, [id]);
  if (r.rows.length === 0) { res.status(404).json({ erro: 'Registro não encontrado' }); return false; }
  return checarObra(req, res, r.rows[0].obra_id);
}
// Confirma que um orçamento pertence à empresa do contexto (via sua obra).
async function checarOrcamento(req, res, id) {
  const r = await db.query('SELECT obra_id FROM orcamentos WHERE id = $1', [id]);
  if (r.rows.length === 0) { res.status(404).json({ erro: 'Orçamento não encontrado' }); return false; }
  return checarObra(req, res, r.rows[0].obra_id);
}
// Confirma que um recurso com empresa_id direto (fornecedores/usuarios) pertence ao contexto.
async function checarEmpresaDireta(req, res, tabela, id) {
  const emp = empresaDaReq(req);
  if (!emp && req.usuario.isSuper) return true;
  const r = await db.query(`SELECT empresa_id FROM ${tabela} WHERE id = $1`, [id]);
  if (r.rows.length === 0) { res.status(404).json({ erro: 'Registro não encontrado' }); return false; }
  if (r.rows[0].empresa_id !== emp) { res.status(403).json({ erro: 'Sem acesso a este registro' }); return false; }
  return true;
}
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

// DEBUG: Listar usuários (apenas para admin, remove em produção)
app.get('/api/debug/usuarios', autenticar, async (req, res) => {
  // Verificar se é admin
  if (req.usuario.papel !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado' });
  }
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
    const result = await db.query('SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)', [String(email).trim()]);
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

      const token = gerarToken(usuario.id, usuario.email, usuario.empresa_id, usuario.is_super);

      res.json({
        sucesso: true,
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          papel: usuario.papel || 'Admin',
          empresaId: usuario.empresa_id || null,
          isSuper: !!usuario.is_super,
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
// USUÁRIOS (gestão)
// ============================================

// ============================================
// EMPRESAS (multi-tenant) — gestão restrita ao super-admin
// ============================================
app.get('/api/empresas', autenticar, async (req, res) => {
  try {
    if (req.usuario.isSuper) {
      const r = await db.query('SELECT id, nome, cnpj, ativo, criado_em FROM empresas ORDER BY nome');
      return res.json(r.rows);
    }
    // usuário normal vê só a própria (para exibir o nome)
    const r = await db.query('SELECT id, nome, cnpj, ativo FROM empresas WHERE id = $1', [req.usuario.empresaId]);
    res.json(r.rows);
  } catch (e) { console.error('❌ listar empresas', e); res.status(500).json({ erro: 'Erro ao listar empresas' }); }
});
app.post('/api/empresas', autenticar, async (req, res) => {
  if (!exigeSuper(req, res)) return;
  try {
    const { nome, cnpj } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ erro: 'Nome é obrigatório' });
    const r = await db.query('INSERT INTO empresas (nome, cnpj) VALUES ($1,$2) RETURNING id, nome, cnpj, ativo', [nome.trim(), cnpj || null]);
    res.status(201).json(r.rows[0]);
  } catch (e) { console.error('❌ criar empresa', e); res.status(500).json({ erro: 'Erro ao criar empresa' }); }
});
app.put('/api/empresas/:id', autenticar, async (req, res) => {
  if (!exigeSuper(req, res)) return;
  try {
    const { nome, cnpj, ativo } = req.body;
    const r = await db.query('UPDATE empresas SET nome=$1, cnpj=$2, ativo=$3 WHERE id=$4 RETURNING id, nome, cnpj, ativo',
      [nome, cnpj || null, ativo !== false, req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ erro: 'Empresa não encontrada' });
    res.json(r.rows[0]);
  } catch (e) { console.error('❌ atualizar empresa', e); res.status(500).json({ erro: 'Erro ao atualizar empresa' }); }
});

// GET /api/usuarios
app.get('/api/usuarios', autenticar, async (req, res) => {
  try {
    const emp = empresaDaReq(req);
    let r;
    if (emp) {
      r = await db.query('SELECT id, nome, email, papel, ativo, empresa_id, is_super FROM usuarios WHERE empresa_id = $1 ORDER BY criado_em', [emp]);
    } else if (req.usuario.isSuper) {
      r = await db.query('SELECT id, nome, email, papel, ativo, empresa_id, is_super FROM usuarios ORDER BY criado_em');
    } else {
      r = { rows: [] };
    }
    res.json(r.rows);
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
});

// POST /api/usuarios
app.post('/api/usuarios', autenticar, async (req, res) => {
  try {
    const { nome, senha, papel, ativo } = req.body;
    const email = String(req.body.email || '').trim();
    const emp = empresaDaReq(req);
    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, login (e-mail) e senha são obrigatórios' });
    }
    if (!emp) return res.status(400).json({ erro: 'Selecione uma empresa antes de cadastrar o usuário' });
    const existing = await db.query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ erro: 'Já existe um usuário com esse login/e-mail' });
    }
    const senhaHash = await bcryptjs.hash(senha, 10);
    const isSuper = req.usuario.isSuper ? (req.body.isSuper === true) : false;
    const r = await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, papel, ativo, empresa_id, is_super) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, nome, email, papel, ativo, empresa_id, is_super',
      [nome, email, senhaHash, papel || 'Engenheiro', ativo !== false, emp, isSuper]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
});

// PUT /api/usuarios/:id  (senha opcional — só atualiza se enviada)
app.put('/api/usuarios/:id', autenticar, async (req, res) => {
  try {
    if (!(await checarEmpresaDireta(req, res, 'usuarios', req.params.id))) return;
    const { nome, email, senha, papel, ativo } = req.body;
    // is_super só pode ser alterado por super-admin
    const setSuper = req.usuario.isSuper ? ', is_super=' + (req.body.isSuper === true ? 'TRUE' : 'FALSE') : '';
    let r;
    if (senha && senha.trim()) {
      const senhaHash = await bcryptjs.hash(senha, 10);
      r = await db.query(
        `UPDATE usuarios SET nome=$1, email=$2, papel=$3, ativo=$4, senha_hash=$5${setSuper}, atualizado_em=NOW() WHERE id=$6 RETURNING id, nome, email, papel, ativo, is_super`,
        [nome, email, papel, ativo, senhaHash, req.params.id]
      );
    } else {
      r = await db.query(
        `UPDATE usuarios SET nome=$1, email=$2, papel=$3, ativo=$4${setSuper}, atualizado_em=NOW() WHERE id=$5 RETURNING id, nome, email, papel, ativo, is_super`,
        [nome, email, papel, ativo, req.params.id]
      );
    }
    if (r.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(r.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
    res.status(500).json({ erro: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/usuarios/:id
app.delete('/api/usuarios/:id', autenticar, async (req, res) => {
  try {
    if (req.params.id === req.usuario.id) {
      return res.status(400).json({ erro: 'Você não pode excluir o próprio usuário logado' });
    }
    if (!(await checarEmpresaDireta(req, res, 'usuarios', req.params.id))) return;
    // Solta as referências de auditoria (FK sem ON DELETE) antes de remover.
    await db.query('UPDATE auditoria SET usuario_id = NULL WHERE usuario_id = $1', [req.params.id]);
    const r = await db.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ sucesso: true });
  } catch (error) {
    console.error('❌ Erro ao excluir usuário:', error);
    res.status(500).json({ erro: 'Erro ao excluir usuário' });
  }
});

// ============================================
// OBRAS
// ============================================

// GET /api/obras (escopo por empresa)
app.get('/api/obras', autenticar, async (req, res) => {
  try {
    const emp = empresaDaReq(req);
    let result;
    if (emp) {
      result = await db.query('SELECT id, nome, cliente, tipo, inicio, termino, pct, status FROM obras WHERE empresa_id = $1 ORDER BY criado_em DESC', [emp]);
    } else if (req.usuario.isSuper) {
      result = await db.query('SELECT id, nome, cliente, tipo, inicio, termino, pct, status FROM obras ORDER BY criado_em DESC');
    } else {
      result = { rows: [] };
    }
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao listar obras:', error);
    res.status(500).json({ erro: 'Erro ao listar obras' });
  }
});

// GET /api/obras/:id
app.get('/api/obras/:id', autenticar, async (req, res) => {
  try {
    if (!(await checarObra(req, res, req.params.id))) return;
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
    const emp = empresaDaReq(req);
    if (!emp) return res.status(400).json({ erro: 'Selecione uma empresa antes de criar a obra' });

    const result = await db.query(
      'INSERT INTO obras (nome, cliente, tipo, inicio, termino, pct, status, empresa_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [nome, cliente, tipo, inicio, termino, pct || 0, status || 'planejamento', emp]
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
    if (!(await checarObra(req, res, req.params.id))) return;
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
    if (!(await checarObra(req, res, req.params.id))) return;
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
    if (obraId) { if (!(await checarObra(req, res, obraId))) return; }

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
    if (!(await checarObra(req, res, obraId))) return;

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
    if (!(await checarPorObraId(req, res, 'fases', req.params.id))) return;
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
    if (!(await checarPorObraId(req, res, 'fases', req.params.id))) return;
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
    if (obraId) { if (!(await checarObra(req, res, obraId))) return; }

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
    if (!(await checarObra(req, res, obraId))) return;

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
    if (!(await checarPorObraId(req, res, 'despesas', req.params.id))) return;
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
    if (!(await checarPorObraId(req, res, 'despesas', req.params.id))) return;
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

// GET /api/fornecedores (escopo por empresa)
app.get('/api/fornecedores', autenticar, async (req, res) => {
  try {
    const emp = empresaDaReq(req);
    let result;
    if (emp) {
      result = await db.query('SELECT id, nome, categoria, cnpj, contato, status FROM fornecedores WHERE empresa_id = $1 ORDER BY nome', [emp]);
    } else if (req.usuario.isSuper) {
      result = await db.query('SELECT id, nome, categoria, cnpj, contato, status FROM fornecedores ORDER BY nome');
    } else {
      result = { rows: [] };
    }
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
    const emp = empresaDaReq(req);

    const result = await db.query(
      'INSERT INTO fornecedores (nome, categoria, cnpj, contato, status, empresa_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nome, categoria, cnpj, contato, status || 'ativo', emp]
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
    if (!(await checarEmpresaDireta(req, res, 'fornecedores', req.params.id))) return;
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
    if (!(await checarEmpresaDireta(req, res, 'fornecedores', req.params.id))) return;
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
    if (obraId) { if (!(await checarObra(req, res, obraId))) return; }

    let query = `SELECT a.id, a.obra_id, a.tipo, a.titulo, a.descricao, a.usuario_id, a.data, u.nome as usuario_nome
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id`;
    let params = [];

    if (obraId) {
      query += ' WHERE a.obra_id = $1';
      params.push(obraId);
    }

    query += ' ORDER BY a.data DESC';

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
    if (obraId) { if (!(await checarObra(req, res, obraId))) return; }
    console.log(`📊 GET /api/orcamentos (obraId=${obraId})`);

    let query = `SELECT o.id, o.obra_id, o.fornecedor_id, o.nome, o.descricao, o.valor_total,
      o.prazo_dias, o.tipo_orcamento, o.status, o.data_envio, o.data_emissao, o.numero_cotacao, o.criado_em,
      f.nome as fornecedor_nome,
      (SELECT COUNT(*) FROM linhas_orcamento lo WHERE lo.orcamento_id = o.id) AS itens,
      (SELECT COUNT(DISTINCT d.linha_id) FROM despesas d WHERE d.orcamento_id = o.id AND d.linha_id IS NOT NULL) AS aprovadas
      FROM orcamentos o
      LEFT JOIN fornecedores f ON o.fornecedor_id = f.id`;
    let params = [];

    if (obraId) {
      query += ' WHERE o.obra_id = $1';
      params.push(obraId);
    }

    query += ' ORDER BY o.criado_em DESC';

    const result = await db.query(query, params);
    console.log(`✅ ${result.rows.length} orçamentos encontrados`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao listar orçamentos:', error);
    res.status(500).json({ erro: 'Erro ao listar orçamentos' });
  }
});

// PUT /api/orcamentos/categoria — altera a categoria de um item em TODOS os
// orçamentos de uma obra (itens são compartilhados na equalização).
// IMPORTANTE: declarada antes de "/:id" para não ser capturada pela rota /:id.
app.put('/api/orcamentos/categoria', autenticar, async (req, res) => {
  try {
    const { obraId, itemNumero, categoria } = req.body;
    if (!obraId || !itemNumero || !categoria) {
      return res.status(400).json({ erro: 'obraId, itemNumero e categoria são obrigatórios' });
    }
    if (!(await checarObra(req, res, obraId))) return;
    const r = await db.query(
      `UPDATE linhas_orcamento SET categoria = $1
       WHERE item_numero = $2 AND orcamento_id IN (SELECT id FROM orcamentos WHERE obra_id = $3)`,
      [categoria, String(itemNumero), obraId]
    );
    res.json({ sucesso: true, atualizados: r.rowCount });
  } catch (error) {
    console.error('❌ Erro ao atualizar categoria:', error);
    res.status(500).json({ erro: 'Erro ao atualizar categoria' });
  }
});

// PUT /api/orcamentos/:id — renomeia (e opcionalmente atualiza prazo) o orçamento.
app.put('/api/orcamentos/:id', autenticar, async (req, res) => {
  try {
    if (!(await checarOrcamento(req, res, req.params.id))) return;
    const { nome } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ erro: 'nome é obrigatório' });
    const r = await db.query(
      'UPDATE orcamentos SET nome = $1, atualizado_em = NOW() WHERE id = $2 RETURNING *',
      [nome.trim(), req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ erro: 'Orçamento não encontrado' });
    res.json(r.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao renomear orçamento:', error);
    res.status(500).json({ erro: 'Erro ao renomear orçamento' });
  }
});

// GET /api/orcamentos/:id
app.get('/api/orcamentos/:id', autenticar, async (req, res) => {
  try {
    if (!(await checarOrcamento(req, res, req.params.id))) return;
    console.log(`📋 GET /api/orcamentos/:id = ${req.params.id}`);
    const orcamento = await db.query(
      `SELECT o.*, f.nome as fornecedor_nome FROM orcamentos o
       LEFT JOIN fornecedores f ON o.fornecedor_id = f.id
       WHERE o.id = $1`,
      [req.params.id]
    );

    if (orcamento.rows.length === 0) {
      console.log(`❌ Orçamento ${req.params.id} não encontrado`);
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }

    const linhas = await db.query(
      `SELECT lo.*, EXISTS (
         SELECT 1 FROM despesas d WHERE d.orcamento_id = lo.orcamento_id AND d.linha_id = lo.id
       ) AS aprovada
       FROM linhas_orcamento lo WHERE lo.orcamento_id = $1 ORDER BY lo.item_numero`,
      [req.params.id]
    );

    console.log(`✅ Orçamento ${req.params.id}: ${linhas.rows.length} linhas encontradas`);
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
    if (!(await checarObra(req, res, obraId))) return;

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
    if (!(await checarOrcamento(req, res, req.params.id))) return;
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
Este documento é um MAPA DE EQUALIZAÇÃO: existe UMA lista de itens (com descrições
COMPARTILHADAS entre todos os fornecedores) e VÁRIOS fornecedores que cotaram
preços para os MESMOS itens. Também pode ser o orçamento de um único fornecedor.

Extraia em JSON com DUAS partes:
1) "itens": a lista ÚNICA de itens (as descrições são as mesmas para todos os
   fornecedores). A categoria de cada item é definida UMA só vez aqui.
2) "fornecedores": um objeto por fornecedor, contendo apenas os PREÇOS daquele
   fornecedor por itemNumero.

Estrutura exata:
{
  "itens": [
    {
      "itemNumero": "1.1.1",
      "descricao": "descrição do item",
      "unidade": "un/m²/kg/etc ou null",
      "quantidade": número ou null,
      "categoria": "uma de: Estrutura, Alvenaria, Cobertura, Instalações Elétricas, Instalações Hidráulicas, Acabamento, Pintura, Fundações, Terraplanagem, Serviços Gerais, Materiais, Mão de Obra"
    }
  ],
  "fornecedores": [
    {
      "fornecedor": "nome da empresa",
      "cnpj": "CNPJ ou null",
      "numeroCotacao": "número ou null",
      "dataEmissao": "YYYY-MM-DD ou null",
      "prazoDias": número ou null,
      "precos": {
        "1.1.1": { "valorUnitario": número, "valorTotal": número }
      }
    }
  ]
}
REGRAS CRÍTICAS:
- A categoria de cada item é ÚNICA e vale para TODOS os fornecedores (defina em "itens", nunca por fornecedor).
- Use EXATAMENTE os mesmos "itemNumero" em "itens" e nas chaves de "precos".
- Se um fornecedor NÃO cotou um item, omita aquele itemNumero do "precos" dele (ou use 0).
- Números sem "R$", sem pontos de milhar e sem vírgulas (use ponto decimal).
- Ignore cabeçalhos, linhas de subtotal/total e células vazias.
- Se o documento tiver um único fornecedor, retorne "fornecedores" com um item só.`;

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

    let orcamentos;

    if (Array.isArray(parsed.itens) && Array.isArray(parsed.fornecedores)) {
      // Formato equalização: itens compartilhados + preços por fornecedor.
      // Garante que TODOS os fornecedores tenham os MESMOS itens/categorias.
      const itens = parsed.itens.map((it) => ({
        itemNumero: String(it.itemNumero ?? ''),
        descricao: it.descricao || '',
        unidade: it.unidade || null,
        quantidade: sanitizeNumero(it.quantidade) || null,
        categoria: it.categoria || 'Serviços Gerais',
      }));

      orcamentos = parsed.fornecedores.map((f) => {
        const precos = f.precos || {};
        const linhas = itens.map((it) => {
          const p = precos[it.itemNumero] || precos[String(it.itemNumero)] || {};
          const valorUnitario = sanitizeNumero(p.valorUnitario) || 0;
          let valorTotal = sanitizeNumero(p.valorTotal);
          if (!valorTotal && valorUnitario && it.quantidade) valorTotal = valorUnitario * it.quantidade;
          return { ...it, valorUnitario, valorTotal: valorTotal || 0 };
        });
        const valorTotal = linhas.reduce((acc, l) => acc + (l.valorTotal || 0), 0);
        return {
          fornecedor: f.fornecedor || 'Fornecedor',
          cnpj: f.cnpj || null,
          numeroCotacao: f.numeroCotacao || null,
          dataEmissao: f.dataEmissao || null,
          prazoDias: sanitizeNumero(f.prazoDias) || null,
          valorTotal,
          linhas,
          avisos: f.avisos || [],
        };
      });
    } else {
      // Fallback: formato antigo {orcamentos:[...]} ou objeto único.
      orcamentos = Array.isArray(parsed.orcamentos)
        ? parsed.orcamentos
        : (parsed.fornecedor || parsed.linhas) ? [parsed] : [];
      orcamentos = orcamentos.map((o) => {
        let valorTotal = sanitizeNumero(o.valorTotal);
        if (!valorTotal && Array.isArray(o.linhas)) {
          valorTotal = o.linhas.reduce((acc, l) => acc + (sanitizeNumero(l.valorTotal) || 0), 0);
        }
        return { ...o, valorTotal, linhas: o.linhas || [], avisos: o.avisos || [] };
      });
    }

    orcamentos = orcamentos.filter((o) => o.fornecedor || (o.linhas && o.linhas.length));

    // Remove fornecedores duplicados (mesmo nome): mantém o de maior valor total.
    const porNome = new Map();
    for (const o of orcamentos) {
      const chave = (o.fornecedor || '').trim().toLowerCase();
      const existente = porNome.get(chave);
      if (!existente || (o.valorTotal || 0) > (existente.valorTotal || 0)) {
        porNome.set(chave, o);
      }
    }
    orcamentos = Array.from(porNome.values());

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

// ============================================
// IMPORTADOR INTELIGENTE — detecta o tipo do documento e roteia
// (orçamento de fornecedor, NF-e de compra, NFS-e de serviço, documento da obra)
// ============================================

const CATEGORIAS_VALIDAS = 'Estrutura, Alvenaria, Cobertura, Instalações Elétricas, Instalações Hidráulicas, Acabamento, Pintura, Fundações, Terraplanagem, Serviços Gerais, Materiais, Mão de Obra';

// POST /api/importar-inteligente — analisa e CLASSIFICA o documento (não grava).
app.post('/api/importar-inteligente', autenticar, async (req, res) => {
  const XLSX = require('xlsx');
  if (!GEMINI_API_KEY) return res.status(500).json({ erro: 'Gemini API não configurada' });
  try {
    const { arquivo, obraId } = req.body;
    if (!arquivo) return res.status(400).json({ erro: 'arquivo é obrigatório' });
    if (obraId) { if (!(await checarObra(req, res, obraId))) return; }

    const buffer = Buffer.from(arquivo, 'base64');
    const ehPDF = buffer.slice(0, 5).toString('latin1') === '%PDF-';

    const instrucoes = `Você é um especialista em documentos de construção civil no Brasil.
Analise o documento, CLASSIFIQUE seu tipo e extraia os dados no formato JSON correto.

Os tipos possíveis (campo "tipo"):
- "orcamento": proposta/cotação de fornecedor ou mapa de equalização (preços a aprovar).
- "nfe": Nota Fiscal Eletrônica de produtos/materiais (compra já realizada).
- "nfse": Nota Fiscal de Serviço (serviço já contratado/realizado).
- "documento": qualquer outro documento da obra (contrato, ART/RRT, alvará, licença, projeto, memorial, laudo, etc.).

Responda SOMENTE com JSON neste formato (preencha apenas o bloco do tipo detectado):
{
  "tipo": "orcamento|nfe|nfse|documento",
  "confianca": número entre 0 e 1,
  "orcamento": {
    "itens": [ { "itemNumero": "1.1", "descricao": "...", "unidade": "un ou null", "quantidade": número ou null, "categoria": "uma de: ${CATEGORIAS_VALIDAS}" } ],
    "fornecedores": [ { "fornecedor": "nome", "cnpj": "ou null", "numeroCotacao": "ou null", "dataEmissao": "YYYY-MM-DD ou null", "prazoDias": número ou null, "precos": { "1.1": { "valorUnitario": número, "valorTotal": número } } } ]
  },
  "despesa": {
    "fornecedor": "nome do emitente",
    "cnpj": "CNPJ do emitente ou null",
    "numeroNota": "número da nota ou null",
    "dataEmissao": "YYYY-MM-DD ou null",
    "valorTotal": número,
    "itens": [ { "descricao": "...", "quantidade": número ou null, "valorUnitario": número ou null, "valorTotal": número, "categoria": "uma de: ${CATEGORIAS_VALIDAS}" } ]
  },
  "documento": {
    "tipoDocumento": "contrato|art|alvara|licenca|projeto|memorial|laudo|outro",
    "titulo": "título curto do documento",
    "numero": "número/identificação ou null",
    "emissor": "órgão/empresa emissora ou null",
    "partes": "partes envolvidas (ex: contratante x contratada) ou null",
    "dataDocumento": "YYYY-MM-DD ou null",
    "dataValidade": "YYYY-MM-DD ou null",
    "valor": número ou null,
    "resumo": "2-3 frases resumindo o documento"
  }
}
REGRAS:
- Números sem "R$", sem ponto de milhar, ponto como separador decimal.
- Para nfe/nfse use o tipo correto e preencha "despesa".
- Para orçamento, "itens" tem categoria única por item; "precos" usa os mesmos itemNumero.
- Não invente dados; use null quando não houver.`;

    let content;
    if (ehPDF) {
      content = [ { text: instrucoes }, { inlineData: { mimeType: 'application/pdf', data: arquivo } } ];
    } else {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let txt = '';
      for (const s of workbook.SheetNames) {
        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[s], { blankrows: false });
        if (csv.trim()) txt += `\n=== ABA: ${s} ===\n${csv}\n`;
      }
      if (txt.length > 60000) txt = txt.substring(0, 60000) + '\n...[truncado]';
      content = `${instrucoes}\n\nDOCUMENTO:\n${txt}`;
    }

    const resposta = await chamarGeminiComRetry(content);
    let parsed;
    try {
      let t = resposta.replace(/```json/gi, '').replace(/```/g, '').trim();
      const i = t.indexOf('{'), f = t.lastIndexOf('}');
      if (i >= 0 && f > i) t = t.slice(i, f + 1);
      parsed = JSON.parse(t);
    } catch (e) {
      return res.status(500).json({ erro: 'A IA retornou uma resposta inválida. Tente um arquivo mais simples.' });
    }

    const tipo = String(parsed.tipo || '').toLowerCase();

    if (tipo === 'orcamento' && parsed.orcamento) {
      // Normaliza no mesmo formato do /analisar (itens compartilhados + preços)
      const itens = (parsed.orcamento.itens || []).map((it) => ({
        itemNumero: String(it.itemNumero ?? ''), descricao: it.descricao || '',
        unidade: it.unidade || null, quantidade: sanitizeNumero(it.quantidade) || null,
        categoria: it.categoria || 'Serviços Gerais',
      }));
      const orcamentos = (parsed.orcamento.fornecedores || []).map((fo) => {
        const precos = fo.precos || {};
        const linhas = itens.map((it) => {
          const p = precos[it.itemNumero] || {};
          const vu = sanitizeNumero(p.valorUnitario) || 0;
          let vt = sanitizeNumero(p.valorTotal);
          if (!vt && vu && it.quantidade) vt = vu * it.quantidade;
          return { ...it, valorUnitario: vu, valorTotal: vt || 0 };
        });
        return {
          fornecedor: fo.fornecedor || 'Fornecedor', cnpj: fo.cnpj || null,
          numeroCotacao: fo.numeroCotacao || null, dataEmissao: fo.dataEmissao || null,
          prazoDias: sanitizeNumero(fo.prazoDias) || null,
          valorTotal: linhas.reduce((a, l) => a + (l.valorTotal || 0), 0),
          linhas, avisos: [],
        };
      }).filter((o) => o.fornecedor || (o.linhas && o.linhas.length));
      if (orcamentos.length === 0) return res.status(422).json({ erro: 'Não identifiquei itens de orçamento no documento.' });
      return res.json({ tipo: 'orcamento', confianca: parsed.confianca ?? null, orcamentos });
    }

    if ((tipo === 'nfe' || tipo === 'nfse') && parsed.despesa) {
      const d = parsed.despesa;
      const itens = (d.itens || []).map((it) => ({
        descricao: it.descricao || 'Item', quantidade: sanitizeNumero(it.quantidade) || null,
        valorUnitario: sanitizeNumero(it.valorUnitario), valorTotal: sanitizeNumero(it.valorTotal) || 0,
        categoria: it.categoria || (tipo === 'nfse' ? 'Mão de Obra' : 'Materiais'),
      }));
      let valorTotal = sanitizeNumero(d.valorTotal);
      if (!valorTotal) valorTotal = itens.reduce((a, l) => a + (l.valorTotal || 0), 0);
      return res.json({
        tipo, confianca: parsed.confianca ?? null,
        despesa: {
          fornecedor: d.fornecedor || 'Fornecedor', cnpj: d.cnpj || null,
          numeroNota: d.numeroNota || null, dataEmissao: d.dataEmissao || null,
          valorTotal, itens,
        },
      });
    }

    // documento (default)
    const doc = parsed.documento || {};
    return res.json({
      tipo: 'documento', confianca: parsed.confianca ?? null,
      documento: {
        tipoDocumento: doc.tipoDocumento || 'outro', titulo: doc.titulo || 'Documento',
        numero: doc.numero || null, emissor: doc.emissor || null, partes: doc.partes || null,
        dataDocumento: doc.dataDocumento || null, dataValidade: doc.dataValidade || null,
        valor: sanitizeNumero(doc.valor) || null, resumo: doc.resumo || '',
      },
    });
  } catch (error) {
    console.error('❌ Erro no importador inteligente:', error);
    res.status(500).json({ erro: 'Erro ao analisar documento: ' + error.message });
  }
});

// POST /api/importar-inteligente/confirmar — grava conforme o tipo confirmado pelo usuário.
app.post('/api/importar-inteligente/confirmar', autenticar, async (req, res) => {
  try {
    const { obraId, tipo, dados } = req.body;
    if (!obraId || !tipo || !dados) return res.status(400).json({ erro: 'obraId, tipo e dados são obrigatórios' });
    if (!(await checarObra(req, res, obraId))) return;

    // Helper: encontra ou cria fornecedor (escopado por empresa da obra)
    const empObra = (await db.query('SELECT empresa_id FROM obras WHERE id = $1', [obraId])).rows[0]?.empresa_id || null;
    async function acharOuCriarFornecedor(nome, cnpj) {
      if (cnpj) {
        const r = await db.query('SELECT id FROM fornecedores WHERE cnpj = $1', [cnpj]);
        if (r.rows.length) return r.rows[0].id;
      }
      const rn = await db.query('SELECT id FROM fornecedores WHERE LOWER(nome) = LOWER($1)', [nome || 'Fornecedor']);
      if (rn.rows.length) return rn.rows[0].id;
      const ins = await db.query(
        'INSERT INTO fornecedores (nome, cnpj, status, empresa_id) VALUES ($1,$2,$3,$4) RETURNING id',
        [nome || 'Fornecedor', cnpj || null, 'ativo', empObra]
      );
      return ins.rows[0].id;
    }

    if (tipo === 'nfe' || tipo === 'nfse') {
      const d = dados;
      await acharOuCriarFornecedor(d.fornecedor, d.cnpj);
      const hoje = (d.dataEmissao || new Date().toISOString().split('T')[0]);
      const itens = Array.isArray(d.itens) && d.itens.length
        ? d.itens
        : [{ descricao: d.fornecedor || 'Nota fiscal', valorTotal: sanitizeNumero(d.valorTotal) || 0, categoria: tipo === 'nfse' ? 'Mão de Obra' : 'Materiais' }];
      let n = 0;
      for (const it of itens) {
        await db.query(
          `INSERT INTO despesas (obra_id, fase_id, descricao, categoria, valor, data, fornecedor, cnpj, numero_nota, origem)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [obraId, null, it.descricao || 'Item', it.categoria || (tipo === 'nfse' ? 'Mão de Obra' : 'Materiais'),
           sanitizeNumero(it.valorTotal) || 0, hoje, d.fornecedor || 'Fornecedor', d.cnpj || null, d.numeroNota || null, tipo]
        );
        n++;
      }
      await db.query(
        'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1,$2,$3,$4,$5)',
        [obraId, 'CREATE', tipo === 'nfse' ? 'NFS-e lançada no Financeiro' : 'NF-e lançada no Financeiro',
         `${d.fornecedor || 'Fornecedor'} — nota ${d.numeroNota || 's/n'}: ${n} item(ns), R$ ${(sanitizeNumero(d.valorTotal) || 0).toLocaleString('pt-BR')}`,
         req.usuario.id]
      );
      return res.status(201).json({ sucesso: true, tipo, despesas: n, mensagem: `${n} despesa(s) lançada(s) no Financeiro.` });
    }

    if (tipo === 'documento') {
      const d = dados;
      const ins = await db.query(
        `INSERT INTO documentos (obra_id, tipo_documento, titulo, numero, emissor, partes, data_documento, data_validade, valor, resumo, dados)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [obraId, d.tipoDocumento || 'outro', d.titulo || 'Documento', d.numero || null, d.emissor || null,
         d.partes || null, d.dataDocumento || null, d.dataValidade || null, sanitizeNumero(d.valor) || null,
         d.resumo || null, JSON.stringify(d)]
      );
      await db.query(
        'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1,$2,$3,$4,$5)',
        [obraId, 'CREATE', 'Documento da obra registrado', `${d.tipoDocumento || 'documento'}: ${d.titulo || ''}`, req.usuario.id]
      );
      return res.status(201).json({ sucesso: true, tipo, id: ins.rows[0].id, mensagem: 'Documento registrado.' });
    }

    return res.status(400).json({ erro: 'Tipo inválido para confirmação. Orçamentos use a tela de Orçamentos.' });
  } catch (error) {
    console.error('❌ Erro ao confirmar importação:', error);
    res.status(500).json({ erro: 'Erro ao confirmar: ' + error.message });
  }
});

// GET /api/documentos?obraId=... — lista documentos da obra
app.get('/api/documentos', autenticar, async (req, res) => {
  try {
    const { obraId } = req.query;
    if (obraId) { if (!(await checarObra(req, res, obraId))) return; }
    let query = 'SELECT id, obra_id, tipo_documento, titulo, numero, emissor, partes, data_documento, data_validade, valor, resumo, criado_em FROM documentos';
    const params = [];
    if (obraId) { query += ' WHERE obra_id = $1'; params.push(obraId); }
    query += ' ORDER BY criado_em DESC';
    const r = await db.query(query, params);
    res.json(r.rows);
  } catch (error) {
    console.error('❌ Erro ao listar documentos:', error);
    res.status(500).json({ erro: 'Erro ao listar documentos' });
  }
});

// DELETE /api/documentos/:id
app.delete('/api/documentos/:id', autenticar, async (req, res) => {
  try {
    if (!(await checarPorObraId(req, res, 'documentos', req.params.id))) return;
    await db.query('DELETE FROM documentos WHERE id = $1', [req.params.id]);
    res.json({ sucesso: true });
  } catch (error) {
    console.error('❌ Erro ao excluir documento:', error);
    res.status(500).json({ erro: 'Erro ao excluir documento' });
  }
});

// POST /api/orcamentos/exportar-excel — Gera .xlsx com gráficos nativos (via Python/XlsxWriter)
app.post('/api/orcamentos/exportar-excel', autenticar, async (req, res) => {
  const { spawn } = require('child_process');
  try {
    const payload = {
      fornecedores: req.body.fornecedores || [],
    };
    const nomeArquivo = (req.body.nomeArquivo || 'comparativo').replace(/[^\w.-]/g, '_');
    const destino = path.join(os.tmpdir(), `orc_${Date.now()}.xlsx`);
    const script = path.join(__dirname, 'excel_orcamentos.py');

    const py = spawn('python3', [script, destino]);
    let stderr = '';
    py.stderr.on('data', (d) => { stderr += d.toString(); });
    py.on('error', (e) => {
      console.error('❌ Falha ao iniciar Python:', e.message);
      if (!res.headersSent) res.status(500).json({ erro: 'Gerador de Excel indisponível' });
    });
    py.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Python saiu com código', code, stderr);
        if (!res.headersSent) res.status(500).json({ erro: 'Falha ao gerar Excel' });
        return;
      }
      res.download(destino, `${nomeArquivo}.xlsx`, (err) => {
        fs.unlink(destino, () => {});
        if (err && !res.headersSent) console.error('❌ Erro ao enviar Excel:', err.message);
      });
    });
    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  } catch (error) {
    console.error('❌ Erro ao exportar Excel:', error);
    if (!res.headersSent) res.status(500).json({ erro: 'Erro ao exportar Excel' });
  }
});

// POST /api/orcamentos/reimportar — Lê o .xlsx editado (com aba _meta) e atualiza os orçamentos
app.post('/api/orcamentos/reimportar', autenticar, async (req, res) => {
  const XLSX = require('xlsx');
  try {
    const { arquivo } = req.body;
    if (!arquivo) return res.status(400).json({ erro: 'arquivo é obrigatório' });

    const wb = XLSX.read(Buffer.from(arquivo, 'base64'), { type: 'buffer' });
    const metaSheet = wb.Sheets['_meta'];
    if (!metaSheet) {
      return res.status(422).json({ erro: 'Este Excel não foi gerado pelo sistema (aba _meta ausente). Exporte pela Comparativa, edite e reimporte o mesmo arquivo.' });
    }
    const meta = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });

    let atualizados = 0;
    let obraIdAud = null;
    for (let i = 1; i < meta.length; i++) {
      const aba = meta[i] && meta[i][0];
      const orcamentoId = meta[i] && meta[i][1];
      const obraId = meta[i] && meta[i][2];
      if (!aba || !orcamentoId) continue;
      // Blindagem: só processa orçamentos da empresa do contexto
      const empCtx = empresaDaReq(req);
      if (empCtx) {
        const chk = await db.query('SELECT o.empresa_id FROM orcamentos orc JOIN obras o ON orc.obra_id = o.id WHERE orc.id = $1', [orcamentoId]);
        if (chk.rows.length === 0 || chk.rows[0].empresa_id !== empCtx) continue;
      }
      obraIdAud = obraId || obraIdAud;
      const sh = wb.Sheets[aba];
      if (!sh) continue;

      const rows = XLSX.utils.sheet_to_json(sh, { header: 1 });
      const linhas = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;
        const item = row[0]; const desc = row[1]; const cat = row[2];
        const qtd = Number(row[3]) || 0;
        const unit = Number(row[4]) || 0;
        let total = Number(row[5]);
        if (!Number.isFinite(total)) total = qtd * unit;
        // ignora linhas totalmente vazias
        if ((item === undefined || item === '') && (desc === undefined || desc === '') && !total) continue;
        linhas.push({ item: String(item ?? ''), desc: String(desc ?? ''), cat: String(cat ?? '') || 'Serviços Gerais', qtd, unit, total });
      }

      const valorTotal = linhas.reduce((s, l) => s + (l.total || 0), 0);
      await db.query('UPDATE orcamentos SET valor_total = $1, atualizado_em = NOW() WHERE id = $2', [valorTotal, orcamentoId]);
      await db.query('DELETE FROM linhas_orcamento WHERE orcamento_id = $1', [orcamentoId]);
      for (const l of linhas) {
        await db.query(
          `INSERT INTO linhas_orcamento (orcamento_id, item_numero, descricao, quantidade, valor_unitario, valor_total, categoria)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [orcamentoId, l.item, l.desc, l.qtd, l.unit, l.total, l.cat]
        );
      }
      atualizados++;
    }

    if (atualizados === 0) {
      return res.status(422).json({ erro: 'Nenhum orçamento reconhecido no arquivo.' });
    }

    if (obraIdAud) {
      await db.query(
        'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1,$2,$3,$4,$5)',
        [obraIdAud, 'UPDATE', 'Orçamentos reimportados (Excel)', `${atualizados} orçamento(s) atualizados a partir do Excel`, req.usuario.id]
      );
    }

    res.json({ sucesso: true, atualizados });
  } catch (error) {
    console.error('❌ Erro ao reimportar Excel:', error);
    res.status(500).json({ erro: 'Erro ao reimportar: ' + error.message });
  }
});

// POST /api/orcamentos/salvar — Salva orçamento já analisado no banco
app.post('/api/orcamentos/salvar', autenticar, async (req, res) => {
  try {
    const { obraId, dados } = req.body;
    if (!obraId || !dados) return res.status(400).json({ erro: 'obraId e dados são obrigatórios' });
    if (!(await checarObra(req, res, obraId))) return;

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

    const nomeOrca = (dados.nome && dados.nome.trim()) || nomeFornecedor;
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
    if (!(await checarObra(req, res, obraId))) return;

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

// POST /api/orcamentos/:id/aprovar — gera despesas e fases a partir do orçamento.
// Body: { linhaIds?: string[], categorias?: string[] }
//   - linhaIds  → aprova apenas esses itens
//   - categorias → aprova todos os itens dessas categorias
//   - nenhum    → aprova TODOS os itens
// Idempotente POR ITEM (despesa vinculada a linha_id): reaprovar substitui, não duplica.
// A fase é única por (orçamento, categoria) e recebe o nome da categoria.
app.post('/api/orcamentos/:id/aprovar', autenticar, async (req, res) => {
  try {
    const orcamentoId = req.params.id;
    if (!(await checarOrcamento(req, res, orcamentoId))) return;
    const linhaIds = Array.isArray(req.body.linhaIds) ? req.body.linhaIds.filter(Boolean) : [];
    const categorias = Array.isArray(req.body.categorias) ? req.body.categorias.filter(Boolean) : [];

    const orcResult = await db.query(
      `SELECT o.id, o.obra_id, o.nome, o.prazo_dias, o.fornecedor_id, f.nome as fornecedor_nome
       FROM orcamentos o LEFT JOIN fornecedores f ON o.fornecedor_id = f.id
       WHERE o.id = $1`,
      [orcamentoId]
    );
    if (orcResult.rows.length === 0) return res.status(404).json({ erro: 'Orçamento não encontrado' });
    const orcamento = orcResult.rows[0];
    const obra_id = orcamento.obra_id;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const linhasResult = await client.query('SELECT * FROM linhas_orcamento WHERE orcamento_id = $1', [orcamentoId]);
      const todas = linhasResult.rows;
      if (todas.length === 0) { await client.query('ROLLBACK'); return res.status(400).json({ erro: 'Orçamento sem itens' }); }

      // Define o conjunto-alvo de linhas
      let alvo;
      if (linhaIds.length) alvo = todas.filter((l) => linhaIds.includes(l.id));
      else if (categorias.length) alvo = todas.filter((l) => categorias.includes(l.categoria || 'Outros'));
      else alvo = todas;
      alvo = alvo.filter((l) => sanitizeNumero(l.valor_total) !== null);
      if (alvo.length === 0) { await client.query('ROLLBACK'); return res.status(400).json({ erro: 'Nenhum item válido para aprovar' }); }

      // Fornecedor
      let fornecedorId = orcamento.fornecedor_id;
      if (!fornecedorId) {
        const fr = await client.query(
          `INSERT INTO fornecedores (nome, status, criado_em, atualizado_em) VALUES ($1,'ativo',NOW(),NOW()) RETURNING id`,
          [orcamento.fornecedor_nome || orcamento.nome]
        );
        fornecedorId = fr.rows[0].id;
      }

      const hoje = new Date().toISOString().split('T')[0];
      const dataTermino = new Date();
      dataTermino.setDate(dataTermino.getDate() + (orcamento.prazo_dias || 30));
      const ini = new Date().toISOString().split('T')[0];
      const fim = dataTermino.toISOString().split('T')[0];

      // Garante uma fase por categoria (não duplica) e mapeia categoria->faseId
      const cats = Array.from(new Set(alvo.map((l) => l.categoria || 'Outros')));
      const faseDaCategoria = new Map();
      for (const categoria of cats) {
        const ex = await client.query('SELECT id FROM fases WHERE orcamento_id = $1 AND nome = $2 LIMIT 1', [orcamentoId, categoria]);
        if (ex.rows.length) { faseDaCategoria.set(categoria, ex.rows[0].id); continue; }
        const ordRes = await client.query('SELECT COALESCE(MAX(ordem),0) AS o FROM fases WHERE obra_id = $1', [obra_id]);
        const faseRes = await client.query(
          `INSERT INTO fases (obra_id, ordem, nome, inicio, termino, status, categoria, descricao, orcamento_id)
           VALUES ($1,$2,$3,$4,$5,'nao_iniciada','etapa_obra',$6,$7) RETURNING id`,
          [obra_id, (ordRes.rows[0].o || 0) + 1, categoria, ini, fim, `Gerada do orçamento: ${orcamento.nome}`, orcamentoId]
        );
        faseDaCategoria.set(categoria, faseRes.rows[0].id);
      }

      // Upsert por item: remove a despesa anterior daquela linha e recria
      let nDesp = 0;
      for (const l of alvo) {
        const categoria = l.categoria || 'Outros';
        const valor = sanitizeNumero(l.valor_total);
        await client.query('DELETE FROM despesas WHERE orcamento_id = $1 AND linha_id = $2', [orcamentoId, l.id]);
        await client.query(
          `INSERT INTO despesas (obra_id, fase_id, descricao, categoria, valor, data, fornecedor, orcamento_id, linha_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [obra_id, faseDaCategoria.get(categoria), l.descricao || 'Item', categoria, valor, hoje,
           orcamento.fornecedor_nome || orcamento.nome, orcamentoId, l.id]
        );
        nDesp++;
      }

      // Status: aceito se todos os itens (com valor) já têm despesa; senão parcial
      const totalComValor = todas.filter((l) => sanitizeNumero(l.valor_total) !== null).length;
      const aprovadasRes = await client.query('SELECT COUNT(DISTINCT linha_id) AS n FROM despesas WHERE orcamento_id = $1 AND linha_id IS NOT NULL', [orcamentoId]);
      const nAprovadas = parseInt(aprovadasRes.rows[0].n, 10) || 0;
      const status = nAprovadas >= totalComValor ? 'aceito' : 'parcial';

      await client.query('UPDATE orcamentos SET status = $1, fornecedor_id = $2, atualizado_em = NOW() WHERE id = $3', [status, fornecedorId, orcamentoId]);
      await client.query(
        'INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1,$2,$3,$4,$5)',
        [obra_id, 'APPROVE', 'Itens de orçamento aprovados',
         `Orçamento "${orcamento.nome}": ${nDesp} item(ns) aprovado(s) em ${cats.length} categoria(s) [${status}].`, req.usuario.id]
      );

      await client.query('COMMIT');
      res.json({ sucesso: true, mensagem: `${nDesp} item(ns) aprovado(s).`, despesas: nDesp, fases: cats.length, status });
    } catch (errTx) {
      await client.query('ROLLBACK').catch(() => {});
      throw errTx;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Erro ao aprovar orçamento:', error);
    res.status(500).json({ erro: 'Erro ao aprovar orçamento: ' + error.message });
  }
});

// DELETE /api/orcamentos/:id/itens — remove linhas do orçamento (e despesas vinculadas)
app.delete('/api/orcamentos/:id/itens', autenticar, async (req, res) => {
  try {
    const orcamentoId = req.params.id;
    if (!(await checarOrcamento(req, res, orcamentoId))) return;
    const linhaIds = Array.isArray(req.body.linhaIds) ? req.body.linhaIds.filter(Boolean) : [];
    if (linhaIds.length === 0) return res.status(400).json({ erro: 'Nenhum item informado' });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      // Remove despesas geradas por essas linhas
      await client.query(
        'DELETE FROM despesas WHERE orcamento_id = $1 AND linha_id = ANY($2::uuid[])',
        [orcamentoId, linhaIds]
      );
      // Remove as linhas
      const del = await client.query(
        'DELETE FROM linhas_orcamento WHERE orcamento_id = $1 AND id = ANY($2::uuid[])',
        [orcamentoId, linhaIds]
      );
      // Recalcula o total do orçamento
      const soma = await client.query(
        'SELECT COALESCE(SUM(valor_total), 0) AS total FROM linhas_orcamento WHERE orcamento_id = $1',
        [orcamentoId]
      );
      await client.query(
        'UPDATE orcamentos SET valor_total = $1, atualizado_em = NOW() WHERE id = $2',
        [sanitizeNumero(soma.rows[0].total) || 0, orcamentoId]
      );
      await client.query('COMMIT');
      res.json({ sucesso: true, removidos: del.rowCount });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Erro ao excluir itens:', error);
    res.status(500).json({ erro: 'Erro ao excluir itens: ' + error.message });
  }
});

// ============================================
// OCORRÊNCIAS (Diário de Obra)
// ============================================
app.get('/api/ocorrencias', autenticar, async (req, res) => {
  try {
    const { obraId } = req.query;
    if (obraId) { if (!(await checarObra(req, res, obraId))) return; }
    const r = await db.query(
      `SELECT o.*, f.nome AS fase_nome FROM ocorrencias o
       LEFT JOIN fases f ON o.fase_id = f.id
       WHERE ($1::uuid IS NULL OR o.obra_id = $1) ORDER BY o.data_inicio DESC`,
      [obraId || null]
    );
    res.json(r.rows);
  } catch (e) { console.error('❌ listar ocorrencias', e); res.status(500).json({ erro: 'Erro ao listar ocorrências' }); }
});

app.post('/api/ocorrencias', autenticar, async (req, res) => {
  try {
    const { obraId, faseId, tipo, descricao, dataInicio, dataFim, impactoDias } = req.body;
    if (!obraId || !tipo || !dataInicio) return res.status(400).json({ erro: 'obraId, tipo e dataInicio são obrigatórios' });
    if (!(await checarObra(req, res, obraId))) return;
    const imp = (impactoDias === '' || impactoDias === null || impactoDias === undefined) ? null : parseInt(impactoDias, 10);
    const r = await db.query(
      `INSERT INTO ocorrencias (obra_id, fase_id, tipo, descricao, data_inicio, data_fim, impacto_dias)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [obraId, faseId || null, tipo, descricao || null, dataInicio, dataFim || null, imp]
    );
    await db.query('INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id) VALUES ($1,$2,$3,$4,$5)',
      [obraId, 'ocorrencia', `Ocorrência: ${tipo}`, descricao || tipo, req.usuario.id]);
    res.status(201).json(r.rows[0]);
  } catch (e) { console.error('❌ criar ocorrencia', e); res.status(500).json({ erro: 'Erro ao criar ocorrência' }); }
});

app.put('/api/ocorrencias/:id', autenticar, async (req, res) => {
  try {
    if (!(await checarPorObraId(req, res, 'ocorrencias', req.params.id))) return;
    const { faseId, tipo, descricao, dataInicio, dataFim, impactoDias } = req.body;
    const imp = (impactoDias === '' || impactoDias === null || impactoDias === undefined) ? null : parseInt(impactoDias, 10);
    const r = await db.query(
      `UPDATE ocorrencias SET fase_id=$1, tipo=$2, descricao=$3, data_inicio=$4, data_fim=$5, impacto_dias=$6, atualizado_em=NOW()
       WHERE id=$7 RETURNING *`,
      [faseId || null, tipo, descricao || null, dataInicio, dataFim || null, imp, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ erro: 'Ocorrência não encontrada' });
    res.json(r.rows[0]);
  } catch (e) { console.error('❌ atualizar ocorrencia', e); res.status(500).json({ erro: 'Erro ao atualizar ocorrência' }); }
});

app.delete('/api/ocorrencias/:id', autenticar, async (req, res) => {
  try {
    if (!(await checarPorObraId(req, res, 'ocorrencias', req.params.id))) return;
    await db.query('DELETE FROM ocorrencias WHERE id = $1', [req.params.id]);
    res.json({ sucesso: true });
  } catch (e) { console.error('❌ excluir ocorrencia', e); res.status(500).json({ erro: 'Erro ao excluir ocorrência' }); }
});

// ============================================
// PROCESSAMENTO DE DOCUMENTOS (GEMINI)
// ============================================

app.post('/api/process-document', autenticar, async (req, res) => {
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

// Garante o schema necessário que não existia em bancos já criados (migração leve).
async function garantirSchema() {
  try {
    await db.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS papel VARCHAR(50) DEFAULT 'Engenheiro'");
    await db.query("UPDATE usuarios SET papel = 'Admin' WHERE email = 'ggpauliv' AND (papel IS NULL OR papel = 'Engenheiro')");
    // Vínculo de origem para tornar a aprovação de orçamentos idempotente
    await db.query("ALTER TABLE despesas ADD COLUMN IF NOT EXISTS orcamento_id UUID");
    await db.query("ALTER TABLE despesas ADD COLUMN IF NOT EXISTS linha_id UUID");
    await db.query("ALTER TABLE fases ADD COLUMN IF NOT EXISTS orcamento_id UUID");
    // Permite status 'parcial' nos orçamentos (aprovação parcial)
    await db.query("ALTER TABLE orcamentos DROP CONSTRAINT IF EXISTS orcamentos_status_check");
    await db.query("ALTER TABLE orcamentos ADD CONSTRAINT orcamentos_status_check CHECK (status IN ('ativo','vencido','aceito','descartado','parcial'))");
    // Diário de obra / ocorrências (chuva, problema, paralisação, etc.)
    await db.query(`CREATE TABLE IF NOT EXISTS ocorrencias (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
      fase_id UUID REFERENCES fases(id) ON DELETE SET NULL,
      tipo VARCHAR(50) NOT NULL,
      descricao TEXT,
      data_inicio TIMESTAMP NOT NULL,
      data_fim TIMESTAMP,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.query("ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS impacto_dias INTEGER");

    // ── Multi-empresa (multi-tenant) ──
    await db.query(`CREATE TABLE IF NOT EXISTS empresas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome VARCHAR(255) NOT NULL,
      cnpj VARCHAR(18),
      ativo BOOLEAN DEFAULT TRUE,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_id UUID");
    await db.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_super BOOLEAN DEFAULT FALSE");
    await db.query("ALTER TABLE obras ADD COLUMN IF NOT EXISTS empresa_id UUID");
    await db.query("ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS empresa_id UUID");
    // Empresa padrão + backfill dos dados existentes
    await db.query("INSERT INTO empresas (nome) SELECT 'Vaccinar' WHERE NOT EXISTS (SELECT 1 FROM empresas)");
    await db.query("UPDATE obras SET empresa_id = (SELECT id FROM empresas ORDER BY criado_em LIMIT 1) WHERE empresa_id IS NULL");
    await db.query("UPDATE fornecedores SET empresa_id = (SELECT id FROM empresas ORDER BY criado_em LIMIT 1) WHERE empresa_id IS NULL");
    await db.query("UPDATE usuarios SET empresa_id = (SELECT id FROM empresas ORDER BY criado_em LIMIT 1) WHERE empresa_id IS NULL");
    await db.query("UPDATE usuarios SET is_super = TRUE WHERE email = 'ggpauliv'");

    // Documentos da obra (contratos, ART, licenças, projetos...) — metadados extraídos pela IA
    await db.query(`CREATE TABLE IF NOT EXISTS documentos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
      tipo_documento VARCHAR(80),
      titulo TEXT,
      numero VARCHAR(120),
      emissor TEXT,
      partes TEXT,
      data_documento DATE,
      data_validade DATE,
      valor NUMERIC,
      resumo TEXT,
      dados JSONB,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    // Origem da despesa (nfe/nfse/orcamento/manual) para rastreabilidade
    await db.query("ALTER TABLE despesas ADD COLUMN IF NOT EXISTS origem VARCHAR(20)");
    console.log('✅ Schema verificado (multi-empresa + ocorrencias + documentos + orçamentos ok)');
  } catch (e) {
    console.error('⚠️ Falha ao garantir schema:', e.message);
  }
}

app.listen(PORT, () => {
  console.log(`\n🚀 API REST rodando em http://localhost:${PORT}`);
  console.log(`📝 Documentação: consulte README ou Postman collection\n`);
  garantirSchema();
});
