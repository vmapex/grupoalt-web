'use client'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function CaixaPage() {
  const ref = useRef<HTMLIFrameElement>(null)
  const { token, empresaAtiva } = useAuthStore()

  useEffect(() => {
    if (!ref.current) return

    const empresaId = empresaAtiva?.id || 1
    const apiUrl = window.location.origin + '/api/proxy'

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://unpkg.com/@fontsource/dm-mono@4.5.14/index.css">
<link rel="stylesheet" href="https://unpkg.com/@fontsource/plus-jakarta-sans@8.0.0/index.css">
<style>
:root{--bg:#05091A;--surface:rgba(255,255,255,0.034);--border:rgba(255,255,255,0.07);--blue:#38BDF8;--green:#34D399;--red:#F87171;--amber:#FBBF24;--text:#F1F5F9;--muted:#64748B}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);font-family:'Plus Jakarta Sans',sans-serif;color:var(--text);background-image:linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px);background-size:48px 48px}
input[type="date"]{background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:11px;padding:5px 10px;border-radius:7px;font-family:inherit;outline:none;cursor:pointer}
input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:.5;cursor:pointer}
input[type="date"]:focus{border-color:rgba(56,189,248,.4)}
.toolbar{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:8px 20px;border-bottom:1px solid var(--border);background:rgba(5,9,26,0.97)}
.toolbar label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px}
.toolbar-group{display:flex;align-items:center;gap:6px}
.btn{padding:4px 12px;border-radius:6px;font-size:10px;border:1px solid var(--border);background:rgba(255,255,255,.05);color:var(--muted);cursor:pointer;font-family:inherit;transition:all .15s}
.btn:hover{background:rgba(56,189,248,.1);color:var(--blue);border-color:var(--blue)}
.kpi-strip{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--border)}
.kpi{padding:12px 20px;border-right:1px solid var(--border);position:relative;overflow:hidden;cursor:default;transition:background .2s;animation:fadeUp .35s ease both}
.kpi:last-child{border-right:none}
.kpi:hover{background:rgba(255,255,255,0.015)}
.kpi-glow{position:absolute;bottom:0;left:0;right:0;height:1.5px;opacity:0;transition:opacity .3s}
.kpi:hover .kpi-glow{opacity:1}
.kpi:nth-child(1){animation-delay:.04s}.kpi:nth-child(2){animation-delay:.08s}.kpi:nth-child(3){animation-delay:.12s}.kpi:nth-child(4){animation-delay:.16s}.kpi:nth-child(5){animation-delay:.20s}
.kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:5px}
.kpi-num{font-family:'DM Mono',monospace;font-size:18px;font-weight:400}
.kpi-num.g{color:var(--green)}.kpi-num.r{color:var(--red)}.kpi-num.w{color:#fff}.kpi-num.b{color:var(--blue)}
.kpi-sub{font-size:9px;color:var(--muted);margin-top:2px}
.body{display:grid;grid-template-columns:1fr 260px;height:calc(100vh - 118px)}
.charts-col{padding:14px 18px;overflow-y:auto;border-right:1px solid var(--border)}
.charts-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.cc{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:12px;transition:border-color .2s;position:relative;overflow:hidden;cursor:pointer}
.cc:hover{border-color:rgba(56,189,248,.18)}
.cc-shine{position:absolute;top:0;left:0;right:0;height:1px;opacity:0;transition:opacity .3s;background:linear-gradient(90deg,transparent,var(--blue),transparent)}
.cc:hover .cc-shine{opacity:1}
.cc-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
.cc-title{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted)}
.cc-kpi{font-family:'DM Mono',monospace;font-size:13px;text-align:right;color:#fff}
.chart-wrap{position:relative;height:120px}
.dre-col{padding:14px 12px;display:flex;flex-direction:column;overflow-y:auto}
.dre-title-label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:12px}
.di{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);cursor:default;transition:padding-left .15s}
.di:last-child{border-bottom:none}
.di:hover{padding-left:3px}
.di-l{display:flex;align-items:center;gap:6px}
.di-dot{width:4px;height:4px;border-radius:50%}
.di-name{font-size:10px;color:var(--muted)}
.di:hover .di-name{color:var(--text)}
.di-r{text-align:right}
.di-val{font-family:'DM Mono',monospace;font-size:10px;color:#fff}
.di-val.neg{color:var(--red)}
.di-pct{font-size:9px;color:var(--muted);margin-top:1px}
.di.subtotal .di-name{color:var(--text);font-weight:600}
.di.subtotal .di-val{font-weight:600}
.di.subtotal{border-bottom:1px solid rgba(255,255,255,.12)}
.di.final-row .di-name{color:var(--blue);font-weight:700;font-size:11px}
.di.final-row .di-val{color:var(--blue);font-weight:700;font-size:11px}
.loading-overlay{display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:12px;color:var(--muted);font-size:11px}
.spinner{width:18px;height:18px;border:2px solid rgba(56,189,248,.2);border-top-color:#38BDF8;border-radius:50%;animation:spin .7s linear infinite}
.error-box{display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:12px;color:var(--red);font-size:12px}
.error-box .btn{margin-top:8px;color:var(--text);border-color:var(--red)}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
</style>
</head>
<body>

<div class="toolbar">
  <div class="toolbar-group">
    <label>De</label>
    <input type="date" id="dtInicio">
  </div>
  <div class="toolbar-group">
    <label>Até</label>
    <input type="date" id="dtFim">
  </div>
  <button class="btn" onclick="applyFilter()">Filtrar</button>
</div>

<div class="kpi-strip">
  <div class="kpi"><div class="kpi-glow" style="background:var(--blue)"></div>
    <div class="kpi-label">Saldo Inicial</div><div class="kpi-num w" id="kSI">--</div><div class="kpi-sub">Base do período</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Entradas</div><div class="kpi-num g" id="kEnt">--</div><div class="kpi-sub">Receitas realizadas</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--red)"></div>
    <div class="kpi-label">Saídas</div><div class="kpi-num r" id="kSai">--</div><div class="kpi-sub">Custos + despesas</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Saldo Final</div><div class="kpi-num" id="kSF">--</div><div class="kpi-sub">Posição atual</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Balanço</div><div class="kpi-num" id="kBal">--</div><div class="kpi-sub">Resultado líquido</div></div>
</div>

<div class="body">
  <div class="charts-col" id="chartsCol">
    <div class="loading-overlay" id="loadingState">
      <div class="spinner"></div>
      Carregando dados da Omie...
    </div>
  </div>
  <div class="dre-col">
    <div class="dre-title-label">DRE Realizado</div>
    <div id="dreList"><div class="loading-overlay"><div class="spinner"></div></div></div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js"><\/script>
<script>
Chart.register(ChartDataLabels);

const API = '${apiUrl}';
const EMPRESA = ${empresaId};
const TOKEN = '${token}';

// ── FORMATTERS ───────────────────────────────────────────────────────────────
function fmtBR(v) {
  return Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtK(v) {
  if (v === 0 || v == null) return '0,00';
  var a = Math.abs(v);
  var s = v < 0 ? '-' : '';
  if (a >= 1e6) return s + (a / 1e6).toFixed(2).replace('.', ',') + 'M';
  if (a >= 1e3) return s + (a / 1e3).toFixed(2).replace('.', ',') + 'K';
  return s + a.toFixed(2).replace('.', ',');
}
function fmtKShort(v) {
  if (v === 0 || v == null) return '0';
  var a = Math.abs(v);
  var s = v < 0 ? '-' : '';
  if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace('.', ',') + 'M';
  if (a >= 1e3) return s + (a / 1e3).toFixed(1).replace('.', ',') + 'K';
  return s + a.toFixed(0);
}
function fmtPct(v) {
  return (v >= 0 ? '' : '-') + Math.abs(v).toFixed(1).replace('.', ',') + '%';
}
function parseDateBR(str) {
  var p = str.split('/');
  return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
}
function toDateInput(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function toApiBR(dateStr) {
  var p = dateStr.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

// ── DRE MAPPING ──────────────────────────────────────────────────────────────
function getDREGroup(cat) {
  if (!cat) return null;
  if (/^1\\.01\\./.test(cat)) return 'RoB';
  if (/^1\\.02\\./.test(cat)) return 'RNOP';
  if (/^2\\.01\\./.test(cat) || /^2\\.02\\./.test(cat)) return 'TDCF';
  if (/^2\\.03\\./.test(cat) || /^2\\.04\\./.test(cat)) return 'CV';
  if (/^2\\.0[5-9]\\./.test(cat) || /^2\\.1[0-3]\\./.test(cat)) return 'CF';
  if (/^2\\.14\\./.test(cat)) return 'DNOP';
  if (/^2\\.15\\./.test(cat)) return 'IRPJ';
  if (/^2\\.16\\./.test(cat)) return 'CSLL';
  // Fallback: 1.xx = RoB, 2.xx = CF
  if (cat.startsWith('1.')) return 'RoB';
  if (cat.startsWith('2.')) return 'CF';
  return null;
}

var RAW = [];
var charts = {};
var MESES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

// ── FETCH ────────────────────────────────────────────────────────────────────
async function fetchData(dtIni, dtFim) {
  var url = API + '/empresas/' + EMPRESA + '/extrato?dt_inicio=' + encodeURIComponent(dtIni) + '&dt_fim=' + encodeURIComponent(dtFim);
  var res = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!res.ok) throw new Error('Erro HTTP ' + res.status);
  var data = await res.json();
  return Array.isArray(data) ? data : (data.dados || data.lancamentos || []);
}

// ── DETERMINE DIRECTION ─────────────────────────────────────────────────────
function isEntrada(r) {
  var cat = r.categoria || '';
  return cat.startsWith('1.');
}

// ── AGGREGATE BY MONTH ───────────────────────────────────────────────────────
function aggregateByMonth(lancamentos) {
  var map = {};
  lancamentos.forEach(function(r) {
    var dt = r.data_lancamento || '';
    if (!dt) return;
    var parts = dt.split('/');
    if (parts.length < 3) return;
    var mm = parseInt(parts[1]);
    var yyyy = parseInt(parts[2]);
    var key = yyyy * 100 + mm;
    var label = MESES[mm - 1] + '/' + String(yyyy).slice(2);
    if (!map[key]) map[key] = { key: key, label: label, RoB: 0, RNOP: 0, TDCF: 0, CV: 0, CF: 0, DNOP: 0, IRPJ: 0, CSLL: 0 };
    var grp = getDREGroup(r.categoria);
    if (grp && map[key][grp] !== undefined) {
      map[key][grp] += Math.abs(r.valor || 0);
    }
  });
  var keys = Object.keys(map).map(Number).sort(function(a, b) { return a - b; });
  return keys.map(function(k) { return map[k]; });
}

// ── COMPUTE DRE TOTALS ──────────────────────────────────────────────────────
function computeDRE(lancamentos) {
  var dre = { RoB: 0, RNOP: 0, TDCF: 0, CV: 0, CF: 0, DNOP: 0, IRPJ: 0, CSLL: 0 };
  lancamentos.forEach(function(r) {
    var grp = getDREGroup(r.categoria);
    if (grp && dre[grp] !== undefined) {
      dre[grp] += Math.abs(r.valor || 0);
    }
  });
  dre.RL = dre.RoB - dre.TDCF;
  dre.MC = dre.RL - dre.CV;
  dre.EBT1 = dre.MC - dre.CF;
  dre.SNOP = dre.RNOP - dre.DNOP;
  dre.EBT2 = dre.EBT1 + dre.SNOP;
  dre.RES_LIQ = dre.EBT2 - dre.IRPJ - dre.CSLL;
  return dre;
}

// ── BUILD KPIs ───────────────────────────────────────────────────────────────
function updateKPIs(lancamentos) {
  var totEnt = 0, totSai = 0;
  lancamentos.forEach(function(r) {
    var v = Math.abs(r.valor || 0);
    if (isEntrada(r)) totEnt += v;
    else totSai += v;
  });
  var saldo = totEnt - totSai;

  document.getElementById('kSI').textContent = '0,00';
  document.getElementById('kEnt').textContent = fmtK(totEnt);
  document.getElementById('kSai').textContent = fmtK(totSai);

  var sfEl = document.getElementById('kSF');
  sfEl.textContent = fmtK(saldo);
  sfEl.className = 'kpi-num ' + (saldo >= 0 ? 'g' : 'r');

  var balEl = document.getElementById('kBal');
  balEl.textContent = fmtK(saldo);
  balEl.className = 'kpi-num ' + (saldo >= 0 ? 'g' : 'r');
}

// ── CREATE BAR CHART ─────────────────────────────────────────────────────────
function createBarChart(canvasId, title, labels, data, color) {
  var ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: color + '33',
        borderColor: color,
        borderWidth: 1,
        borderRadius: 3,
        barPercentage: 0.7,
        categoryPercentage: 0.8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'top',
          color: '#94A3B8',
          font: { family: 'DM Mono', size: 8 },
          formatter: function(v) { return fmtKShort(v); }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748B', font: { family: 'DM Mono', size: 8 } },
          border: { display: false }
        },
        y: {
          display: false,
          grid: { display: false },
          beginAtZero: true,
          grace: '20%'
        }
      },
      onClick: function(e, elements) {
        if (elements.length > 0) {
          var idx = elements[0].index;
          console.log('Drill into ' + title + ' at ' + labels[idx]);
        }
      }
    }
  });
}

