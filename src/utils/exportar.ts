// Utilidades de exportação reutilizáveis (PDF visual e Excel de dados).
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const AZUL: [number, number, number] = [30, 58, 95];

function hexRgb(hex: string): [number, number, number] {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [37, 99, 235];
}
const brl = (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brlK = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `R$ ${(v / 1_000).toFixed(0)}K` : brl(v);

export interface ComparativoPDF {
  arquivo: string;
  obra: string;
  economia: string;
  fornecedores: { nome: string; valorTotal: number; prazoDias?: number | null; cor: string }[]; // melhor→pior
  categorias: { categoria: string; valores: (number | null)[] }[];
  itens: (string | number)[][]; // [fornecedor, item, desc, categoria, qtd, unit, total]
}

/** Gera um PDF de apresentação, estruturado e completo (3 seções). */
export function exportarComparativoPDF(d: ComparativoPDF): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = doc.internal.pageSize.getWidth();
  const margem = 14;
  const melhor = d.fornecedores[0]?.valorTotal || 0;
  const maior = d.fornecedores[d.fornecedores.length - 1]?.valorTotal || 0;

  // ── Cabeçalho ──
  const cabecalho = () => {
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, W, 24, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text('Comparativo de Orçamentos', margem, 11);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    doc.text(d.obra || '', margem, 18);
    const dataStr = new Date().toLocaleDateString('pt-BR');
    doc.text(`Emitido em ${dataStr}`, W - margem, 18, { align: 'right' });
  };
  cabecalho();

  // ── KPIs ──
  let y = 32;
  const kpis: [string, string, [number, number, number]][] = [
    ['Propostas', String(d.fornecedores.length), [55, 65, 81]],
    ['Melhor proposta', brl(melhor), [22, 101, 52]],
    ['Diferença (menor x maior)', brl(maior - melhor), [185, 28, 28]],
    ['Economia potencial', d.economia + '%', [22, 101, 52]],
  ];
  const kw = (W - margem * 2 - 9) / 4;
  kpis.forEach(([label, val, cor], i) => {
    const x = margem + i * (kw + 3);
    doc.setDrawColor(225); doc.setFillColor(250, 250, 251);
    doc.roundedRect(x, y, kw, 18, 2, 2, 'FD');
    doc.setTextColor(110); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text(label.toUpperCase(), x + 3, y + 6);
    doc.setTextColor(...cor); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(val, x + 3, y + 14);
  });
  y += 26;

  // ── Ranking (tabela) ──
  doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Ranking de Fornecedores', margem, y);
  y += 2;
  autoTable(doc, {
    startY: y + 2,
    head: [['#', 'Fornecedor', 'Valor Total', 'Prazo', '% vs melhor']],
    body: d.fornecedores.map((f, i) => [
      String(i + 1), f.nome, brl(f.valorTotal),
      f.prazoDias ? `${f.prazoDias} d` : '—',
      i === 0 ? 'menor' : `+${(((f.valorTotal - melhor) / melhor) * 100).toFixed(1)}%`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: AZUL, fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'center' }, 4: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 0) data.cell.styles.textColor = [22, 101, 52];
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Gráfico de barras: Valores por Fornecedor ──
  if (y > 235) { doc.addPage(); cabecalho(); y = 32; }
  doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Valores por Fornecedor', margem, y);
  y += 5;
  const labelW = 46, valW = 30;
  const barMax = W - margem * 2 - labelW - valW - 4;
  d.fornecedores.forEach((f) => {
    const larg = maior > 0 ? (f.valorTotal / maior) * barMax : 0;
    doc.setTextColor(60); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(f.nome.length > 28 ? f.nome.slice(0, 27) + '…' : f.nome, margem, y + 3.5);
    doc.setFillColor(238, 240, 244);
    doc.roundedRect(margem + labelW, y, barMax, 5, 1, 1, 'F');
    doc.setFillColor(...hexRgb(f.cor));
    doc.roundedRect(margem + labelW, y, Math.max(1, larg), 5, 1, 1, 'F');
    doc.setTextColor(30); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(brlK(f.valorTotal), W - margem, y + 3.7, { align: 'right' });
    y += 8;
  });
  y += 4;

  // ── Comparativo por Categoria ──
  doc.addPage(); cabecalho(); y = 32;
  doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Comparativo por Categoria', margem, y);
  autoTable(doc, {
    startY: y + 4,
    head: [['Categoria', ...d.fornecedores.map((f) => f.nome)]],
    body: d.categorias.map((c) => [
      c.categoria,
      ...c.valores.map((v) => (v == null ? '—' : brlK(v))),
    ]),
    theme: 'grid',
    headStyles: { fillColor: AZUL, fontSize: 6.5, halign: 'center' },
    styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28 } },
  });

  // ── Itens Detalhados ──
  doc.addPage(); cabecalho(); y = 32;
  doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Itens Detalhados', margem, y);
  autoTable(doc, {
    startY: y + 4,
    head: [['Fornecedor', 'Item', 'Descrição', 'Categoria', 'Qtd', 'Unit.', 'Total']],
    body: d.itens.map((r) => [
      r[0], r[1], r[2], r[3],
      typeof r[4] === 'number' ? r[4] : r[4],
      brl(Number(r[5]) || 0), brl(Number(r[6]) || 0),
    ]),
    theme: 'striped',
    headStyles: { fillColor: AZUL, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak' },
    columnStyles: { 2: { cellWidth: 60 }, 5: { halign: 'right' }, 6: { halign: 'right' }, 4: { halign: 'right' } },
  });

  // ── Rodapé com numeração ──
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setTextColor(150); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(`Pawliv Obras · ${d.obra}`, margem, doc.internal.pageSize.getHeight() - 6);
    doc.text(`Página ${p} de ${total}`, W - margem, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
  }

  doc.save(d.arquivo.endsWith('.pdf') ? d.arquivo : `${d.arquivo}.pdf`);
}

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
