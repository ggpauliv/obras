/**
 * Backend proxy para a API do Google Gemini
 * Roda em http://localhost:3001
 * Recebe requisições do frontend React e chama a API do Gemini
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Carregar .env.local (desenvolvimento)
dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = 3001; // Backend sempre na 3001
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

if (!GEMINI_API_KEY) {
  console.error('❌ ERRO: REACT_APP_GEMINI_API_KEY não está configurada em .env.local');
  process.exit(1);
}

console.log('✅ Chave Gemini API configurada');

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend proxy rodando' });
});

// Rota principal de processamento de documentos com Gemini
app.post('/api/process-document', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        erro: 'Content é obrigatório',
      });
    }

    const systemPrompt = `Você é um especialista em gestão de obras industriais e comerciais. Analise o documento fornecido e extraia itens de obra em formato JSON.

O documento pode ser de DIVERSOS tipos, todos válidos:
- Cronograma físico-financeiro
- Orçamento detalhado / planilha orçamentária
- Estrutura Analítica de Projeto (EAP)
- Nota Fiscal (NF-e / NFS-e), pedido de compra, ordem de serviço ou contrato

IMPORTANTE: Em uma obra industrial, cada AQUISIÇÃO, INSTALAÇÃO, MANUTENÇÃO ou SERVIÇO é um item válido da obra — mesmo que o documento descreva um único item. Exemplos válidos a serem extraídos como "fases":
- Compra de equipamento (ar-condicionado, motores, elevadores, máquinas)
- Compra de mobiliário (mesas, cadeiras, computadores)
- Instalação elétrica / hidráulica (passagem de cabos, ligação de motor, contatoras)
- Manutenção, conserto, restauração ou revisão de equipamentos

NÃO rejeite Notas Fiscais. Trate cada serviço/produto descrito como uma fase, usando:
- nome: o produto/serviço (ex.: "Instalação elétrica - passagem de cabos")
- inicio: data de emissão da nota, se houver
- termino: data de vencimento/entrega, se houver
- orc: valor do item (ou valor total da nota se for item único)
Se houver vários itens/produtos discriminados, crie uma fase para cada um.

Cada fase deve ter um campo "categoria": "compra", "instalacao", "manutencao", "servico" ou "etapa_obra".

PLANILHAS ORÇAMENTÁRIAS / MAPA DE CONCORRÊNCIA (importante):
Quando o documento for uma planilha orçamentária hierárquica (itens numerados como 1, 1.1, 1.2, 2, 3, 3.1...), o conteúdo virá em formato CSV (uma linha por item, colunas separadas por vírgula). Nesse caso:
- Trate os itens de NÍVEL PRINCIPAL (números inteiros: 1, 2, 3, ...) como as "fases" da obra (ex.: "Indiretos", "Serviços Preliminares", "Fundações", "Estruturas de Concreto", "Piso de Concreto Industrial").
- Use a coluna "Valor Total" do grupo como "orc" da fase. Se o grupo não tiver total próprio, some os sub-itens.
- Liste os principais sub-itens (1.1, 1.2...) no campo "descricao" da fase correspondente, de forma resumida.
- categoria = "etapa_obra" para essas fases.
- NÃO crie uma fase separada para cada sub-item; consolide por grupo principal para não gerar dezenas de fases.
- Use o cabeçalho da planilha para identificar a obra, o fornecedor/empreiteiro e a data de emissão, citando-os em "avisos" quando relevante.

REGRA DE ORÇAMENTO (importante):
- NUNCA repita o valor total em cada item. Se o documento traz valor por item, use o valor de cada item.
- Se o documento traz apenas UM valor total para vários itens (ex.: uma nota fiscal com vários serviços e um único total), deixe "orc" como null em cada item e informe o valor total uma única vez em "avisos" (campo "Orçamento"), explicando que o total não pôde ser separado por item.

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
  "avisos": [
    {
      "campo": "Nome do campo",
      "mensagem": "Descrição do aviso ou inconsistência detectada"
    }
  ],
  "financeiro": {
    "fornecedor": "Razão social do emitente/prestador (ou null)",
    "cnpj": "CNPJ do emitente (ou null)",
    "numeroNota": "Número da nota fiscal (ou null)",
    "serie": "Série da nota (ou null)",
    "chaveAcesso": "Chave de acesso de 44 dígitos da NF-e/NFS-e (ou null)",
    "naturezaOperacao": "Natureza da operação / descrição do serviço (ou null)",
    "dataEmissao": "DD/MM/YYYY ou null",
    "valorTotal": "R$ X.XXX,XX ou null"
  },
  "confiancaGeral": 90,
  "tipoDocumento": "Cronograma/Orçamento/Nota Fiscal/Pedido de Compra/Projeto/Outro"
}

REGRA FINANCEIRO: o bloco "financeiro" registra a DESPESA da obra (não gestão de pagamentos). Preencha-o SOMENTE quando o documento for uma nota fiscal, fatura ou pedido de compra. Caso contrário, retorne "financeiro": null.`;

    // Preparar conteúdo para Gemini
    let parts = [];

    // Adicionar partes de conteúdo
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === 'text') {
          parts.push({ text: part.text });
        } else if (part.type === 'image') {
          // Para imagens, Gemini usa inlineData
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

    // Chamar API do Gemini via HTTP (como no HTML funcional)
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
      console.error('❌ Erro da API Gemini:', response.status, errorData);

      throw new Error(
        `Erro Gemini (${response.status}): ${
          errorData.error?.message || JSON.stringify(errorData)
        }`
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('❌ Erro ao fazer parse JSON da resposta:', e.message);
      const text = await response.text();
      console.error('📄 Resposta raw:', text.substring(0, 500));
      throw new Error('Resposta não é JSON válido');
    }

    if (!data.candidates) {
      console.error('❌ Resposta do Gemini sem candidates:', JSON.stringify(data));
      throw new Error('Resposta sem candidates');
    }

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
    console.error('❌ Erro no servidor:', error.message);
    res.status(500).json({
      erro: `Erro no servidor: ${error.message}`,
    });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Backend proxy rodando em http://localhost:${PORT}`);
  console.log(`📝 Documentação:`);
  console.log(`   GET  /api/health         - Health check`);
  console.log(`   POST /api/process-document - Processar documento\n`);
});
