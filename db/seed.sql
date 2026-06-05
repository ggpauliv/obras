-- Dados iniciais para demonstração

-- Usuários (com senhas bcrypt para desenvolvimento)
-- Senha "110989" encodada com bcryptjs (10 rounds)
INSERT INTO usuarios (nome, email, senha_hash, papel, ativo) VALUES
('Admin Pawliv', 'ggpauliv', '$2b$10$d1T.0ytkYzfEMf.QEcYAI.k7aGq0qCcUKfGBZ7.ZhCVfNOgDVFNua', 'Admin', TRUE),
('Gerente Obras', 'gerente@pawliv.local', '$2b$10$0yNGz7CrbZN4NViTrcLeU.sKiCKn4O6PbCcwLM3RPx0Q/OnxvNYCK', 'Gestor', TRUE),
('Supervisor Campo', 'supervisor@pawliv.local', '$2b$10$0yNGz7CrbZN4NViTrcLeU.sKiCKn4O6PbCcwLM3RPx0Q/OnxvNYCK', 'Engenheiro', TRUE);

-- Obras (seed básico)
INSERT INTO obras (nome, cliente, tipo, inicio, termino, pct, status) VALUES
('Expansão Fábrica ABC', 'ABC Indústrias', 'Expansão', '2024-01-15'::DATE, '2024-12-31'::DATE, 35, 'andamento'),
('Reforma Prédio Comercial', 'Imóveis XYZ', 'Reforma', '2024-02-01'::DATE, '2024-09-30'::DATE, 50, 'andamento'),
('Instalação Sistema HVAC', 'Hospitalar Plus', 'Instalação', '2024-03-10'::DATE, '2024-07-30'::DATE, 75, 'andamento');

-- Fases (para a primeira obra)
INSERT INTO fases (obra_id, ordem, nome, inicio, termino, pct, status, categoria, descricao)
SELECT id, 1, 'Fundação e Estrutura', '2024-01-15'::DATE, '2024-03-31'::DATE, 80, 'concluida', 'etapa_obra', 'Escavação, concragem e estrutura de aço'
FROM obras WHERE nome = 'Expansão Fábrica ABC'
UNION ALL
SELECT id, 2, 'Instalações Elétricas', '2024-04-01'::DATE, '2024-06-30'::DATE, 60, 'andamento', 'instalacao', 'Passagem de cabos, painéis e ligações'
FROM obras WHERE nome = 'Expansão Fábrica ABC'
UNION ALL
SELECT id, 3, 'Acabamento e Pintura', '2024-07-01'::DATE, '2024-12-31'::DATE, 0, 'nao_iniciada', 'etapa_obra', 'Paredes, piso, pintura e limpeza'
FROM obras WHERE nome = 'Expansão Fábrica ABC';

-- Fornecedores
INSERT INTO fornecedores (nome, categoria, cnpj, contato, status) VALUES
('Fornecedor de Aço LTDA', 'Materiais', '12.345.678/0001-90', 'contato@aco.com.br', 'ativo'),
('Serviços Elétricos ABC', 'Serviços', '98.765.432/0001-11', 'obras@eletricoabc.com.br', 'ativo'),
('Distribuidora de Materiais', 'Distribuição', '55.555.555/0001-22', 'vendas@distribuidora.com.br', 'ativo');

-- Despesas (exemplos)
INSERT INTO despesas (obra_id, fase_id, descricao, categoria, valor, data, fornecedor, cnpj)
SELECT obras.id, fases.id, 'Entrega de aço estrutural', 'Compra', 45000.00, '2024-02-10'::DATE, 'Fornecedor de Aço LTDA', '12.345.678/0001-90'
FROM obras, fases
WHERE obras.nome = 'Expansão Fábrica ABC' AND fases.nome = 'Fundação e Estrutura'
LIMIT 1;

INSERT INTO despesas (obra_id, fase_id, descricao, categoria, valor, data, fornecedor, cnpj)
SELECT obras.id, fases.id, 'Serviço de soldagem e montagem', 'Serviço', 18000.00, '2024-03-05'::DATE, 'Serviços Elétricos ABC', '98.765.432/0001-11'
FROM obras, fases
WHERE obras.nome = 'Expansão Fábrica ABC' AND fases.nome = 'Fundação e Estrutura'
LIMIT 1;

-- Auditoria (eventos iniciais)
INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id, data)
SELECT obras.id, 'CREATE', 'Obra criada', 'Obra Expansão Fábrica ABC criada no sistema', usuarios.id, CURRENT_TIMESTAMP - INTERVAL '5 days'
FROM obras, usuarios
WHERE obras.nome = 'Expansão Fábrica ABC' AND usuarios.email = 'admin@pawliv.local'
LIMIT 1;

INSERT INTO auditoria (obra_id, tipo, titulo, descricao, usuario_id, data)
SELECT obras.id, 'UPDATE', 'Status atualizado', 'Obra movida para "andamento"', usuarios.id, CURRENT_TIMESTAMP - INTERVAL '4 days'
FROM obras, usuarios
WHERE obras.nome = 'Expansão Fábrica ABC' AND usuarios.email = 'gerente@pawliv.local'
LIMIT 1;
