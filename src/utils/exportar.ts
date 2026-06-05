// Utilidades de exportação reutilizáveis (PDF visual e Excel de dados).
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exporta um elemento da tela como PDF (captura visual — gráficos, barras, tabelas).
 * Pagina automaticamente se o conteúdo for mais alto que uma página A4.
 */
export async function exportarElementoPDF(elemento: HTMLElement, nomeArquivo: string): Promise<void> {
  const canvas = await html2canvas(elemento, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const larguraPDF = pdf.internal.pageSize.getWidth();
  const alturaPDF = pdf.internal.pageSize.getHeight();
  const margem = 8;
  const larguraImg = larguraPDF - margem * 2;
  const alturaImg = (canvas.height * larguraImg) / canvas.width;

  const img = canvas.toDataURL('image/png');
  let restante = alturaImg;
  let posY = margem;

  // Cabe em uma página
  if (alturaImg <= alturaPDF - margem * 2) {
    pdf.addImage(img, 'PNG', margem, posY, larguraImg, alturaImg);
  } else {
    // Pagina o conteúdo alto deslocando a imagem verticalmente
    let offset = 0;
    while (restante > 0) {
      pdf.addImage(img, 'PNG', margem, posY - offset, larguraImg, alturaImg);
      restante -= alturaPDF - margem * 2;
      offset += alturaPDF - margem * 2;
      if (restante > 0) { pdf.addPage(); posY = margem; }
    }
  }

  pdf.save(nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`);
}

export interface AbaExcel {
  nome: string;                 // nome da aba (máx. 31 chars)
  dados: (string | number | null)[][]; // matriz de linhas (primeira linha = cabeçalho)
}

/** Exporta uma ou mais abas de dados para um arquivo .xlsx. */
export function exportarExcel(nomeArquivo: string, abas: AbaExcel[]): void {
  const wb = XLSX.utils.book_new();
  for (const aba of abas) {
    const ws = XLSX.utils.aoa_to_sheet(aba.dados);
    XLSX.utils.book_append_sheet(wb, ws, aba.nome.slice(0, 31));
  }
  XLSX.writeFile(wb, nomeArquivo.endsWith('.xlsx') ? nomeArquivo : `${nomeArquivo}.xlsx`);
}
