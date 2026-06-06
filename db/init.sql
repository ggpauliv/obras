-- Criar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  papel VARCHAR(50) DEFAULT 'Engenheiro',
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de obras
CREATE TABLE obras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cliente VARCHAR(255) NOT NULL,
  tipo VARCHAR(100),
  inicio DATE NOT NULL,
  termino DATE NOT NULL,
  pct INTEGER DEFAULT 0 CHECK (pct >= 0 AND pct <= 100),
  status VARCHAR(50) DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'andamento', 'atrasada', 'concluida')),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de fases
CREATE TABLE fases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  nome VARCHAR(255) NOT NULL,
  inicio DATE NOT NULL,
  termino DATE NOT NULL,
  pct INTEGER DEFAULT 0 CHECK (pct >= 0 AND pct <= 100),
  status VARCHAR(50) DEFAULT 'nao_iniciada' CHECK (status IN ('nao_iniciada', 'andamento', 'atrasada', 'concluida')),
  categoria VARCHAR(50) CHECK (categoria IN ('compra', 'instalacao', 'manutencao', 'servico', 'etapa_obra')),
  descricao TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(obra_id, ordem)
);

-- Tabela de despesas
CREATE TABLE despesas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  fase_id UUID REFERENCES fases(id) ON DELETE SET NULL,
  descricao VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  valor NUMERIC(12, 2) NOT NULL,
  data DATE NOT NULL,
  fornecedor VARCHAR(255),
  cnpj VARCHAR(18),
  numero_nota VARCHAR(50),
  chave_acesso VARCHAR(44),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de fornecedores
CREATE TABLE fornecedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  cnpj VARCHAR(18) UNIQUE,
  contato VARCHAR(255),
  status VARCHAR(50) DEFAULT 'ativo' CHECK (status IN ('ativo', 'pendente', 'inativo')),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de auditoria
CREATE TABLE auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_fases_obra_id ON fases(obra_id);
CREATE INDEX idx_despesas_obra_id ON despesas(obra_id);
CREATE INDEX idx_despesas_fase_id ON despesas(fase_id);
CREATE INDEX idx_auditoria_obra_id ON auditoria(obra_id);
CREATE INDEX idx_auditoria_usuario_id ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_data ON auditoria(data DESC);

-- Função para atualizar atualizado_em
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar atualizado_em
CREATE TRIGGER usuarios_update_timestamp
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();

CREATE TRIGGER obras_update_timestamp
  BEFORE UPDATE ON obras
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();

CREATE TRIGGER fases_update_timestamp
  BEFORE UPDATE ON fases
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();

CREATE TRIGGER despesas_update_timestamp
  BEFORE UPDATE ON despesas
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();

CREATE TRIGGER fornecedores_update_timestamp
  BEFORE UPDATE ON fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();

-- Tabela de orçamentos
CREATE TABLE orcamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  valor_total NUMERIC(12, 2),
  prazo_dias INTEGER,
  tipo_orcamento VARCHAR(100),
  status VARCHAR(50) DEFAULT 'ativo' CHECK (status IN ('ativo', 'vencido', 'aceito', 'descartado')),
  data_envio DATE,
  data_emissao DATE,
  numero_cotacao VARCHAR(100),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de linhas de orçamento
CREATE TABLE linhas_orcamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  item_numero VARCHAR(50),
  descricao TEXT NOT NULL,
  quantidade NUMERIC(10, 4),
  valor_unitario NUMERIC(12, 2),
  valor_total NUMERIC(12, 2),
  categoria VARCHAR(100),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_orcamentos_obra_id ON orcamentos(obra_id);
CREATE INDEX idx_orcamentos_fornecedor_id ON orcamentos(fornecedor_id);
CREATE INDEX idx_linhas_orcamento_orcamento_id ON linhas_orcamento(orcamento_id);
CREATE INDEX idx_linhas_orcamento_item ON linhas_orcamento(item_numero);

-- Trigger para orcamentos
CREATE TRIGGER orcamentos_update_timestamp
  BEFORE UPDATE ON orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();
