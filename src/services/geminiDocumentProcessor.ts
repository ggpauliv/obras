export interface ExtractedPhase {
  id: string;
  nome: string;
  inicio: string;
  termino: string;
  orc: string;
  categoria?: 'compra' | 'instalacao' | 'manutencao' | 'servico' | 'etapa_obra';
  descricao?: string;
  confianca: number;
}

export interface FinanceiroInfo {
  fornecedor: string | null;
  cnpj: string | null;
  numeroNota: string | null;
  serie: string | null;
  chaveAcesso: string | null;
  naturezaOperacao: string | null;
  dataEmissao: string | null;
  valorTotal: string | null;
}

export interface DocumentExtractionResult {
  sucesso: boolean;
  fases: ExtractedPhase[];
  avisos: Array<{ campo: string; mensagem: string }>;
  financeiro: FinanceiroInfo | null;
  metadados: {
    nomeDocumento: string;
    dataProcessamento: string;
    tipoDocumento: string;
    confiancaGeral: number;
  };
  erro?: string;
}

// Chave API agora está no backend - frontend não precisa dela

/** Tempo máximo de espera pelo processamento (ms). */
const TIMEOUT_MS = 60_000;
/** Tentativas extras em caso de falha transitória (rede / 5xx). */
const MAX_RETRIES = 2;

/** Erro com mensagem já amigável para exibição ao usuário. */
class ErroAmigavel extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch com timeout via AbortController. */
async function fetchComTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

const EXTRACTION_PROMPT = `Você é um especialista em gestão de obras industriais e comerciais. Analise o documento e extraia itens de obra em JSON.

O documento pode ser cronograma, orçamento, EAP, Nota Fiscal (NF-e/NFS-e), pedido de compra, ordem de serviço ou contrato — TODOS são válidos.

Em obras industriais, cada AQUISIÇÃO, INSTALAÇÃO, MANUTENÇÃO ou SERVIÇO é um item válido da obra, mesmo que o documento descreva um único item. NÃO rejeite Notas Fiscais: trate cada produto/serviço discriminado como uma fase (compra de ar-condicionado, computadores, mesas; instalação elétrica; passagem de cabos; manutenção de equipamentos etc.). Use a data de emissão como início e a de vencimento/entrega como término quando existirem.

REGRA DE ORÇAMENTO: NUNCA repita o valor total em cada item. Se houver apenas um valor total para vários itens, deixe "orc" como null em cada item e informe o total uma única vez em "avisos".

Retorne um JSON VÁLIDO com a seguinte estrutura, sem markdown ou explicações adicionais:
{
  "fases": [
    {
      "id": "01",
      "nome": "Nome do item/fase",
      "inicio": "DD/MM/YYYY",
      "termino": "DD/MM/YYYY",
      "orc": "R$ X.XXX,XX",
      "categoria": "compra | instalacao | manutencao | servico | etapa_obra",
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
}

Se não conseguir extrair informações, retorne um JSON vazio com avisos explicando o motivo.`;

