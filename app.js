/* ============================================================
   Sistema de Controle de Colheita e Vendas de Hortaliças (PWA)
   Armazenamento: IndexedDB (100% local, funciona offline)
   ============================================================ */

const DB_NAME = "colheitaDB";
const DB_VERSION = 1;
let db;

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

/* ---------------------------------------------------------
   IndexedDB — camada genérica
--------------------------------------------------------- */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const _db = e.target.result;
      if (!_db.objectStoreNames.contains("patroes")) {
        _db.createObjectStore("patroes", { keyPath: "id", autoIncrement: true });
      }
      if (!_db.objectStoreNames.contains("verduras")) {
        const s = _db.createObjectStore("verduras", { keyPath: "id", autoIncrement: true });
        s.createIndex("patraoId", "patraoId", { unique: false });
      }
      if (!_db.objectStoreNames.contains("compradores")) {
        _db.createObjectStore("compradores", { keyPath: "id", autoIncrement: true });
      }
      if (!_db.objectStoreNames.contains("lancamentos")) {
        _db.createObjectStore("lancamentos", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(storeName, mode = "readonly") {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function dbAdd(storeName, obj) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, "readwrite").add(obj);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function dbDelete(storeName, id) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, "readwrite").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

function dbClear(storeName) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, "readwrite").clear();
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

/* ---------------------------------------------------------
   Utilitários
--------------------------------------------------------- */
function fmtBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtNum(v) {
  return (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
function fmtDataBR(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add("hidden"), 2200);
}
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/* ---------------------------------------------------------
   Estado em memória (cache simples para não reconsultar sempre)
--------------------------------------------------------- */
let CACHE = { patroes: [], verduras: [], compradores: [], lancamentos: [] };

async function refreshCache() {
  CACHE.patroes = await dbGetAll("patroes");
  CACHE.verduras = await dbGetAll("verduras");
  CACHE.compradores = await dbGetAll("compradores");
  CACHE.lancamentos = await dbGetAll("lancamentos");
}

function nomePatrao(id) {
  const p = CACHE.patroes.find((x) => x.id === id);
  return p ? p.nome : "—";
}
function nomeComprador(id) {
  const c = CACHE.compradores.find((x) => x.id === id);
  return c ? c.nome : "—";
}
function verdurasDoPatrao(patraoId) {
  return CACHE.verduras.filter((v) => v.patraoId === patraoId);
}

/* ============================================================
   NAVEGAÇÃO
============================================================ */
function goToView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById(`view-${name}`).classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  if (name === "inicio") renderInicio();
  if (name === "cadastros") renderCadastros();
  if (name === "lancar") { populateSelectsLancamento(); renderLancamentosDoDia(); }
  if (name === "lista") { populateFiltrosLista(); renderListaGeral(); }
  if (name === "relatorios") { populateSelectsRelatorios(); }
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => goToView(btn.dataset.view));
});

document.querySelectorAll(".subtab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const parent = btn.closest(".view");
    parent.querySelectorAll(".subtab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    parent.querySelectorAll(".subtab-content").forEach((c) => c.classList.add("hidden"));
    document.getElementById(`subtab-${btn.dataset.subtab}`).classList.remove("hidden");
  });
});

/* ============================================================
   INÍCIO
============================================================ */
async function renderInicio() {
  await refreshCache();
  document.getElementById("statPatroes").textContent = CACHE.patroes.length;
  document.getElementById("statCompradores").textContent = CACHE.compradores.length;
  document.getElementById("statLancamentos").textContent = CACHE.lancamentos.length;

  document.getElementById("dicaInicio").style.display = CACHE.lancamentos.length === 0 ? "block" : "none";

  const ultimos = [...CACHE.lancamentos].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 6);
  const cont = document.getElementById("ultimosLancamentos");
  cont.innerHTML = "";
  if (ultimos.length === 0) {
    cont.innerHTML = `<div class="empty-state">Nenhum lançamento registrado ainda.</div>`;
  }
  ultimos.forEach((l) => cont.appendChild(lancItemEl(l, false)));
}

