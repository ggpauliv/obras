export interface ExtractedPhase {
  id: string;
  nome: string;
  inicio: string;
  termino: string;
  orc: string;
  descricao?: string;
  confianca: number;
}

export interface DocumentExtractionResult {
  sucesso: boolean;
  fases: ExtractedPhase[];
  avisos: Array<{ campo: string; mensagem: string }>;
  metadados: {
    nomeDocumento: string;
    dataProcessamento: string;
    tipoDocumento: string;
    confiancaGeral: number;
  };
  erro?: string;
}

// Chave API agora está no backend - frontend não precisa dela

const EXTRACTION_PROMPT = `Você é um especialista em análise de documentos de construção. Analise o documento fornecido e extraia as seguintes informações em formato JSON:

1. **Fases do projeto**: Identifique cada fase/etapa do projeto
2. **Cronograma**: Data de início e término de cada fase
3. **Orçamento**: Valor total de cada fase (se disponível)
4. **Descrição**: Breve descrição das atividades de cada fase

Retorne um JSON VÁLIDO com a seguinte estrutura, sem markdown ou explicações adicionais:
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
}

Se não conseguir extrair informações, retorne um JSON vazio com avisos explicando o motivo.`;

export async function processarDocumento(
  arquivo: File
): Promise<DocumentExtractionResult> {
  try {
    const conteudoBase64 = await fileToBase64(arquivo);
    const mimeType = arquivo.type || 'application/octet-stream';

    console.log(`Processando arquivo com Claude: ${arquivo.name} (${mimeType})`);

    // Preparar conteúdo para enviar ao Claude
    const content: any[] = [
      {
        type: 'text',
        text: EXTRACTION_PROMPT,
      },
    ];

    // Adicionar imagem/arquivo como base64
    const mediaType = getMimeTypeForClaude(mimeType);
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

    // Fazer requisição para o backend proxy (evita CORS)
    const response = await fetch('http://localhost:3001/api/process-document', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        content,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Erro da API Claude: ${response.status} - ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    const textoResposta = data.content
      ?.filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    if (!textoResposta) {
      throw new Error('Gemini retornou resposta vazia');
    }

    console.log('📄 Resposta do Gemini:', textoResposta.substring(0, 200));

    // Gemini deve retornar JSON direto (não precisa extrair)
    let dadosExtraidos;
    try {
      dadosExtraidos = JSON.parse(textoResposta);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error('❌ Erro ao fazer parse JSON:', errorMsg);
      // Tentar extrair JSON se não for direto
      const jsonMatch = textoResposta.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Não foi possível extrair JSON da resposta: ' + textoResposta.substring(0, 200));
      }
      dadosExtraidos = JSON.parse(jsonMatch[0]);
    }

    return {
      sucesso: true,
      fases: (dadosExtraidos.fases || []).map((f: any, idx: number) => ({
        id: f.id || String(idx + 1).padStart(2, '0'),
        nome: f.nome || 'Fase sem nome',
        inicio: f.inicio || '',
        termino: f.termino || '',
        orc: f.orc || 'R$ 0,00',
        descricao: f.descricao,
        confianca: f.confianca || 70,
      })),
      avisos: dadosExtraidos.avisos || [],
      metadados: {
        nomeDocumento: arquivo.name,
        dataProcessamento: new Date().toISOString(),
        tipoDocumento: dadosExtraidos.tipoDocumento || 'Desconhecido',
        confiancaGeral: dadosExtraidos.confiancaGeral || 75,
      },
    };
  } catch (erro) {
    console.error('Erro ao processar documento:', erro);
    return {
      sucesso: false,
      fases: [],
      avisos: [],
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

function getMimeTypeForClaude(
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
