'use client'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function ExtratoPage() {
  const ref = useRef<HTMLDivElement>(null)
  const { token, empresaAtiva } = useAuthStore()

  useEffect(() => {
    if (!ref.current) return

    const empresaId = empresaAtiva?.id || 1
    const apiUrl = window.location.origin + '/api/proxy'

    const html = `
<!DOCTYPE html>
<html>
<head>
<link rel="stylesheet" href="https://unpkg.com/@fontsource/dm-mono@4.5.14/index.css">
<link rel="stylesheet" href="https://unpkg.com/@fontsource/plus-jakarta-sans@8.0.0/index.css">
<style>
:root{--bg:#05091A;--surface:rgba(255,255,255,0.034);--border:rgba(255,255,255,0.07);--blue:#38BDF8;--green:#34D399;--red:#F87171;--amber:#FBBF24;--orange:#FB923C;--purple:#C084FC;--text:#F1F5F9;--muted:#64748B;--subtle:#0F172A;}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);font-family:'Plus Jakarta Sans',sans-serif;color:var(--text);background-image:linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px);background-size:48px 48px;}
.kpi-strip{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--border)}
.kpi{padding:14px 22px;border-right:1px solid var(--border);position:relative;overflow:hidden;cursor:default;transition:background 0.2s}
.kpi:last-child{border-right:none}
.kpi:hover{background:rgba(255,255,255,0.015)}
.kpi-glow{position:absolute;bottom:0;left:0;right:0;height:1.5px;opacity:0;transition:opacity 0.3s}
.kpi:hover .kpi-glow{opacity:1}
.kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:6px}
.kpi-num{font-family:'DM Mono',monospace;font-size:19px;font-weight:400}
.kpi-num.g{color:var(--green)}.kpi-num.r{color:var(--red)}.kpi-num.w{color:#fff}
.kpi-sub{font-size:9px;color:var(--muted);margin-top:2px}
.body{display:grid;grid-template-columns:1fr 220px;height:calc(100vh - 68px);overflow:hidden}
.main-col{display:flex;flex-direction:column;border-right:1px solid var(--border);overflow:hidden}
.filter-bar{display:flex;align-items:center;gap:8px;padding:12px 22px;border-bottom:1px solid var(--border);flex-wrap:wrap;background:rgba(5,9,26,0.4)}
.search-wrap{position:relative;flex:1;min-width:200px}
.search-wrap input{width:100%;background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:11px;padding:7px 10px 7px 10px;border-radius:8px;font-family:inherit;transition:border-color 0.2s}
.search-wrap input:focus{outline:none;border-color:rgba(56,189,248,0.4)}
.search-wrap input::placeholder{color:var(--muted)}
.fsel{background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:11px;padding:7px 10px;border-radius:8px;font-family:inherit;cursor:pointer}
.fsel option{background:#0f172a}
.filter-count{font-size:10px;color:var(--muted);font-family:'DM Mono',monospace;white-space:nowrap}
.summary-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 22px;border-bottom:1px solid var(--border)}
.sum-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px}
.sum-icon{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.sum-label{font-size:9px;text-transform:uppercase;letter-spacing:0.8px;color:var(--muted)}
.sum-val{font-family:'DM Mono',monospace;font-size:14px;margin-top:1px}
.table-wrap{flex:1;overflow-y:auto;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:11px;min-width:700px}
thead{position:sticky;top:0;z-index:5}
thead tr{background:#080d1e;border-bottom:1px solid var(--border)}
th{padding:9px 14px;text-align:left;font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;white-space:nowrap;cursor:pointer;user-select:none;font-family:'DM Mono',monospace}
th:hover{color:var(--text)}
.sort-ico{opacity:0.3;margin-left:3px;font-size:8px}
tbody tr{border-bottom:1px solid rgba(255,255,255,0.03);transition:background 0.12s;cursor:default}
tbody tr:hover{background:rgba(255,255,255,0.025)}
tbody tr.entrada-row:hover{background:rgba(52,211,153,0.04)}
tbody tr.saida-row:hover{background:rgba(248,113,113,0.04)}
td{padding:8px 14px;color:var(--text);font-size:11px;white-space:nowrap;vertical-align:middle}
td.mono{font-family:'DM Mono',monospace}
td.val-g{font-family:'DM Mono',monospace;color:var(--green);text-align:right;font-weight:500}
td.val-r{font-family:'DM Mono',monospace;color:var(--red);text-align:right;font-weight:500}
.badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:99px;font-size:9px;font-weight:600;letter-spacing:0.3px;white-space:nowrap}
.badge.concil{background:rgba(52,211,153,0.1);color:var(--green);border:1px solid rgba(52,211,153,0.15)}
.badge.pend{background:rgba(251,191,36,0.1);color:var(--amber);border:1px solid rgba(251,191,36,0.15)}
.bank-dot{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:5px;flex-shrink:0}
.right-panel{padding:16px 14px;display:flex;flex-direction:column;gap:14px;overflow-y:auto}
.panel-title{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:2px}
.bank-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
.bank-name{font-size:10px;color:var(--muted);display:flex;align-items:center;margin-bottom:6px}
.bank-saldo{font-family:'DM Mono',monospace;font-size:17px;color:#fff}
.bank-saldo.zero{color:var(--muted)}
.bank-sub{font-size:9px;color:var(--muted);margin-top:2px}
.bank-mini-bar{height:2px;background:rgba(255,255,255,0.06);border-radius:2px;margin-top:8px;overflow:hidden}
.bank-mini-fill{height:100%;border-radius:2px;transition:width 0.8s ease}
.divider{height:1px;background:var(--border)}
.stat-row{display:flex;justify-content:space-between;align-items:center;font-size:10px;padding:4px 0}
.stat-label{color:var(--muted)}
.stat-val{font-family:'DM Mono',monospace;color:var(--text)}
.table-footer{padding:10px 22px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--muted);background:rgba(5,9,26,0.6)}
.loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--muted);font-size:12px;gap:10px}
.spinner{width:16px;height:16px;border:2px solid rgba(56,189,248,0.2);border-top-color:#38BDF8;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
.kpi{animation:fadeUp 0.35s ease both}
.kpi:nth-child(1){animation-delay:.04s}.kpi:nth-child(2){animation-delay:.08s}
.kpi:nth-child(3){animation-delay:.12s}.kpi:nth-child(4){animation-delay:.16s}.kpi:nth-child(5){animation-delay:.20s}
</style>
</head>
<body>

<div class="kpi-strip">
  <div class="kpi"><div class="kpi-glow" style="background:var(--blue)"></div>
    <div class="kpi-label">Saldo Inicial</div><div class="kpi-num w" id="kSI">—</div><div class="kpi-sub">Base do período</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Entradas</div><div class="kpi-num g" id="kEnt">—</div><div class="kpi-sub">Receitas realizadas</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--red)"></div>
    <div class="kpi-label">Saídas</div><div class="kpi-num r" id="kSai">—</div><div class="kpi-sub">Custos + despesas</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Saldo Final</div><div class="kpi-num" id="kSF">—</div><div class="kpi-sub">Posição atual</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--blue)"></div>
    <div class="kpi-label">Lançamentos</div><div class="kpi-num w" id="kLanc">—</div><div class="kpi-sub">Total no período</div></div>
</div>

<div class="body">
  <div class="main-col">
    <div class="filter-bar">
      <input class="fsel" type="date" id="fDtIni" style="flex:0 0 auto" onchange="debouncedLoad()">
      <span style="color:var(--muted);font-size:11px">até</span>
      <input class="fsel" type="date" id="fDtFim" style="flex:0 0 auto" onchange="debouncedLoad()">
      <div class="search-wrap">
        <input type="text" id="fSearch" placeholder="Buscar por descrição, categoria..." oninput="applyFilters()">
      </div>
      <select class="fsel" id="fConcil" onchange="applyFilters()">
        <option value="">Conciliação: todas</option>
        <option value="S">Conciliados</option>
        <option value="N">Pendentes</option>
      </select>
      <span class="filter-count" id="filterCount">— lançamentos</span>
    </div>

    <div class="summary-row">
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(52,211,153,0.12)">↑</div>
        <div><div class="sum-label">Entradas filtradas</div><div class="sum-val" id="sEnt" style="color:var(--green)">—</div></div>
      </div>
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(248,113,113,0.12)">↓</div>
        <div><div class="sum-label">Saídas filtradas</div><div class="sum-val" id="sSai" style="color:var(--red)">—</div></div>
      </div>
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(56,189,248,0.12)">=</div>
        <div><div class="sum-label">Resultado filtrado</div><div class="sum-val" id="sRes" style="color:#fff">—</div></div>
      </div>
    </div>

    <div class="table-wrap" id="tableWrap">
      <div class="loading" id="loadingEl"><div class="spinner"></div>Carregando dados da Omie...</div>
      <table id="mainTable" style="display:none">
        <thead>
          <tr>
            <th onclick="sortTable('data_lancamento')">Data <span class="sort-ico">↕</span></th>
            <th>Conta</th>
            <th onclick="sortTable('valor')" style="text-align:right">Valor <span class="sort-ico">↕</span></th>
            <th onclick="sortTable('descricao')">Descrição <span class="sort-ico">↕</span></th>
            <th onclick="sortTable('categoria')">Categoria <span class="sort-ico">↕</span></th>
            <th style="text-align:center">Status</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>

    <div class="table-footer">
      <span id="footerLeft">Mostrando — lançamentos</span>
      <span style="font-family:'DM Mono',monospace;font-size:10px" id="footerRight"></span>
    </div>
  </div>

  <div class="right-panel">
    <div>
      <div class="panel-title">Saldo por conta</div>
    </div>
    <div id="bankCards"><div style="color:var(--muted);font-size:10px">Carregando...</div></div>
    <div class="divider"></div>
    <div>
      <div class="panel-title" style="margin-bottom:8px">Resumo do período</div>
      <div class="stat-row"><span class="stat-label">Total lançamentos</span><span class="stat-val" id="pTotal">—</span></div>
      <div class="stat-row"><span class="stat-label">Conciliados</span><span class="stat-val" style="color:var(--green)" id="pConcil">—</span></div>
      <div class="stat-row"><span class="stat-label">Pendentes</span><span class="stat-val" style="color:var(--amber)" id="pPend">—</span></div>
      <div class="stat-row"><span class="stat-label">% conciliado</span><span class="stat-val" id="pPct">—</span></div>
    </div>
    <div class="divider"></div>
    <div>
      <div class="panel-title" style="margin-bottom:8px">Top categorias</div>
      <div id="topCateg" style="display:flex;flex-direction:column;gap:6px"></div>
    </div>
  </div>
</div>

<script>
const API = '${apiUrl}';
const EMPRESA = ${empresaId};
const TOKEN = '${token}';

const fmt = v => Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK = v => {const a=Math.abs(v);return (v<0?'−':'')+(a>=1000?(a/1000).toFixed(1)+'K':a.toFixed(2));};

let RAW = [];
let filtered = [];
let sortCol = 'data_lancamento', sortDir = -1;

// Datas default
const today = new Date();
const toISO = d => d.toISOString().slice(0,10);
document.getElementById('fDtFim').value = toISO(today);
// Inicializa 6 meses atrás como placeholder — será ajustado após primeiro carregamento
const fallbackIni = new Date(); fallbackIni.setMonth(fallbackIni.getMonth() - 6); fallbackIni.setDate(1);
document.getElementById('fDtIni').value = toISO(fallbackIni);

let _debounceTimer = null;
function debouncedLoad() {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => loadData(), 400);
}

let firstLoadDone = false;

async function loadData() {
  document.getElementById('loadingEl').style.display = 'flex';
  document.getElementById('loadingEl').innerHTML = '<div class="spinner"></div>Carregando dados da Omie...';
  document.getElementById('mainTable').style.display = 'none';

  let iniVal = document.getElementById('fDtIni').value;
  const fimVal = document.getElementById('fDtFim').value;

  // Na primeira carga, busca desde 01/01/2020 para encontrar todos os dados
  const fetchIni = !firstLoadDone ? '01/01/2020' : iniVal.split('-').reverse().join('/');
  const fetchFim = fimVal.split('-').reverse().join('/');

  try {
    const url = API + '/empresas/' + EMPRESA + '/extrato?data_inicio=' + encodeURIComponent(fetchIni) + '&data_fim=' + encodeURIComponent(fetchFim);
    console.log('[Extrato] Fetching:', url);
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN } });
    if (!res.ok) throw new Error('Erro HTTP ' + res.status);
    const data = await res.json();
    RAW = Array.isArray(data) ? data : (data.dados || data.lancamentos || data.items || []);
    console.log('[Extrato] Recebidos:', RAW.length, 'registros. Período:', fetchIni, '→', fetchFim);

    // Normaliza campos — API retorna valor sempre positivo, direção vem de 'origem'
    // origem terminando em P = Pagar (saída), R = Receber (entrada)
    RAW = RAW.map(r => {
      const v = Math.abs(r.valor || 0);
      const origem = (r.origem || '').toUpperCase();
      const isSaida = origem.endsWith('P') || origem.includes('PAG');
      const isEntrada = origem.endsWith('R') || origem.includes('REC');
      // Se não conseguir determinar pela origem, usa categoria: 1.x = receita, 2.x = despesa
      const cat = r.categoria || r.cCodCateg || '';
      const finalSaida = isSaida || (!isEntrada && cat.startsWith('2.'));
      const finalEntrada = isEntrada || (!isSaida && (cat.startsWith('1.') || !finalSaida));

      return {
        ...r,
        nValorEntrada: r.nValorEntrada != null && r.nValorEntrada > 0 ? r.nValorEntrada : (finalEntrada && v > 0 ? v : 0),
        nValorSaida: r.nValorSaida != null && r.nValorSaida > 0 ? r.nValorSaida : (finalSaida && v > 0 ? v : 0),
        cDescricao: r.cDescricao || r.descricao || r.cObs || '—',
        dDataLancamento: r.dDataLancamento || r.data_lancamento || '—',
        cDescricaoConta: r.cDescricaoConta || r.conta || '—',
        cCodCateg: r.cCodCateg || r.categoria || '—',
        lLancConciliado: r.lLancConciliado || (r.conciliado === true ? 'S' : 'N'),
      };
    });

    // Na primeira carga, ajusta data inicial para o mês do primeiro lançamento
    if (!firstLoadDone && RAW.length > 0) {
      firstLoadDone = true;
      const parseDMY2 = s => { const p = (s||'').split('/'); return p.length===3 ? new Date(+p[2], +p[1]-1, +p[0]) : null; };
      let earliest = null;
      RAW.forEach(r => {
        const d = parseDMY2(r.data_lancamento);
        if (d && (!earliest || d < earliest)) earliest = d;
      });
      if (earliest) {
        earliest.setDate(1);
        document.getElementById('fDtIni').value = toISO(earliest);
      }
    }

    // Carrega saldos por conta
    loadSaldos();
    applyFilters();

    document.getElementById('loadingEl').style.display = 'none';
    document.getElementById('mainTable').style.display = '';

    // KPIs globais
    const ent = RAW.filter(r => (r.nValorEntrada || 0) > 0).reduce((s,r) => s + (r.nValorEntrada || 0), 0);
    const sai = RAW.filter(r => (r.nValorSaida || 0) > 0).reduce((s,r) => s + (r.nValorSaida || 0), 0);
    document.getElementById('kEnt').textContent = fmtK(ent);
    document.getElementById('kSai').textContent = fmtK(sai);
    const sf = ent - sai;
    const sfEl = document.getElementById('kSF');
    sfEl.textContent = fmtK(sf);
    sfEl.className = 'kpi-num ' + (sf >= 0 ? 'g' : 'r');
    document.getElementById('kLanc').textContent = RAW.length;
    document.getElementById('kSI').textContent = '0,00';

  } catch(e) {
    document.getElementById('loadingEl').innerHTML = '<span style="color:var(--red)">Erro ao carregar dados: ' + e.message + '</span>';
  }
}

async function loadSaldos() {
  try {
    const res = await fetch(
      API + '/empresas/' + EMPRESA + '/saldos',
      { headers: { Authorization: 'Bearer ' + TOKEN } }
    );
    const data = await res.json();
    const contas = Array.isArray(data) ? data : (data.dados || data.contas || data.saldos || []);
    const maxSaldo = Math.max(...contas.map(c => Math.abs(c.saldo || 0)), 1);
    const colors = ['#38BDF8','#34D399','#FBBF24','#C084FC','#FB923C'];

    document.getElementById('bankCards').innerHTML = contas.map((c, i) => {
      const saldo = c.saldo || 0;
      const nome = c.descricao || c.BANCO || c.nome || 'Conta ' + (i+1);
      const pct = Math.round(Math.abs(saldo) / maxSaldo * 100);
      const color = colors[i % colors.length];
      return \`<div class="bank-card">
        <div class="bank-name"><span class="bank-dot" style="background:\${color}"></span>\${nome}</div>
        <div class="bank-saldo \${saldo === 0 ? 'zero' : ''}">\${fmt(saldo)}</div>
        <div class="bank-sub">Saldo atual</div>
        <div class="bank-mini-bar"><div class="bank-mini-fill" style="width:0%;background:\${color}" data-pct="\${pct}"></div></div>
      </div>\`;
    }).join('');

    setTimeout(() => {
      document.querySelectorAll('.bank-mini-fill').forEach(el => {
        el.style.width = el.dataset.pct + '%';
      });
    }, 300);
  } catch(e) { console.warn('saldos:', e); }
}

function applyFilters() {
  const q = document.getElementById('fSearch').value.toLowerCase();
  const concil = document.getElementById('fConcil').value;

  filtered = RAW.filter(r => {
    const desc = (r.cDescricao || r.descricao || r.cObs || '').toLowerCase();
    const cat = (r.cCodCateg || r.categoria || '').toLowerCase();
    if (q && !desc.includes(q) && !cat.includes(q)) return false;
    if (concil) {
      const isConcil = r.lLancConciliado === 'S' || r.conciliado === true;
      if (concil === 'S' && !isConcil) return false;
      if (concil === 'N' && isConcil) return false;
    }
    return true;
  });

  renderTable();
  updateSummary();
}

function sortTable(col) {
  if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = -1; }
  const parseDt = s => { const p = (s||'').split('/'); return p.length===3 ? +p[2]*10000 + +p[1]*100 + +p[0] : 0; };
  filtered.sort((a, b) => {
    let va, vb;
    if (col === 'data_lancamento') {
      va = parseDt(a.dDataLancamento || a.data_lancamento);
      vb = parseDt(b.dDataLancamento || b.data_lancamento);
    } else if (col === 'valor') {
      va = (a.nValorEntrada || 0) - (a.nValorSaida || 0);
      vb = (b.nValorEntrada || 0) - (b.nValorSaida || 0);
    } else {
      va = a[col] || '';
      vb = b[col] || '';
    }
    return va < vb ? sortDir : va > vb ? -sortDir : 0;
  });
  renderTable();
}

function renderTable() {
  const show = filtered.slice(0, 300);
  const tbody = document.getElementById('tbody');

  tbody.innerHTML = show.map(r => {
    const ent = r.nValorEntrada || 0;
    const sai = r.nValorSaida || 0;
    const isE = ent > 0;
    const valor = isE ? ent : sai;
    const valCls = isE ? 'val-g' : 'val-r';
    const sign = isE ? '+' : '−';
    const desc = r.cDescricao || r.descricao || r.cObs || '—';
    const cat = r.cCodCateg || r.categoria || '—';
    const data = r.dDataLancamento || r.data_lancamento || '—';
    const conta = r.cDescricaoConta || r.conta || '—';
    const isConcil = r.lLancConciliado === 'S' || r.conciliado === true;
    const badge = isConcil
      ? '<span class="badge concil">✓ Conciliado</span>'
      : '<span class="badge pend">⏳ Pendente</span>';

    return \`<tr class="\${isE ? 'entrada-row' : 'saida-row'}">
      <td class="mono" style="color:var(--muted)">\${data}</td>
      <td style="font-size:10px;color:var(--muted)">\${conta}</td>
      <td class="\${valCls}">\${sign} \${fmt(valor)}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">\${desc}</td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font-size:10px">\${cat}</td>
      <td style="text-align:center">\${badge}</td>
    </tr>\`;
  }).join('');

  document.getElementById('footerLeft').textContent = \`Mostrando \${Math.min(show.length, filtered.length)} de \${filtered.length} lançamentos\`;
  document.getElementById('filterCount').textContent = filtered.length + ' lançamentos';

  const totEnt = filtered.reduce((s, r) => s + (r.nValorEntrada || 0), 0);
  const totSai = filtered.reduce((s, r) => s + (r.nValorSaida || 0), 0);
  document.getElementById('footerRight').textContent = \`Resultado: \${fmtK(totEnt - totSai)}\`;
}

function updateSummary() {
  const ent = filtered.reduce((s, r) => s + (r.nValorEntrada || 0), 0);
  const sai = filtered.reduce((s, r) => s + (r.nValorSaida || 0), 0);
  const res = ent - sai;
  document.getElementById('sEnt').textContent = fmtK(ent);
  document.getElementById('sSai').textContent = fmtK(sai);
  const el = document.getElementById('sRes');
  el.textContent = fmtK(res);
  el.style.color = res >= 0 ? 'var(--green)' : 'var(--red)';

  const concil = filtered.filter(r => r.lLancConciliado === 'S' || r.conciliado === true).length;
  const pend = filtered.length - concil;
  document.getElementById('pTotal').textContent = filtered.length;
  document.getElementById('pConcil').textContent = concil;
  document.getElementById('pPend').textContent = pend;
  document.getElementById('pPct').textContent = filtered.length > 0 ? Math.round(concil / filtered.length * 100) + '%' : '—';

  // Top categorias
  const catMap = {};
  filtered.forEach(r => {
    const cat = r.cCodCateg || r.categoria || 'Sem categoria';
    const val = (r.nValorEntrada || 0) + (r.nValorSaida || 0);
    catMap[cat] = (catMap[cat] || 0) + val;
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxVal = topCats[0]?.[1] || 1;
  document.getElementById('topCateg').innerHTML = topCats.map(([cat, val]) => \`
    <div>
      <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px">
        <span style="color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px" title="\${cat}">\${cat}</span>
        <span style="font-family:'DM Mono',monospace;color:var(--text);font-size:9px">\${fmtK(val)}</span>
      </div>
      <div style="height:2px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
        <div style="width:\${Math.round(val/maxVal*100)}%;height:100%;background:var(--blue);opacity:0.6;border-radius:2px"></div>
      </div>
    </div>\`).join('');
}

// Inicia carregamento
loadData();
</script>
</body>
</html>`

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'width:100%;height:calc(100vh - 48px);border:none;display:block'
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts')
    iframe.srcdoc = html
    ref.current!.innerHTML = ''
    ref.current!.appendChild(iframe)
  }, [empresaAtiva, token])

  return <div ref={ref} style={{ width: '100%', height: 'calc(100vh - 48px)' }} />
}