function lancItemEl(l, permitirExcluir = true) {
  const div = document.createElement("div");
  div.className = "lanc-item";
  div.innerHTML = `
    <div class="lanc-info">
      <b>${fmtDataBR(l.data)}</b> — ${nomePatrao(l.patraoId)} · ${l.verdura}<br>
      ${nomeComprador(l.compradorId)} · ${fmtNum(l.quantidade)} ${l.unidade}(s) × ${fmtBRL(l.vUnit)}
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <div class="lanc-valor">${fmtBRL(l.vTotal)}</div>
      ${permitirExcluir ? `<button class="lanc-del" data-id="${l.id}" title="Excluir">🗑️</button>` : ""}
    </div>
  `;
  if (permitirExcluir) {
    div.querySelector(".lanc-del").addEventListener("click", async () => {
      if (confirm("Excluir este lançamento?")) {
        await dbDelete("lancamentos", l.id);
        showToast("Lançamento excluído.");
        await refreshCache();
        renderLancamentosDoDia();
        renderListaGeral();
      }
    });
  }
  return div;
}

document.getElementById("btnCarregarExemplo").addEventListener("click", carregarDadosExemplo);

async function carregarDadosExemplo() {
  await refreshCache();
  if (CACHE.patroes.some((p) => p.nome === "Patrick")) {
    showToast("Dados de exemplo já carregados.");
    return;
  }
  const patrickId = await dbAdd("patroes", { nome: "Patrick" });
  await dbAdd("patroes", { nome: "Marcos" });
  for (const v of ["Agrião", "Alface", "Couve"]) {
    await dbAdd("verduras", { patraoId: patrickId, nome: v });
  }
  const agroId = await dbAdd("compradores", { nome: "Agro Pinheiro" });
  const roniId = await dbAdd("compradores", { nome: "Roni" });
  const jfcId = await dbAdd("compradores", { nome: "JFC" });

  const hoje = new Date();
  const dia1 = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

  const registros = [
    [agroId, 300, 0.65],
    [roniId, 380, 0.60],
    [jfcId, 120, 0.65],
  ];
  for (const [compradorId, quantidade, vUnit] of registros) {
    await dbAdd("lancamentos", {
      data: dia1, patraoId: patrickId, verdura: "Agrião", compradorId,
      unidade: "Mói", quantidade, vUnit, vTotal: Math.round(quantidade * vUnit * 100) / 100,
    });
  }
  await refreshCache();
  showToast("Dados de exemplo carregados!");
  renderInicio();
}

/* ============================================================
   CADASTROS — PATRÕES
============================================================ */
document.getElementById("formPatrao").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("inputNomePatrao");
  const nome = input.value.trim();
  if (!nome) return;
  await refreshCache();
  if (CACHE.patroes.some((p) => p.nome.toLowerCase() === nome.toLowerCase())) {
    showToast("Já existe um patrão com esse nome.");
    return;
  }
  await dbAdd("patroes", { nome });
  input.value = "";
  showToast("Patrão cadastrado.");
  await refreshCache();
  renderCadastros();
});

