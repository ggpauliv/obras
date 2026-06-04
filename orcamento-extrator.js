/**
 * Extrator de dados de planilhas de orçamento
 * Suporta: Mapas de Concorrência, Orçamentos, Cotações em Excel
 */

const XLSX = require('xlsx');

/**
 * Extrai dados de uma planilha de orçamento
 * @param {string} filePath - caminho do arquivo Excel
 * @returns {Promise<Object>} - dados estruturados do orçamento
 */
async function extrairOrcamento(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Extrair cabeçalho (fornecedor, data, etc)
    const cabecalho = extrairCabecalho(rawData);

    // Extrair linhas/itens
    const linhas = extrairLinhas(rawData);

    // Calcular total
    const valorTotal = linhas.reduce((sum, linha) => sum + (linha.valorTotal || 0), 0);

    return {
      sucesso: true,
      fornecedor: cabecalho.fornecedor,
      cnpj: cabecalho.cnpj,
      numeroCotacao: cabecalho.numeroCotacao,
      dataEmissao: cabecalho.dataEmissao,
      dataEnvio: new Date().toISOString().split('T')[0],
      valorTotal: parseFloat(valorTotal.toFixed(2)),
      prazoDias: cabecalho.prazoDias,
      linhas: linhas,
      avisos: cabecalho.avisos,
    };
  } catch (error) {
    console.error('❌ Erro ao extrair orçamento:', error);
    return {
      sucesso: false,
      erro: error.message,
    };
  }
}

/**
 * Extrai informações do cabeçalho
 */
function extrairCabecalho(rawData) {
  const resultado = {
    fornecedor: null,
    cnpj: null,
    numeroCotacao: null,
    dataEmissao: null,
    prazoDias: null,
    avisos: [],
  };

  // Procurar nas primeiras 10 linhas por padrões conhecidos
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const linha = rawData[i];

    // Procurar "Nº Cotação", "CNPJ", "Emissão", etc
    for (let j = 0; j < linha.length; j++) {
      const celula = (linha[j] || '').toString().toUpperCase();
      const proximaCelula = (linha[j + 1] || '').toString();

      if (celula.includes('COTAÇÃO') || celula.includes('NÚMERO')) {
        resultado.numeroCotacao = proximaCelula;
      } else if (celula.includes('CNPJ')) {
        resultado.cnpj = proximaCelula;
      } else if (celula.includes('EMISSÃO') || celula.includes('EMISSAO')) {
        const data = converterData(proximaCelula);
        if (data) resultado.dataEmissao = data;
      } else if (celula.includes('FORNECEDOR') || celula.includes('EMPRESA')) {
        resultado.fornecedor = proximaCelula;
      } else if (celula.includes('PRAZO')) {
        const prazo = parseInt(proximaCelula);
        if (!isNaN(prazo)) resultado.prazoDias = prazo;
      }
    }

    // Primeira célula com texto é nome (se não foi encontrado fornecedor ainda)
    if (!resultado.fornecedor && linha[3]) {
      const texto = (linha[3] || '').toString();
      if (texto.length > 5 && texto.length < 100) {
        resultado.fornecedor = texto;
      }
    }
  }

  return resultado;
}

/**
 * Extrai linhas de itens/descrição/valores
 */
