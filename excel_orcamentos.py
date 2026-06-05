#!/usr/bin/env python3
"""
Gera um .xlsx com GRÁFICOS NATIVOS do Excel a partir dos dados do comparativo
de orçamentos. Lê um JSON do stdin e escreve o arquivo no caminho de argv[1].

JSON esperado:
{
  "fornecedores": [{"nome": "...", "valorTotal": 123.0, "prazoDias": 30}],
  "categorias": [{"categoria": "Estrutura", "valores": [10, 20, null, ...]}],
  "itens": [["Fornecedor", "1.1", "Descrição", "Estrutura", 2, 100.0, 200.0], ...]
}
A ordem dos fornecedores é a mesma usada nos "valores" de cada categoria.
"""
import sys
import json
import xlsxwriter


def main():
    destino = sys.argv[1]
    dados = json.load(sys.stdin)

    fornecedores = dados.get("fornecedores", [])
    categorias = dados.get("categorias", [])
    itens = dados.get("itens", [])
    nomes = [f.get("nome") or f"Fornecedor {i+1}" for i, f in enumerate(fornecedores)]

    wb = xlsxwriter.Workbook(destino, {"nan_inf_to_errors": True})
    moeda = wb.add_format({"num_format": "R$ #,##0.00"})
    cab = wb.add_format({"bold": True, "bg_color": "#1E3A5F", "font_color": "white", "border": 1})
    bold = wb.add_format({"bold": True})

    # ── Aba Resumo + gráfico de colunas ──
    ws = wb.add_worksheet("Resumo")
    ws.set_column(0, 0, 32)
    ws.set_column(1, 3, 18)
    ws.write_row(0, 0, ["Fornecedor", "Valor Total", "Prazo (dias)"], cab)
    for i, f in enumerate(fornecedores):
        ws.write(i + 1, 0, nomes[i])
        ws.write_number(i + 1, 1, float(f.get("valorTotal") or 0), moeda)
        ws.write(i + 1, 2, f.get("prazoDias") or "")
    n = len(fornecedores)
    if n:
        chart = wb.add_chart({"type": "column"})
        chart.add_series({
            "name": "Valor Total",
            "categories": ["Resumo", 1, 0, n, 0],
            "values": ["Resumo", 1, 1, n, 1],
            "data_labels": {"value": True, "num_format": "R$ #,##0"},
            "points": [{"fill": {"color": "#2563EB"}}] * n,
        })
        chart.set_title({"name": "Valor Total por Fornecedor"})
        chart.set_legend({"none": True})
        chart.set_size({"width": 720, "height": 400})
        ws.insert_chart(1, 4, chart)

    # ── Aba Por Categoria + gráfico de colunas agrupadas ──
    wc = wb.add_worksheet("Por Categoria")
    wc.set_column(0, 0, 28)
    wc.set_column(1, max(1, len(nomes)), 16)
    wc.write_row(0, 0, ["Categoria"] + nomes, cab)
    for r, cat in enumerate(categorias):
        wc.write(r + 1, 0, cat.get("categoria") or "—")
        for c, v in enumerate(cat.get("valores", [])):
            if v is None:
                wc.write(r + 1, c + 1, "")
            else:
                wc.write_number(r + 1, c + 1, float(v), moeda)
    nc = len(categorias)
    if nc and nomes:
        chart2 = wb.add_chart({"type": "column"})
        for c in range(len(nomes)):
            chart2.add_series({
                "name": ["Por Categoria", 0, c + 1],
                "categories": ["Por Categoria", 1, 0, nc, 0],
                "values": ["Por Categoria", 1, c + 1, nc, c + 1],
            })
        chart2.set_title({"name": "Comparativo por Categoria"})
        chart2.set_x_axis({"num_font": {"rotation": -30}})
        chart2.set_size({"width": 900, "height": 460})
        wc.insert_chart(1, len(nomes) + 2, chart2)

    # ── Aba Itens ──
    wi = wb.add_worksheet("Itens")
    wi.set_column(0, 0, 28)
    wi.set_column(1, 1, 10)
    wi.set_column(2, 2, 44)
    wi.set_column(3, 3, 20)
    wi.set_column(4, 6, 14)
    wi.write_row(0, 0, ["Fornecedor", "Item", "Descrição", "Categoria", "Qtd", "Valor Unit.", "Total"], cab)
    for r, linha in enumerate(itens):
        for c, val in enumerate(linha):
            if c in (5, 6) and isinstance(val, (int, float)):
                wi.write_number(r + 1, c, float(val), moeda)
            else:
                wi.write(r + 1, c, val if val is not None else "")

    wb.close()


if __name__ == "__main__":
    main()