// ── RENDER CHARTS ────────────────────────────────────────────────────────────
function renderCharts(monthly) {
  Object.values(charts).forEach(function(c) { c.destroy(); });
  charts = {};

  var labels = monthly.map(function(m) { return m.label; });
  var col = document.getElementById('chartsCol');

  var chartDefs = [
    { id: 'cRoB', title: 'RECEITA BRUTA', field: 'RoB', color: '#38BDF8' },
    { id: 'cTDCF', title: 'T.D.C.F.', field: 'TDCF', color: '#38BDF8' },
    { id: 'cCV', title: 'CUSTO VARIÁVEL', field: 'CV', color: '#38BDF8' },
    { id: 'cCF', title: 'CUSTO FIXO', field: 'CF', color: '#38BDF8' },
    { id: 'cRNOP', title: 'RECEITA NOP', field: 'RNOP', color: '#38BDF8' },
    { id: 'cDNOP', title: 'DESPESA NOP', field: 'DNOP', color: '#38BDF8' }
  ];

  var gridHtml = '<div class="charts-grid">';
  chartDefs.forEach(function(cd) {
    var total = monthly.reduce(function(s, m) { return s + m[cd.field]; }, 0);
    gridHtml += '<div class="cc" onclick="console.log(\\'Drill: ' + cd.title + '\\')">' +
      '<div class="cc-shine"></div>' +
      '<div class="cc-head">' +
        '<div class="cc-title">' + cd.title + '</div>' +
        '<div class="cc-kpi">' + fmtK(total) + '</div>' +
      '</div>' +
      '<div class="chart-wrap"><canvas id="' + cd.id + '"></canvas></div>' +
    '</div>';
  });
  gridHtml += '</div>';

  col.innerHTML = gridHtml;

  chartDefs.forEach(function(cd) {
    var data = monthly.map(function(m) { return m[cd.field]; });
    charts[cd.id] = createBarChart(cd.id, cd.title, labels, data, cd.color);
  });
}