export async function processarDocumento(
  arquivo: File
): Promise<DocumentExtractionResult> {
  try {
    const conteudoBase64 = await fileToBase64(arquivo);
    const mimeType = arquivo.type || 'application/octet-stream';

    console.log(`Processando arquivo com Gemini: ${arquivo.name} (${mimeType})`);

    // Preparar conteúdo para enviar à IA
    const content: any[] = [
      {
        type: 'text',
        text: EXTRACTION_PROMPT,
      },
    ];

    // Adicionar imagem/arquivo como base64
    const mediaType = getMimeTypeParaIA(mimeType);
    if (mediaType) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: conteudoBase64,
        },
      });
    } else {
      // Para não-imagens, incluir conteúdo como texto
      const textoConteudo = await arquivo.text().catch(() => '');
      if (textoConteudo) {
        content.push({
          type: 'text',
          text: `\n\n### Conteúdo do arquivo:\n${textoConteudo.substring(0, 10000)}`,
        });
      }
    }

    // Fazer requisição para o backend proxy (evita CORS), com timeout e retry.
    const body = JSON.stringify({ content });
    let response: Response | null = null;

    for (let tentativa = 0; tentativa <= MAX_RETRIES; tentativa++) {
      try {
        response = await fetchComTimeout(
          'http://localhost:3001/api/process-document',
          { method: 'POST', headers: { 'content-type': 'application/json' }, body },
          TIMEOUT_MS
        );
      } catch (e) {
        // Falha de rede ou abort (timeout).
        if (e instanceof DOMException && e.name === 'AbortError') {
          if (tentativa < MAX_RETRIES) { await sleep(1000 * (tentativa + 1)); continue; }
          throw new ErroAmigavel('O processamento demorou mais de 60s e foi cancelado. Tente um arquivo menor ou mais simples.');
        }
        // "Failed to fetch" → backend provavelmente offline.
        if (tentativa < MAX_RETRIES) { await sleep(1000 * (tentativa + 1)); continue; }
        throw new ErroAmigavel('Não foi possível conectar ao servidor de importação. Verifique se ele está rodando (npm start) e tente novamente.');
      }

      // 5xx é transitório: vale repetir. 4xx não.
      if (response.status >= 500 && tentativa < MAX_RETRIES) {
        await sleep(1000 * (tentativa + 1));
        continue;
      }
      break;
    }

    if (!response) {
      throw new ErroAmigavel('Não foi possível concluir a requisição de importação.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ErroAmigavel(
        errorData.erro || errorData.error?.message ||
        `O servidor retornou um erro (${response.status}). Tente novamente em instantes.`
      );
    }

    // O backend já processa a resposta da IA e devolve o objeto
    // estruturado { sucesso, fases, avisos, metadados }.
    let dadosExtraidos: any;
    try {
      dadosExtraidos = await response.json();
    } catch {
      throw new ErroAmigavel('Não conseguimos interpretar a resposta da IA. Tente novamente.');
    }

    if (dadosExtraidos.erro) {
      throw new Error(dadosExtraidos.erro);
    }

    console.log('📄 Resposta do backend:', dadosExtraidos);

    return {
      sucesso: true,
      fases: (dadosExtraidos.fases || []).map((f: any, idx: number) => ({
        id: f.id || String(idx + 1).padStart(2, '0'),
        nome: f.nome || 'Fase sem nome',
        inicio: f.inicio || '',
        termino: f.termino || '',
        orc: f.orc || '—',
        categoria: f.categoria,
        descricao: f.descricao,
        confianca: f.confianca || 70,
      })),
      avisos: dadosExtraidos.avisos || [],
      financeiro: dadosExtraidos.financeiro || null,
      metadados: {
        nomeDocumento: arquivo.name,
        dataProcessamento: new Date().toISOString(),
        tipoDocumento: dadosExtraidos.metadados?.tipoDocumento || 'Desconhecido',
        confiancaGeral: dadosExtraidos.metadados?.confiancaGeral || 75,
      },
    };
  } catch (erro) {
    console.error('Erro ao processar documento:', erro);
    return {
      sucesso: false,
      fases: [],
      avisos: [],
      financeiro: null,
      metadados: {
        nomeDocumento: arquivo.name,
        dataProcessamento: new Date().toISOString(),
        tipoDocumento: 'Erro',
        confiancaGeral: 0,
      },
      erro: erro instanceof Error ? erro.message : 'Erro desconhecido',
    };
  }
}

function getMimeTypeParaIA(
  mimeType: string
): string | null {
  if (mimeType.includes('pdf')) return 'application/pdf';
  if (mimeType.includes('image/png')) return 'image/png';
  if (mimeType.includes('image/jpeg')) return 'image/jpeg';
  if (mimeType.includes('image/gif')) return 'image/gif';
  if (mimeType.includes('image/webp')) return 'image/webp';
  return null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
