# Módulo de Orçamentos Comparativos ✅

## Status: ✅ Implementado

Sistema completo de **importação, armazenamento e comparação de orçamentos** de múltiplos fornecedores.

---

## 📋 Funcionalidades

### ✅ Importação de Planilhas Excel
- **Suporta**: Mapas de Concorrência, Orçamentos, Cotações
- **Formato**: .xlsx, .xls
- **Extração automática de**:
  - Nome do fornecedor
  - CNPJ
  - Número de cotação
  - Data de emissão
  - Itens/linhas com descrição e valores
  - Categorização automática de itens

### ✅ Armazenamento Persistente
- Tabelas: `orcamentos`, `linhas_orcamento`
- Vinculação com fornecedores e obras
- Auditoria automática de importações

### ✅ Dashboard Comparativo
- **Cards de resumo**: Total de orçamentos, melhor preço, diferença, economia %
- **Gráfico de barras**: Visualização comparativa de preços
- **Tabela comparativa**: Valores, diferenças, prazos, status
- **Ranking**: Posicionamento dos fornecedores
- **Seleção interativa**: Comparar orçamentos específicos

---

## 🛠️ Arquitetura

### Backend (`server-api.js`)

#### Endpoints de Orçamentos

```
GET    /api/orcamentos                 → Lista orçamentos da obra
GET    /api/orcamentos/:id             → Detalhes + linhas
POST   /api/orcamentos                 → Criar manualmente
DELETE /api/orcamentos/:id             → Remover
POST   /api/orcamentos/importar        → Importar Excel (base64)
GET    /api/orcamentos/comparar        → Análise comparativa
```

#### Importador Excel (`orcamento-extrator.js`)

```javascript
extrairOrcamento(filePath)
→ {
    fornecedor: "Nome",
    cnpj: "XX.XXX.XXX/0001-XX",
    numeroCotacao: "001",
    dataEmissao: "2024-06-04",
    valorTotal: 150000.00,
    prazoDias: 30,
    linhas: [
      { itemNumero, descricao, quantidade, valorUnitario, valorTotal, categoria }
    ],
    avisos: []
  }
```

### Frontend

#### Componentes React

1. **`OrcamentosUploadPage.tsx`**
   - Drag & drop de múltiplos arquivos
   - Preview dos dados extraídos
   - Progresso de importação
   - Resultados com avisos/erros

2. **`OrcamentosComparativaPage.tsx`**
   - Seleção de orçamentos para comparar
   - Cards de resumo (Total, Melhor Preço, Economia)
   - Gráfico de barras interativo
   - Tabela comparativa com sorting
   - Ranking dos fornecedores

#### Store (`src/store/orcamentos.ts`)

```typescript
listarOrcamentos(obraId)         → Orcamento[]
obterOrcamento(id)               → Orcamento & { linhas }
criarOrcamento(dados)            → Orcamento
removerOrcamento(id)             → void
importarOrcamento(obraId, file)  → { sucesso, orcamento, avisos }
compararOrcamentos(obraId)       → { total, melhorPreco, diferenca, economia% }
```

#### Cliente API (`src/api/client.ts`)

Adiciona métodos:
- `listarOrcamentos(obraId)`
- `obterOrcamento(id)`
- `criarOrcamento(dados)`
- `deletarOrcamento(id)`
- `importarOrcamento(obraId, arquivo)`
- `compararOrcamentos(obraId)`

### Banco de Dados

#### Tabela: `orcamentos`
```sql
id, obra_id, fornecedor_id, nome, descricao, valor_total,
prazo_dias, status, data_envio, data_emissao, numero_cotacao,
criado_em, atualizado_em
```

#### Tabela: `linhas_orcamento`
```sql
id, orcamento_id, item_numero, descricao, quantidade,
valor_unitario, valor_total, categoria, criado_em
```

#### Índices
- `idx_orcamentos_obra_id`
- `idx_orcamentos_fornecedor_id`
- `idx_linhas_orcamento_orcamento_id`

---

## 🚀 Como usar

### 1. Importar Orçamentos

**Via Interface:**
1. Acesse a aba "Orçamentos" → "Upload"
2. Arraste ou selecione planilhas Excel
3. Clique em "Importar Orçamentos"
4. Verifique os resultados (avisos, erros)

**Arquivos suportados:**
- Mapas de Concorrência (FORTE, AMG, PRIMUS, CEMAF)
- Planilhas orçamentárias genéricas
- Qualquer Excel com itens hierárquicos (1, 1.1, 2, etc.)

### 2. Visualizar Comparação