async function renderCadastros() {
  await refreshCache();
  const cont = document.getElementById("listaPatroes");
  cont.innerHTML = "";
  if (CACHE.patroes.length === 0) {
    cont.innerHTML = `<div class="empty-state">Nenhum patrão cadastrado.</div>`;
  }
  CACHE.patroes.forEach((p) => {
    const verduras = verdurasDoPatrao(p.id);
    const card = document.createElement("div");
    card.className = "reg-card";
    card.innerHTML = `
      <div class="reg-card-head">
        <span>👤 ${p.nome}</span>
        <div class="actions">
          <button class="btn btn-small btn-danger" data-del-patrao="${p.id}">Excluir</button>
        </div>
      </div>
      <div class="chips" id="chips-patrao-${p.id}">
        ${verduras.map((v) => `<span class="chip">🌱 ${v.nome}<span class="x" data-del-verdura="${v.id}">×</span></span>`).join("") || `<span style="font-size:12px;color:#9ca3af;">Nenhum cultivo cadastrado</span>`}
      </div>
      <div class="mini-add">
        <input type="text" placeholder="Novo cultivo (ex: Agrião)" id="novaVerdura-${p.id}">
        <button class="btn btn-small btn-primary" data-add-verdura="${p.id}">+</button>
      </div>
    `;
    cont.appendChild(card);
  });

  cont.querySelectorAll("[data-del-patrao]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm("Excluir este patrão e seus cultivos? Os lançamentos já feitos serão mantidos.")) {
        const id = Number(btn.dataset.delPatrao);
        const verds = verdurasDoPatrao(id);
        for (const v of verds) await dbDelete("verduras", v.id);
        await dbDelete("patroes", id);
        showToast("Patrão excluído.");
        await refreshCache();
        renderCadastros();
      }
    });
  });

  cont.querySelectorAll("[data-del-verdura]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await dbDelete("verduras", Number(btn.dataset.delVerdura));
      await refreshCache();
      renderCadastros();
    });
  });

  cont.querySelectorAll("[data-add-verdura]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const patraoId = Number(btn.dataset.addVerdura);
      const input = document.getElementById(`novaVerdura-${patraoId}`);
      const nome = input.value.trim();
      if (!nome) return;
      const jaExiste = verdurasDoPatrao(patraoId).some((v) => v.nome.toLowerCase() === nome.toLowerCase());
      if (jaExiste) {
        showToast("Esse cultivo já está cadastrado para este patrão.");
        return;
      }
      await dbAdd("verduras", { patraoId, nome });
      await refreshCache();
      renderCadastros();
    });
  });

  renderCompradoresList();
}

/* ---------------- COMPRADORES ---------------- */
document.getElementById("formComprador").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("inputNomeComprador");
  const nome = input.value.trim();
  if (!nome) return;
  await refreshCache();
  if (CACHE.compradores.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) {
    showToast("Já existe um comprador com esse nome.");
    return;
  }
  await dbAdd("compradores", { nome });
  input.value = "";
  showToast("Comprador cadastrado.");
  await refreshCache();
  renderCompradoresList();
});

function renderCompradoresList() {
  const cont = document.getElementById("listaCompradores");
  cont.innerHTML = "";
  if (CACHE.compradores.length === 0) {
    cont.innerHTML = `<div class="empty-state">Nenhum comprador cadastrado.</div>`;
  }
  CACHE.compradores.forEach((c) => {
    const card = document.createElement("div");
    card.className = "reg-card";
    card.innerHTML = `
      <div class="reg-card-head">
        <span>🏪 ${c.nome}</span>
        <button class="btn btn-small btn-danger" data-del-comprador="${c.id}">Excluir</button>
      </div>`;
    cont.appendChild(card);
  });
  cont.querySelectorAll("[data-del-comprador]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm("Excluir este comprador? Os lançamentos já feitos serão mantidos.")) {
        await dbDelete("compradores", Number(btn.dataset.delComprador));
        showToast("Comprador excluído.");
        await refreshCache();
        renderCompradoresList();
      }
    });
  });
}

/* ============================================================
   LANÇAMENTO DIÁRIO
============================================================ */
const inputData = document.getElementById("inputData");
inputData.value = todayISO();
inputData.addEventListener("change", renderLancamentosDoDia);

async function populateSelectsLancamento() {
  await refreshCache();
  const selPatrao = document.getElementById("selectPatrao");
  selPatrao.innerHTML = CACHE.patroes.map((p) => `<option value="${p.id}">${p.nome}</option>`).join("") || `<option value="">— cadastre um patrão —</option>`;

  const selComprador = document.getElementById("selectComprador");
  selComprador.innerHTML = CACHE.compradores.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("") || `<option value="">— cadastre um comprador —</option>`;

  atualizarVerdurasSelect();
  selPatrao.onchange = atualizarVerdurasSelect;
  atualizarPreviewTotal();
}

