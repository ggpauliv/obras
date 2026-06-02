/**
 * Backend proxy para Claude API
 * Roda em http://localhost:3001
 * Recebe requisições do frontend React e chama Claude API
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

    console.log('📨 Enviando requisição para Gemini API...');

    const systemPrompt = `Você é um especialista em análise de documentos de construção. Analise o documento fornecido e extraia as seguintes informações em formato JSON:

1. **Fases do projeto**: Identifique cada fase/etapa do projeto
2. **Cronograma**: Data de início e término de cada fase
3. **Orçamento**: Valor total de cada fase (se disponível)
4. **Descrição**: Breve descrição das atividades de cada fase

Retorne APENAS um JSON VÁLIDO com a seguinte estrutura:
{
  "fases": [
    {
      "id": "01",
      "nome": "Nome da fase",
      "inicio": "DD/MM/YYYY",
      "termino": "DD/MM/YYYY",
      "orc": "R$ X.XXX,XX",
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
  "confiancaGeral": 90,
  "tipoDocumento": "Cronograma/Orçamento/Projeto/Outro"
}`;

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

    console.log('🔍 Enviando para Gemini 2.5 Flash...');

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

    console.log('✅ Resposta recebida do Gemini');
    console.log('🔍 Chaves da resposta:', Object.keys(data));

    // Log detalhado
    if (data.candidates) {
      console.log('📊 Candidates encontrados:', data.candidates.length);
      if (data.candidates[0]) {
        console.log('🔎 Candidate[0] keys:', Object.keys(data.candidates[0]));
        if (data.candidates[0].content) {
          console.log('📝 Content keys:', Object.keys(data.candidates[0].content));
          if (data.candidates[0].content.parts) {
            console.log('📦 Parts encontradas:', data.candidates[0].content.parts.length);
            console.log('📄 Part[0]:', JSON.stringify(data.candidates[0].content.parts[0]).substring(0, 300));
          }
        }
      }
    } else {
      console.error('❌ Nenhum candidates na resposta. Data completa:', JSON.stringify(data, null, 2));
      throw new Error('Resposta sem candidates');
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('❌ Estrutura incompleta');
      throw new Error('Resposta sem texto');
    }

    const textoResposta = data.candidates[0].content.parts[0].text;
    console.log('📄 Resposta (primeiros 300 chars):', textoResposta.substring(0, 300));

    const dadosExtraidos = JSON.parse(textoResposta);

    res.json({
      sucesso: true,
      fases: dadosExtraidos.fases || [],
      avisos: dadosExtraidos.avisos || [],
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