1. Acesse a aba "Orçamentos" → "Comparativo"
2. Selecione orçamentos a comparar (checkbox)
3. Análise automática mostra:
   - Ranking por preço
   - Diferenças percentuais
   - Gráfico visual
   - Tabela detalhada

### 3. Analisar Detalhes

- Clique no nome de um orçamento para ver todas as linhas
- Filtro por categoria (Indiretos, Estrutura, etc.)
- Comparação item-a-item entre fornecedores

---

## 📊 Exemplo de Análise

### Dados importados:
```
FORTE CONSTRUÇÕES    → R$ 1.250.000,00 (15 dias)
AMG                  → R$ 1.320.000,00 (20 dias)
PRIMUS              → R$ 1.180.000,00 (12 dias) ⭐ Melhor
CEMAF               → R$ 1.400.000,00 (25 dias)
```

### Dashboard mostra:
- **Total de orçamentos**: 4
- **Melhor preço**: R$ 1.180.000,00 (PRIMUS)
- **Diferença**: R$ 220.000,00
- **Economia**: 15,71% em relação ao mais caro

---

## 🔍 Categorização Automática

Itens são categorizados automaticamente:

```
"Indiretos" 
  → Equipe Admin, Canteiro, Locações, Segurança

"Preliminares"
  → Locação da Obra, Topografia, Limpeza

"Estrutura"
  → Fundações, Estrutura, Concreto

"Alvenaria"
  → Paredes, Blocos, Argamassa

"Instalações"
  → Elétrica, Hidráulica, Gás, Telefonia

"Acabamento"
  → Pintura, Piso, Revestimento

"Cobertura"
  → Telhas, Estrutura, Calhas
```

---

## ⚙️ Integração com Fase E

O módulo **aproveita toda a infraestrutura da Fase E**:

- ✅ Autenticação JWT
- ✅ PostgreSQL persistente
- ✅ Auditoria automática (quem importou, quando)
- ✅ Vincul com fornecedores existentes
- ✅ Cascata de deleção (obra → orçamentos → linhas)

---

## 📱 Interface

### Upload
```
┌─────────────────────────────────────┐
│  📋 Importar Orçamentos              │
├─────────────────────────────────────┤
│  [Arraste arquivos aqui]            │
│  Formatos: .xlsx, .xls              │
│                                      │
│  ✓ FORTE CONSTRUÇÕES.xlsx            │
│  ✓ AMG.xlsx                          │
│  ✓ PRIMUS.xlsx                       │
│  ✓ CEMAF.xlsx                        │
│                                      │
│           [Importar]  [Limpar]      │
└─────────────────────────────────────┘
```

### Comparativo
```
┌──────────┬──────────┬──────────┬──────────┐
│ 4 Orçam. │ Mel.Preço│Diferença │Economia │
│          │R$ 1.18M  │R$ 220K   │  15,71% │
└──────────┴──────────┴──────────┴──────────┘

[✓] PRIMUS - R$ 1.180.000 (12 dias)      🏆
[✓] FORTE - R$ 1.250.000 (15 dias)
[ ] AMG - R$ 1.320.000 (20 dias)
[ ] CEMAF - R$ 1.400.000 (25 dias)

┌─────────────────────────────────────┐
│  Comparação Visual                   │
│                                      │
│  PRIMUS   ████████████░░░░░░░░░░ 1.18M
│  FORTE    █████████████░░░░░░░░░░ 1.25M
│  AMG      ██████████████░░░░░░░░░ 1.32M
│  CEMAF    ████████████████░░░░░░░ 1.40M
└─────────────────────────────────────┘
```

---

## 🔐 Segurança

- ✅ Validação de arquivo (whitelist de extensões)
- ✅ Limite de tamanho (20MB)
- ✅ Parsing seguro com XLSX
- ✅ Autenticação JWT obrigatória
- ✅ Auditoria de todas as importações
- ✅ Limpeza de arquivos temporários

---

## 📝 Próximas Melhorias

- [ ] Comparação item-a-item por categoria
- [ ] Histórico de versões de orçamentos
- [ ] Exportação de comparativo (PDF/Excel)
- [ ] Análise de itens comuns entre fornecedores
- [ ] Alert quando novo orçamento é mais caro que anterior
- [ ] Integração com financeiro (despesas vs orçado)
- [ ] Validação de CPF/CNPJ automática

---

## 📚 Referências

- [XLSX Parser](https://github.com/SheetJS/sheetjs)
- PostgreSQL Constraints: [Docs](https://www.postgresql.org/docs/15/ddl-constraints.html)
- React File Handling: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/File)

---

**Módulo Orçamentos Implementado:** ✅ 2026-06-04
