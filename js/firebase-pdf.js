// =====================================================
// Geração de relatórios em PDF (jsPDF via CDN)
// =====================================================

function loadJsPDF() {
  return new Promise(function (resolve, reject) {
    if (window.jspdf && window.jspdf.jsPDF) {
      resolve(window.jspdf.jsPDF);
      return;
    }
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = function () {
      if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error("jsPDF não carregou"));
    };
    s.onerror = function () {
      reject(new Error("Falha ao carregar jsPDF"));
    };
    document.head.appendChild(s);
  });
}

function pdfToast(msg) {
  if (typeof showAppToast === "function") showAppToast(msg);
  else if (typeof showToast === "function") showToast(msg);
  else console.log(msg);
}

async function buildPdfReport(title, lines) {
  var JsPDF = await loadJsPDF();
  var doc = new JsPDF({ unit: "pt", format: "a4" });
  var margin = 40;
  var y = margin;
  var pageHeight = doc.internal.pageSize.getHeight();
  var maxWidth = doc.internal.pageSize.getWidth() - margin * 2;

  doc.setFontSize(16);
  doc.text("Unidac Industries", margin, y);
  y += 22;
  doc.setFontSize(13);
  doc.text(title, margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Gerado em: " + new Date().toLocaleString("pt-BR"), margin, y);
  doc.setTextColor(0);
  y += 24;

  doc.setFontSize(11);
  (lines || []).forEach(function (line) {
    var rows = doc.splitTextToSize(String(line), maxWidth);
    rows.forEach(function (row) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(row, margin, y);
      y += 14;
    });
  });

  var file = title.replace(/\s+/g, "_").toLowerCase() + ".pdf";
  doc.save(file);
  pdfToast("PDF gerado: " + file);
}

async function reportStockPDF() {
  var stock = typeof getStock === "function" ? await getStock() : [];
  var lines = ["=== ESTOQUE ===", ""];
  if (!stock.length) lines.push("Nenhum item cadastrado.");
  stock.forEach(function (i, idx) {
    lines.push(
      idx + 1 + ". " + (i.name || "—") +
      " | Qtd: " + (i.quantity != null ? i.quantity : "—") +
      " | Status: " + (i.status || "—")
    );
  });
  lines.push("");
  lines.push("Total de itens: " + stock.length);
  await buildPdfReport("Relatório de Estoque", lines);
}

async function reportWastePDF() {
  var waste = typeof getWaste === "function" ? await getWaste() : await getCollection("waste");
  var lines = ["=== DESPERDÍCIO ===", ""];
  var total = 0;
  if (!waste.length) lines.push("Nenhum registro.");
  waste.forEach(function (w, idx) {
    total += Number(w.quantity) || 0;
    lines.push(
      idx + 1 + ". Data: " + (w.date || "—") +
      " | Qtd: " + (w.quantity != null ? w.quantity : "—") +
      " | Turno: " + (w.shift || "—") +
      (w.notes ? " | Obs: " + w.notes : "")
    );
  });
  lines.push("");
  lines.push("Total desperdiçado: " + total);
  lines.push("Registros: " + waste.length);
  await buildPdfReport("Relatório de Desperdício", lines);
}

async function reportFinancePDF() {
  var list = await getCollection("financial_movements");
  var purchases = typeof getPurchases === "function" ? await getPurchases() : [];
  var lines = ["=== FINANCEIRO ===", "", "-- Movimentações --"];
  var saldo = 0;
  if (!list.length) lines.push("Nenhuma movimentação.");
  list.forEach(function (m, idx) {
    var v = Number(m.amount) || 0;
    if ((m.type || "").toLowerCase().indexOf("receita") !== -1 || (m.type || "").toLowerCase() === "entrada") {
      saldo += v;
    } else {
      saldo -= v;
    }
    lines.push(
      idx + 1 + ". " + (m.date || "—") + " | " + (m.type || "—") +
      " | " + (m.description || "—") + " | R$ " + v.toLocaleString("pt-BR")
    );
  });
  lines.push("");
  lines.push("-- Compras --");
  if (!purchases.length) lines.push("Nenhuma compra.");
  purchases.forEach(function (p, idx) {
    lines.push(
      idx + 1 + ". " + (p.code || "") + " | " + (p.supplier || "—") +
      " | " + (p.date || "—") + " | R$ " + Number(p.total || 0).toLocaleString("pt-BR") +
      " | " + (p.status || "")
    );
  });
  lines.push("");
  lines.push("Saldo aproximado (movimentações): R$ " + saldo.toLocaleString("pt-BR"));
  await buildPdfReport("Relatório Financeiro", lines);
}

async function reportGenericPDF() {
  var [stock, waste, purchases, goals] = await Promise.all([
    getStock(),
    getWaste(),
    getPurchases(),
    getGoals()
  ]);
  var lines = [
    "=== RELATÓRIO GERAL ===",
    "",
    "Itens em estoque: " + stock.length,
    "Registros de desperdício: " + waste.length,
    "Pedidos de compra: " + purchases.length,
    "Metas ativas: " + goals.length,
    ""
  ];
  await buildPdfReport("Relatório Geral", lines);
}

function bindPdfButtons() {
  document.addEventListener(
    "click",
    function (e) {
      var btn = e.target.closest("button, a");
      if (!btn) return;
      var text = (btn.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      var toastData = (btn.getAttribute("data-toast") || "").toLowerCase();

      var isStock =
        text.indexOf("relatório de estoque") !== -1 ||
        toastData.indexOf("estoque") !== -1 && text.indexOf("relat") !== -1;
      var isWaste =
        text.indexOf("relatório de desperdício") !== -1 ||
        text.indexOf("relatorio de desperdicio") !== -1 ||
        toastData.indexOf("desperd") !== -1 && text.indexOf("relat") !== -1;
      var isFin =
        text.indexOf("relatório financeiro") !== -1 ||
        text.indexOf("relatorio financeiro") !== -1 ||
        toastData.indexOf("financeiro") !== -1 && text.indexOf("relat") !== -1;
      var isExport =
        text.indexOf("exportar relatório") !== -1 ||
        text.indexOf("exportar relatorio") !== -1;
      var isStockPageReport =
        (text === "relatório" || text === "📊 relatório" || text.indexOf("📊") !== -1 && text.indexOf("relat") !== -1) &&
        (location.pathname || "").indexOf("estoque") !== -1;

      if (isStock || isStockPageReport) {
        e.preventDefault();
        e.stopPropagation();
        reportStockPDF().catch(function (err) {
          pdfToast("Erro PDF: " + (err.message || err));
        });
        return;
      }
      if (isWaste) {
        e.preventDefault();
        e.stopPropagation();
        reportWastePDF().catch(function (err) {
          pdfToast("Erro PDF: " + (err.message || err));
        });
        return;
      }
      if (isFin) {
        e.preventDefault();
        e.stopPropagation();
        reportFinancePDF().catch(function (err) {
          pdfToast("Erro PDF: " + (err.message || err));
        });
        return;
      }
      if (isExport) {
        e.preventDefault();
        e.stopPropagation();
        reportGenericPDF().catch(function (err) {
          pdfToast("Erro PDF: " + (err.message || err));
        });
        return;
      }
    },
    true
  );
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(bindPdfButtons, 550);
});