function atualizarVerdurasSelect() {
  const selPatrao = document.getElementById("selectPatrao");
  const patraoId = Number(selPatrao.value);
  const verds = verdurasDoPatrao(patraoId);
  const selVerdura = document.getElementById("selectVerdura");
  selVerdura.innerHTML = verds.length
    ? verds.map((v) => `<option value="${v.nome}">${v.nome}</option>`).join("")
    : `<option value="">— cadastre um cultivo para este patrão —</option>`;
}

function atualizarPreviewTotal() {
  const q = parseFloat(document.getElementById("inputQuantidade").value) || 0;
  const vu = parseFloat(document.getElementById("inputVUnit").value) || 0;
  document.getElementById("previewTotal").textContent = fmtBRL(q * vu);
}
document.getElementById("inputQuantidade").addEventListener("input", atualizarPreviewTotal);
document.getElementById("inputVUnit").addEventListener("input", atualizarPreviewTotal);

document.getElementById("formLancamento").addEventListener("submit", async (e) => {
  e.preventDefault();
  const patraoId = Number(document.getElementById("selectPatrao").value);
  const verdura = document.getElementById("selectVerdura").value;
  const compradorId = Number(document.getElementById("selectComprador").value);
  const unidade = document.getElementById("selectUnidade").value;
  const quantidade = parseFloat(document.getElementById("inputQuantidade").value);
  const vUnit = parseFloat(document.getElementById("inputVUnit").value);

  if (!patraoId || !compradorId || !verdura) {
    showToast("Preencha patrão, verdura e comprador.");
    return;
  }
  if (!quantidade || quantidade <= 0) {
    showToast("Informe uma quantidade válida.");
    return;
  }
  if (isNaN(vUnit) || vUnit < 0) {
    showToast("Informe um valor unitário válido.");
    return;
  }

  const vTotal = Math.round(quantidade * vUnit * 100) / 100;
  await dbAdd("lancamentos", { data: inputData.value, patraoId, verdura, compradorId, unidade, quantidade, vUnit, vTotal });
  showToast(`Lançamento registrado: ${fmtBRL(vTotal)}`);

  document.getElementById("inputQuantidade").value = "";
  document.getElementById("inputVUnit").value = "";
  atualizarPreviewTotal();

  await refreshCache();
  renderLancamentosDoDia();
});

async function renderLancamentosDoDia() {
  await refreshCache();
  const data = inputData.value;
  document.getElementById("labelDataSelecionada").textContent = fmtDataBR(data);
  const doDia = CACHE.lancamentos.filter((l) => l.data === data);
  const cont = document.getElementById("lancamentosDoDia");
  cont.innerHTML = "";
  if (doDia.length === 0) {
    cont.innerHTML = `<div class="empty-state">Nenhum lançamento nesta data.</div>`;
  }
  doDia.forEach((l) => cont.appendChild(lancItemEl(l)));
  const total = doDia.reduce((s, l) => s + l.vTotal, 0);
  document.getElementById("totalDia").textContent = doDia.length ? `Total do dia: ${fmtBRL(total)}` : "";
}

/* ============================================================
   LISTA GERAL DE LANÇAMENTOS
============================================================ */
function populateFiltrosLista() {
  const fp = document.getElementById("filtroPatrao");
  const fc = document.getElementById("filtroComprador");
  fp.innerHTML = `<option value="">Todos os Patrões</option>` + CACHE.patroes.map((p) => `<option value="${p.id}">${p.nome}</option>`).join("");
  fc.innerHTML = `<option value="">Todos os Compradores</option>` + CACHE.compradores.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");
  fp.onchange = renderListaGeral;
  fc.onchange = renderListaGeral;
}

async function renderListaGeral() {
  await refreshCache();
  const fp = document.getElementById("filtroPatrao").value;
  const fc = document.getElementById("filtroComprador").value;
  let lista = [...CACHE.lancamentos];
  if (fp) lista = lista.filter((l) => l.patraoId === Number(fp));
  if (fc) lista = lista.filter((l) => l.compradorId === Number(fc));
  lista.sort((a, b) => (a.data < b.data ? 1 : -1));

  const cont = document.getElementById("listaGeralLancamentos");
  cont.innerHTML = "";
  if (lista.length === 0) {
    cont.innerHTML = `<div class="empty-state">Nenhum lançamento encontrado.</div>`;
  }
  lista.forEach((l) => cont.appendChild(lancItemEl(l)));
}

