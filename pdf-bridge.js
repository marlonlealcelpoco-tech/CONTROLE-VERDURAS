/* ============================================================
   Ponte de impressão PDF para o app Android (Capacitor)
   O app web continua usando window.print(); no APK, usamos o
   PrintManager nativo através do @capgo/capacitor-printer.
============================================================ */
(function () {
  const originalPrint = window.print.bind(window);

  function isNativeCapacitor() {
    try {
      return !!window.Capacitor && typeof window.Capacitor.isNativePlatform === "function"
        && window.Capacitor.isNativePlatform();
    } catch (_) {
      return false;
    }
  }

  async function nativePrint() {
    const printArea = document.getElementById("printArea");
    if (!printArea || !printArea.innerHTML.trim()) {
      originalPrint();
      return;
    }

    const title = document.querySelector(".print-header h2")?.textContent?.trim() || "Relatório";
    const safeName = title.replace(/[^a-zA-Z0-9À-ÿ _-]/g, "").trim().slice(0, 60) || "Relatorio";

    let css = "";
    try {
      const response = await fetch("style.css");
      if (response.ok) css = await response.text();
    } catch (_) {
      // Se o CSS não puder ser carregado, o plugin ainda consegue imprimir o conteúdo.
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeName}</title>
<style>
${css}
html, body { background: #fff !important; color: #000 !important; margin: 0; padding: 0; }
#printArea { display: block !important; width: 100%; padding: 12px; }
.print-header h1, .print-header h2, .print-header h3, .print-header h4,
.report-block h3, .report-block h4, table.rep-table th, table.rep-table td,
.fechamento-grid .fitem .lbl, .fechamento-grid .fitem .val { color: #000 !important; }
.report-block, .resumo-final, .grand-total-box, .fechamento-grid .fitem {
  background: #fff !important; color: #000 !important; border: 1px solid #000 !important;
  box-shadow: none !important; break-inside: avoid; page-break-inside: avoid;
}
@page { size: A4 portrait; margin: 10mm; }
</style>
</head>
<body>
<div id="printArea">${printArea.innerHTML}</div>
</body>
</html>`;

    if (window.CapacitorPrinter?.Printer?.printHtml) {
      try {
        await window.CapacitorPrinter.Printer.printHtml({
          name: safeName,
          html,
        });
        return;
      } catch (err) {
        console.error("Falha no impressor nativo:", err);
        if (typeof window.showToast === "function") {
          window.showToast("Não foi possível abrir a impressão do PDF.");
        }
      }
    }

    originalPrint();
  }

  window.print = function () {
    if (isNativeCapacitor()) {
      return nativePrint();
    }
    return originalPrint();
  };
})();