// ── RENDER DRE ───────────────────────────────────────────────────────────────
function renderDRE(dre) {
  var robVal = dre.RoB || 1;
  function pct(v) { return (v / robVal) * 100; }

  var rows = [
    { name: 'RoB', val: dre.RoB, dot: '#38BDF8' },
    { name: 'TDCF', val: dre.TDCF, dot: '#F87171' },
    { name: 'RL', val: dre.RL, dot: '#34D399', sub: true },
    { name: 'CV', val: dre.CV, dot: '#FB923C' },
    { name: 'MC', val: dre.MC, dot: '#34D399', sub: true },
    { name: 'CF', val: dre.CF, dot: '#FBBF24' },
    { name: 'EBT1', val: dre.EBT1, dot: '#C084FC', sub: true },
    { name: 'RNOP', val: dre.RNOP, dot: '#38BDF8' },
    { name: 'DNOP', val: dre.DNOP, dot: '#F87171' },
    { name: 'EBT2', val: dre.EBT2, dot: '#C084FC', sub: true },
    { name: 'IRPJ', val: dre.IRPJ, dot: '#64748B' },
    { name: 'CSLL', val: dre.CSLL, dot: '#64748B' },
    { name: 'RES LÍQ', val: dre.RES_LIQ, dot: '#34D399', final: true }
  ];

  var html = '';
  rows.forEach(function(r) {
    var isNeg = r.val < 0;
    var cls = 'di';
    if (r.sub) cls += ' subtotal';
    if (r.final) cls += ' final-row';
    var valCls = 'di-val' + (isNeg ? ' neg' : '');
    var p = pct(r.val);
    html += '<div class="' + cls + '">' +
      '<div class="di-l"><div class="di-dot" style="background:' + r.dot + '"></div><div class="di-name">' + r.name + '</div></div>' +
      '<div class="di-r"><div class="' + valCls + '">' + fmtK(r.val) + '</div><div class="di-pct">' + fmtPct(p) + '</div></div>' +
    '</div>';
  });

  document.getElementById('dreList').innerHTML = html;
}