/* ============================================================
   RELATÓRIOS
============================================================ */
function populateMesAnoSelects() {
  const hoje = new Date();
  ["relPatraoMes", "relCompMes"].forEach((id) => {
    const sel = document.getElementById(id);
    sel.innerHTML = MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
    sel.value = hoje.getMonth() + 1;
  });
  document.getElementById("relPatraoAno").value = hoje.getFullYear();
  document.getElementById("relCompAno").value = hoje.getFullYear();
}

async function populateSelectsRelatorios() {
  await refreshCache();
  if (!document.getElementById("relPatraoMes").value) populateMesAnoSelects();

  const relPatraoSelect = document.getElementById("relPatraoSelect");
  relPatraoSelect.innerHTML = CACHE.patroes.map((p) => `<option value="${p.id}">${p.nome}</option>`).join("") || `<option value="">— sem patrões —</option>`;

  const verdurasUnicas = [...new Set(CACHE.lancamentos.map((l) => l.verdura))].sort();
  const relCompVerdura = document.getElementById("relCompVerdura");
  relCompVerdura.innerHTML = `<option value="">Todas as verduras</option>` + verdurasUnicas.map((v) => `<option value="${v}">${v}</option>`).join("");

  const relCompSelect = document.getElementById("relCompSelect");
  relCompSelect.innerHTML = `<option value="">Todos os compradores</option>` + CACHE.compradores.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");

  ["relPatraoMes", "relPatraoAno", "relPatraoSelect"].forEach((id) => document.getElementById(id).onchange = renderRelatorioPatrao);
  ["relCompMes", "relCompAno", "relCompVerdura", "relCompSelect"].forEach((id) => document.getElementById(id).onchange = renderRelatorioComprador);

  renderRelatorioPatrao();
  renderRelatorioComprador();
}

/* ---------------- Relatório Mensal por Patrão ---------------- */
async function renderRelatorioPatrao() {
  const mes = Number(document.getElementById("relPatraoMes").value);
  const ano = Number(document.getElementById("relPatraoAno").value);
  const patraoId = Number(document.getElementById("relPatraoSelect").value);
  const cont = document.getElementById("relPatraoResultado");
  cont.innerHTML = "";
  if (!patraoId || !ano) return;

  const filtrados = CACHE.lancamentos.filter((l) => {
    const [y, m] = l.data.split("-").map(Number);
    return y === ano && m === mes && l.patraoId === patraoId;
  });

  if (filtrados.length === 0) {
    cont.innerHTML = `<div class="empty-state">Nenhum lançamento para ${nomePatrao(patraoId)} em ${MESES[mes - 1]}/${ano}.</div>`;
    return;
  }

  // agrupar por verdura -> comprador
  const porVerdura = {};
  filtrados.forEach((l) => {
    porVerdura[l.verdura] = porVerdura[l.verdura] || {};
    porVerdura[l.verdura][l.compradorId] = porVerdura[l.verdura][l.compradorId] || { qtd: 0, total: 0 };
    porVerdura[l.verdura][l.compradorId].qtd += l.quantidade;
    porVerdura[l.verdura][l.compradorId].total += l.vTotal;
  });

  let totalGeralQtd = 0;
  let totalGeralValor = 0;
  const block = document.createElement("div");
  block.className = "report-block";
  block.innerHTML = `<h3>${nomePatrao(patraoId)} — ${MESES[mes - 1]}/${ano}</h3>`;

  Object.keys(porVerdura).sort().forEach((verdura) => {
    const compradoresObj = porVerdura[verdura];
    let subQtd = 0, subValor = 0;
    let linhas = "";
    Object.keys(compradoresObj).forEach((cid) => {
      const { qtd, total } = compradoresObj[cid];
      subQtd += qtd; subValor += total;
      linhas += `<tr><td>${nomeComprador(Number(cid))}</td><td class="num">${fmtNum(qtd)}</td><td class="num">${fmtBRL(total)}</td></tr>`;
    });
    totalGeralQtd += subQtd; totalGeralValor += subValor;
    block.innerHTML += `
      <h4>🌱 ${verdura}</h4>
      <table class="rep-table">
        <thead><tr><th>Comprador</th><th class="num">Qtd</th><th class="num">Valor</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <div class="subtotal-line"><span>Subtotal ${verdura}</span><span>${fmtNum(subQtd)} · ${fmtBRL(subValor)}</span></div>
    `;
  });

  block.innerHTML += `
    <div class="grand-total-box">
      TOTAL GERAL DO PATRÃO NO MÊS
      <span class="valor">${fmtBRL(totalGeralValor)}</span>
      <div style="font-size:12px;opacity:.85;margin-top:4px;">${fmtNum(totalGeralQtd)} unidades no total</div>
    </div>
  `;
  cont.appendChild(block);
}

