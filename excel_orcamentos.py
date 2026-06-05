#!/usr/bin/env python3
"""
Gera um .xlsx DINÂMICO e VINCULADO do comparativo de orçamentos:
- Uma aba por fornecedor com seus itens (Qtd, Valor Unit., Total=Qtd*Unit).
- Aba "Resumo" cujos totais são FÓRMULAS apontando para as abas de fornecedor.
- Aba "Por Categoria" com SUMIF por categoria referenciando cada fornecedor.
- Gráficos nativos que recalculam quando o usuário edita/adiciona itens.

Lê JSON do stdin e escreve o arquivo em argv[1]. JSON:
{
  "fornecedores": [
    { "nome": "...", "prazoDias": 30,
      "itens": [["1.1","Descrição","Categoria", qtd, unit, total], ...] }
  ]
}
"""
import sys
import json
import re
import xlsxwriter

LIM = 100000  # limite de linhas para as fórmulas (permite adicionar itens)


def nome_aba(base, usados):
    s = re.sub(r"[\[\]:*?/\\]", " ", str(base)).strip()[:31] or "Aba"
    nome = s
    i = 2
    while nome.lower() in usados:
        suf = f" ({i})"
        nome = s[:31 - len(suf)] + suf
        i += 1
    usados.add(nome.lower())
    return nome


def main():
    destino = sys.argv[1]
    dados = json.load(sys.stdin)
    fornecedores = dados.get("fornecedores", [])

    wb = xlsxwriter.Workbook(destino, {"nan_inf_to_errors": True})
    moeda = wb.add_format({"num_format": "R$ #,##0.00"})
    cab = wb.add_format({"bold": True, "bg_color": "#1E3A5F", "font_color": "white", "border": 1})
    bold = wb.add_format({"bold": True})
    boldm = wb.add_format({"bold": True, "num_format": "R$ #,##0.00"})

    usados = set()
    # Reserva nomes "Resumo" e "Por Categoria"
    usados.update({"resumo", "por categoria"})

    # ── Uma aba por fornecedor ──
    abas = []  # (nome_aba, dados_fornecedor)
    todas_categorias = []
    for i, f in enumerate(fornecedores):
        nome = f.get("nome") or f"Fornecedor {i+1}"
        aba = nome_aba(f"{i+1}-{nome}", usados)
        ws = wb.add_worksheet(aba)
        ws.set_column(0, 0, 10)
        ws.set_column(1, 1, 46)
        ws.set_column(2, 2, 22)
        ws.set_column(3, 5, 14)
        ws.set_column(7, 8, 16)
        ws.write_row(0, 0, ["Item", "Descrição", "Categoria", "Qtd", "Valor Unit.", "Total"], cab)

        itens = f.get("itens", [])
        r = 1
        for it in itens:
            item = it[0] if len(it) > 0 else ""
            desc = it[1] if len(it) > 1 else ""
            cat = it[2] if len(it) > 2 else ""
            q = float(it[3] or 0) if len(it) > 3 else 0.0
            u = float(it[4] or 0) if len(it) > 4 else 0.0
            t = float(it[5] or 0) if len(it) > 5 else 0.0
            # Garante Qtd*Unit == Total para o vínculo funcionar ao editar
            if abs(q * u - t) > 0.01:
                if q and not u:
                    u = t / q
                elif u and not q:
                    q = t / u
                else:
                    q = q or 1
                    u = t / q if q else 0
            if cat:
                todas_categorias.append(cat)
            ws.write(r, 0, item)
            ws.write(r, 1, desc)
            ws.write(r, 2, cat)
            ws.write_number(r, 3, q)
            ws.write_number(r, 4, u, moeda)
            ws.write_formula(r, 5, f"=D{r+1}*E{r+1}", moeda, q * u)
            r += 1

        # Total do fornecedor (fora da coluna F p/ não se auto-referenciar)
        total_calc = sum(
            (float(it[3] or 0) * float(it[4] or 0)) if len(it) > 4 and abs((float(it[3] or 0)) * (float(it[4] or 0)) - (float(it[5] or 0) if len(it) > 5 else 0)) <= 0.01
            else (float(it[5] or 0) if len(it) > 5 else 0)
            for it in itens
        )
        ws.write(0, 7, "TOTAL", bold)
        ws.write_formula(0, 8, f"=SUM(F2:F{LIM})", boldm, total_calc)
        abas.append((aba, f, total_calc))

    # ── Aba Resumo (totais vinculados às abas) ──
    wr = wb.add_worksheet("Resumo")
    wr.set_column(0, 0, 34)
    wr.set_column(1, 2, 18)
    wr.write_row(0, 0, ["Fornecedor", "Valor Total", "Prazo (dias)"], cab)
    for idx, (aba, f, total_calc) in enumerate(abas):
        wr.write(idx + 1, 0, f.get("nome") or aba)
        wr.write_formula(idx + 1, 1, f"='{aba}'!$I$1", moeda, total_calc)
        wr.write(idx + 1, 2, f.get("prazoDias") or "")
    n = len(abas)
    if n:
        ch = wb.add_chart({"type": "column"})
        ch.add_series({
            "name": "Valor Total",
            "categories": ["Resumo", 1, 0, n, 0],
            "values": ["Resumo", 1, 1, n, 1],
            "data_labels": {"value": True, "num_format": "R$ #,##0"},
            "fill": {"color": "#2563EB"},
        })
        ch.set_title({"name": "Valor Total por Fornecedor"})
        ch.set_legend({"none": True})
        ch.set_size({"width": 760, "height": 400})
        wr.insert_chart(1, 4, ch)

    # ── Aba Por Categoria (SUMIF vinculado) ──
    cats = sorted(set(todas_categorias))
    wc = wb.add_worksheet("Por Categoria")
    wc.set_column(0, 0, 26)
    wc.set_column(1, max(1, n), 16)
    wc.write_row(0, 0, ["Categoria"] + [f.get("nome") or aba for aba, f, _ in abas], cab)
    for r, cat in enumerate(cats):
        wc.write(r + 1, 0, cat)
        for c, (aba, _f, _t) in enumerate(abas):
            formula = f"=SUMIF('{aba}'!$C$2:$C${LIM},$A{r+2},'{aba}'!$F$2:$F${LIM})"
            wc.write_formula(r + 1, c + 1, formula, moeda, 0)
    if cats and n:
        ch2 = wb.add_chart({"type": "column"})
        nc = len(cats)
        for c in range(n):
            ch2.add_series({
                "name": ["Por Categoria", 0, c + 1],
                "categories": ["Por Categoria", 1, 0, nc, 0],
                "values": ["Por Categoria", 1, c + 1, nc, c + 1],
            })
        ch2.set_title({"name": "Comparativo por Categoria"})
        ch2.set_size({"width": 920, "height": 470})
        wc.insert_chart(1, n + 2, ch2)

    # Aba oculta com metadados para reimportação (id de cada orçamento)
    meta = wb.add_worksheet("_meta")
    meta.write_row(0, 0, ["aba", "orcamentoId", "obraId", "nome"])
    for i, (aba, f, _t) in enumerate(abas):
        meta.write(i + 1, 0, aba)
        meta.write(i + 1, 1, str(f.get("id") or ""))
        meta.write(i + 1, 2, str(f.get("obraId") or ""))
        meta.write(i + 1, 3, f.get("nome") or "")
    meta.hide()

    # Coloca Resumo como primeira aba ativa
    wr.activate()
    wb.worksheets_objs.sort(key=lambda w: 0 if w.name == "Resumo" else (1 if w.name == "Por Categoria" else 2))

    wb.close()


if __name__ == "__main__":
    main()