// ── SHOW ERROR ───────────────────────────────────────────────────────────────
function showError(msg) {
  document.getElementById('chartsCol').innerHTML =
    '<div class="error-box">' +
      '<div>' + msg + '</div>' +
      '<button class="btn" onclick="applyFilter()">Tentar novamente</button>' +
    '</div>';
  document.getElementById('dreList').innerHTML = '<div class="error-box" style="height:100px"><div>' + msg + '</div></div>';
}

// ── MAIN LOAD ────────────────────────────────────────────────────────────────
async function loadData(dtIni, dtFim) {
  document.getElementById('chartsCol').innerHTML = '<div class="loading-overlay" id="loadingState"><div class="spinner"></div>Carregando dados da Omie...</div>';
  document.getElementById('dreList').innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

  try {
    RAW = await fetchData(dtIni, dtFim);

    if (!RAW.length) {
      document.getElementById('chartsCol').innerHTML = '<div class="loading-overlay" style="color:var(--muted)">Nenhum dado encontrado para o período selecionado.</div>';
      document.getElementById('dreList').innerHTML = '';
      updateKPIs([]);
      return;
    }

    updateKPIs(RAW);

    var monthly = aggregateByMonth(RAW);
    renderCharts(monthly);

    var dre = computeDRE(RAW);
    renderDRE(dre);

  } catch (err) {
    showError('Erro ao carregar dados: ' + err.message);
  }
}

function applyFilter() {
  var dtIni = toApiBR(document.getElementById('dtInicio').value);
  var dtFim = toApiBR(document.getElementById('dtFim').value);
  loadData(dtIni, dtFim);
}

// ── INIT ─────────────────────────────────────────────────────────────────────
(function init() {
  var today = new Date();
  var sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  document.getElementById('dtInicio').value = toDateInput(sixMonthsAgo);
  document.getElementById('dtFim').value = toDateInput(today);

  var dtIni = toApiBR(toDateInput(sixMonthsAgo));
  var dtFim = toApiBR(toDateInput(today));
  loadData(dtIni, dtFim);
})();
<\/script>
</body>
</html>`

    ref.current.srcdoc = html
  }, [token, empresaAtiva])

  return (
    <iframe
      ref={ref}
      sandbox="allow-same-origin allow-scripts"
      style={{ width: '100%', height: 'calc(100vh - 48px)', border: 'none' }}
    />
  )
}