/* ---------------- Relatório por Comprador ---------------- */
async function renderRelatorioComprador() {
  const mes = Number(document.getElementById("relCompMes").value);
  const ano = Number(document.getElementById("relCompAno").value);
  const verduraFiltro = document.getElementById("relCompVerdura").value;
  const compradorFiltro = document.getElementById("relCompSelect").value;
  const cont = document.getElementById("relCompResultado");
  cont.innerHTML = "";
  if (!ano) return;

  let doMes = CACHE.lancamentos.filter((l) => {
    const [y, m] = l.data.split("-").map(Number);
    return y === ano && m === mes;
  });
  if (verduraFiltro) doMes = doMes.filter((l) => l.verdura === verduraFiltro);

  if (doMes.length === 0) {
    cont.innerHTML = `<div class="empty-state">Nenhum lançamento em ${MESES[mes - 1]}/${ano}.</div>`;
    return;
  }

  let compradorIds = compradorFiltro
    ? [Number(compradorFiltro)]
    : [...new Set(doMes.map((l) => l.compradorId))];

  const nDias = daysInMonth(ano, mes);
  const resumoFechamento = [];

  compradorIds.forEach((cid) => {
    const doComprador = doMes.filter((l) => l.compradorId === cid);
    if (doComprador.length === 0) return;

    let linhas = "";
    let tItem = 0, totalRs = 0;
    for (let dia = 1; dia <= nDias; dia++) {
      const diaISO = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const doDia = doComprador.filter((l) => l.data === diaISO);
      if (doDia.length === 0) continue;
      const qtd = doDia.reduce((s, l) => s + l.quantidade, 0);
      const vTotalDia = doDia.reduce((s, l) => s + l.vTotal, 0);
      const vUnMedio = qtd ? vTotalDia / qtd : 0;
      tItem += qtd; totalRs += vTotalDia;
      linhas += `<tr><td>${dia}</td><td class="num">${fmtNum(qtd)}</td><td class="num">${fmtBRL(vUnMedio)}</td><td class="num">${fmtBRL(vTotalDia)}</td></tr>`;
    }

    resumoFechamento.push({ nome: nomeComprador(cid), tItem, totalRs });

    const block = document.createElement("div");
    block.className = "report-block";
    block.innerHTML = `
      <h3>🏪 ${nomeComprador(cid)}</h3>
      <table class="rep-table">
        <thead><tr><th>Dia</th><th class="num">CX</th><th class="num">V.UN</th><th class="num">V.TOTAL</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <div class="fechamento-grid">
        <div class="fitem"><span class="lbl">T. Item</span><span class="val">${fmtNum(tItem)}</span></div>
        <div class="fitem"><span class="lbl">Total (R$)</span><span class="val">${fmtBRL(totalRs)}</span></div>
      </div>
    `;
    cont.appendChild(block);
  });

  if (resumoFechamento.length === 0) {
    cont.innerHTML += `<div class="empty-state">Nenhum comprador com movimentação neste filtro.</div>`;
    return;
  }

  const totalGeralRs = resumoFechamento.reduce((s, r) => s + r.totalRs, 0);
  const totalMenos30 = totalGeralRs * 0.7;
  const resEmpateP2 = totalMenos30 / 2;
  const qtdTotalVerdura = doMes.reduce((s, l) => s + l.quantidade, 0);
  const labelQtd = verduraFiltro ? `Total ${verduraFiltro} (móis)` : "Total geral (móis/caixas)";

  const resumo = document.createElement("div");
  resumo.className = "report-block resumo-final";
  resumo.innerHTML = `
    <h3>🧾 Resumo Consolidado Geral do Mês</h3>
    <div class="fechamento-grid">
      <div class="fitem"><span class="lbl">Total Geral (R$)</span><span class="val">${fmtBRL(totalGeralRs)}</span></div>
      <div class="fitem"><span class="lbl">Total − 30% (R$)</span><span class="val">${fmtBRL(totalMenos30)}</span></div>
      <div class="fitem"><span class="lbl">Res. Empate P/2 (R$)</span><span class="val">${fmtBRL(resEmpateP2)}</span></div>
      <div class="fitem"><span class="lbl">${labelQtd}</span><span class="val">${fmtNum(qtdTotalVerdura)}</span></div>
    </div>
  `;
  cont.appendChild(resumo);
}