function extrairLinhas(rawData) {
  const linhas = [];
  let inicioLinhas = -1;

  // Encontrar onde começam os itens (primeira coluna com número tipo "1", "1.1", "2")
  for (let i = 0; i < rawData.length; i++) {
    const primeira = (rawData[i][0] || '').toString().trim();
    if (/^[0-9]+(\.[0-9]+)?$/.test(primeira)) {
      inicioLinhas = i;
      break;
    }
  }

  if (inicioLinhas === -1) {
    // Se não achar itens numerados, pular cabeçalho padrão (6 linhas)
    inicioLinhas = 6;
  }

  // Processar linhas de dados
  for (let i = inicioLinhas; i < rawData.length; i++) {
    const linha = rawData[i];

    // Pular linhas vazias
    if (!linha || linha.length < 2) continue;

    const itemNumero = (linha[0] || '').toString().trim();
    const descricao = (linha[1] || '').toString().trim();

    // Pular se não houver descrição
    if (!descricao || descricao.length < 3) continue;

    // Procurar valores nas últimas colunas
    const valores = extrairValores(linha);

    // Se há descrição e pelo menos um valor, é um item válido
    if (descricao && (valores.valorUnitario || valores.valorTotal)) {
      linhas.push({
        itemNumero: itemNumero || String(linhas.length + 1),
        descricao: descricao,
        quantidade: valores.quantidade,
        valorUnitario: valores.valorUnitario,
        valorTotal: valores.valorTotal,
        categoria: inferirCategoria(descricao),
      });
    }
  }

  return linhas;
}

/**
 * Extrai valores numéricos (quantidade, unitário, total)
 */
function extrairValores(linha) {
  const resultado = {
    quantidade: null,
    valorUnitario: null,
    valorTotal: null,
  };

  // Procurar nos últimos 5 elementos (onde geralmente estão os valores)
  const ultimosCinco = linha.slice(-5);

  let valoresEncontrados = [];
  for (let i = 0; i < ultimosCinco.length; i++) {
    const celula = ultimosCinco[i];
    const valor = parseFloat(celula);

    if (!isNaN(valor) && valor > 0) {
      valoresEncontrados.push({ indice: i, valor: valor });
    }
  }

  // Se há valores encontrados, associar
  if (valoresEncontrados.length >= 1) {
    // Último valor é geralmente o total
    resultado.valorTotal = valoresEncontrados[valoresEncontrados.length - 1].valor;
  }

  if (valoresEncontrados.length >= 2) {
    // Penúltimo pode ser unitário
    resultado.valorUnitario = valoresEncontrados[valoresEncontrados.length - 2].valor;
  }

  if (valoresEncontrados.length >= 3) {
    // Antepenúltimo pode ser quantidade
    resultado.quantidade = valoresEncontrados[0].valor;
  }

  return resultado;
}

/**
 * Inferir categoria a partir da descrição
 */
function inferirCategoria(descricao) {
  const desc = descricao.toUpperCase();

  if (desc.includes('INDIRETO')) return 'Indiretos';
  if (desc.includes('PRELIMINAR') || desc.includes('LOCAÇÃO')) return 'Preliminares';
  if (desc.includes('FUNDAÇÃO') || desc.includes('ESTRUTURA')) return 'Estrutura';
  if (desc.includes('ALVENARIA') || desc.includes('PAREDE')) return 'Alvenaria';
  if (desc.includes('INSTALAÇÃO') || desc.includes('ELÉTRICA') || desc.includes('HIDRÁULICA')) return 'Instalações';
  if (desc.includes('ACABAMENTO') || desc.includes('PINTURA')) return 'Acabamento';
  if (desc.includes('COBERTURA') || desc.includes('TELHADO')) return 'Cobertura';

  return 'Outros';
}

/**
 * Converter data de diferentes formatos
 */
function converterData(dataStr) {
  if (!dataStr) return null;

  // Remover caracteres não numéricos
  const numeros = dataStr.replace(/\D/g, '');

  if (numeros.length === 8) {
    // Tentar DDMMYYYY ou MMDDYYYY
    const dia = numeros.slice(0, 2);
    const mes = numeros.slice(2, 4);
    const ano = numeros.slice(4, 8);

    if (parseInt(dia) <= 31 && parseInt(mes) <= 12) {
      return `${ano}-${mes}-${dia}`;
    }
  }

  // Se Excel date (número), converter
  if (/^\d+$/.test(dataStr.trim())) {
    const excelDate = parseInt(dataStr);
    // Excel date base: 30/12/1899
    const data = new Date((excelDate - 25569) * 86400 * 1000);
    return data.toISOString().split('T')[0];
  }

  return null;
}

module.exports = {
  extrairOrcamento,
};