/* ============================================================
   BACKUP / RESTAURAR
============================================================ */
const modalBackup = document.getElementById("modalBackup");
document.getElementById("btnBackup").addEventListener("click", () => modalBackup.classList.remove("hidden"));
document.getElementById("btnFecharModal").addEventListener("click", () => modalBackup.classList.add("hidden"));

document.getElementById("btnExportar").addEventListener("click", async () => {
  await refreshCache();
  const dump = { versao: 1, exportadoEm: new Date().toISOString(), ...CACHE };
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-colheita-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup exportado.");
});

document.getElementById("inputImportar").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const dump = JSON.parse(text);
    if (!dump.patroes || !dump.compradores || !dump.lancamentos) {
      throw new Error("Arquivo inválido.");
    }
    if (!confirm("Isso vai SUBSTITUIR todos os dados atuais deste aparelho pelos dados do backup. Deseja continuar?")) {
      e.target.value = "";
      return;
    }
    await dbClear("patroes");
    await dbClear("verduras");
    await dbClear("compradores");
    await dbClear("lancamentos");
    for (const p of dump.patroes) await dbAdd("patroes", { nome: p.nome });
    // remapear ids de patrão para verduras/lançamentos
    const novosPatroes = await dbGetAll("patroes");
    const mapaPatrao = {};
    dump.patroes.forEach((p, i) => (mapaPatrao[p.id] = novosPatroes[i].id));

    for (const v of dump.verduras || []) {
      await dbAdd("verduras", { patraoId: mapaPatrao[v.patraoId], nome: v.nome });
    }
    for (const c of dump.compradores) await dbAdd("compradores", { nome: c.nome });
    const novosCompradores = await dbGetAll("compradores");
    const mapaComprador = {};
    dump.compradores.forEach((c, i) => (mapaComprador[c.id] = novosCompradores[i].id));

    for (const l of dump.lancamentos) {
      await dbAdd("lancamentos", {
        data: l.data, patraoId: mapaPatrao[l.patraoId], verdura: l.verdura,
        compradorId: mapaComprador[l.compradorId], unidade: l.unidade,
        quantidade: l.quantidade, vUnit: l.vUnit, vTotal: l.vTotal,
      });
    }
    showToast("Backup importado com sucesso!");
    modalBackup.classList.add("hidden");
    await refreshCache();
    renderInicio();
  } catch (err) {
    console.error(err);
    alert("Não foi possível importar este arquivo. Verifique se é um backup válido.");
  }
  e.target.value = "";
});

/* ============================================================
   INICIALIZAÇÃO
============================================================ */
async function init() {
  db = await openDB();
  await refreshCache();
  populateMesAnoSelects();
  renderInicio();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(console.error);
  }
}
init();
