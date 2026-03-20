"use client"
import { useEffect, useRef } from 'react'

export default function CpCrPage() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const html = `
<link rel="stylesheet" href="https://unpkg.com/@fontsource/dm-mono@4.5.14/index.css">
<link rel="stylesheet" href="https://unpkg.com/@fontsource/plus-jakarta-sans@8.0.0/index.css">
<style>
:root{
  --bg:#05091A;--surface:rgba(255,255,255,0.034);--border:rgba(255,255,255,0.07);
  --blue:#38BDF8;--green:#34D399;--red:#F87171;--amber:#FBBF24;--orange:#FB923C;--purple:#C084FC;
  --text:#F1F5F9;--muted:#64748B;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);font-family:'Plus Jakarta Sans',sans-serif;color:var(--text);
  background-image:linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px);
  background-size:48px 48px;}

.nav{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;border-bottom:1px solid var(--border);background:rgba(5,9,26,0.95);position:sticky;top:0;z-index:20}
.logo-name{font-family:'DM Mono',monospace;font-size:14px;color:#fff;letter-spacing:2px}
.logo-tag{font-size:8px;color:var(--blue);letter-spacing:3px;margin-left:5px}
.nav-tabs{display:flex;gap:2px;background:rgba(255,255,255,0.04);border-radius:8px;padding:3px}
.ntab{padding:5px 12px;border-radius:6px;font-size:10px;color:var(--muted);cursor:pointer;transition:all 0.2s;border:none;background:transparent;font-family:inherit}
.ntab:hover{color:var(--text)}.ntab.active{background:rgba(56,189,248,0.12);color:var(--blue);font-weight:600}
.nav-right{display:flex;align-items:center;gap:8px}
.period-pill{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:5px 11px;font-size:10px;font-family:'DM Mono',monospace;color:var(--muted)}
.period-pill b{color:var(--text);font-weight:500}
.emp-sel{background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:10px;padding:5px 10px;border-radius:7px;font-family:inherit}
.emp-sel option{background:#0f172a}

/* SUBTABS */
.subtabs{display:flex;border-bottom:1px solid var(--border);background:rgba(5,9,26,0.6)}
.stab{padding:12px 28px;font-size:11px;font-weight:500;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.2s;display:flex;align-items:center;gap:8px}
.stab:hover{color:var(--text)}
.stab.active{color:var(--text)}
.badge-cnt{font-size:9px;padding:1px 7px;border-radius:99px;font-family:'DM Mono',monospace}
.stab.cp .badge-cnt{background:rgba(248,113,113,0.15);color:var(--red)}
.stab.cr .badge-cnt{background:rgba(52,211,153,0.15);color:var(--green)}

/* VIEW TOGGLE */
.view-toggle{display:flex;gap:2px;background:rgba(255,255,255,0.04);border-radius:8px;padding:3px;margin-left:auto;margin-right:24px}
.vtab{padding:5px 14px;border-radius:6px;font-size:10px;color:var(--muted);cursor:pointer;transition:all 0.2s;border:none;background:transparent;font-family:inherit;display:flex;align-items:center;gap:5px}
.vtab:hover{color:var(--text)}
.vtab.active{background:rgba(56,189,248,0.12);color:var(--blue);font-weight:600}

/* KPI STRIP */
.kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--border)}
.kpi{padding:14px 22px;border-right:1px solid var(--border);position:relative;overflow:hidden;cursor:default;transition:background 0.2s}
.kpi:last-child{border-right:none}
.kpi:hover{background:rgba(255,255,255,0.015)}
.kpi-glow{position:absolute;bottom:0;left:0;right:0;height:1.5px;opacity:0;transition:opacity 0.3s}
.kpi:hover .kpi-glow{opacity:1}
.kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:6px}
.kpi-num{font-family:'DM Mono',monospace;font-size:20px;font-weight:400}
.kpi-num.g{color:var(--green)}.kpi-num.r{color:var(--red)}.kpi-num.w{color:#fff}
.kpi-sub{font-size:9px;color:var(--muted);margin-top:2px}

/* VIEWS */
.view{display:none}.view.active{display:block}

/* ── TEMPORAL VIEW ── */
.temporal-view{padding:22px 26px}
.drill-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.drill-left{display:flex;align-items:center;gap:12px}
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:11px;font-family:'DM Mono',monospace}
.bc-item{color:var(--muted);cursor:pointer;transition:color 0.15s;padding:3px 0}
.bc-item:hover{color:var(--blue)}
.bc-item.active{color:var(--text);font-weight:500}
.bc-sep{color:var(--border);font-size:12px}
.drill-right{display:flex;align-items:center;gap:8px}
.level-pill{padding:4px 12px;border-radius:6px;font-size:9px;font-family:'DM Mono',monospace;letter-spacing:0.8px;border:1px solid var(--border);transition:all 0.2s}
.level-pill.anual   {border-color:rgba(251,191,36,0.4);  color:var(--amber); background:rgba(251,191,36,0.06)}
.level-pill.mensal  {border-color:rgba(56,189,248,0.4);  color:var(--blue);  background:rgba(56,189,248,0.06)}
.level-pill.semanal {border-color:rgba(52,211,153,0.4);  color:var(--green); background:rgba(52,211,153,0.06)}
.level-pill.diario  {border-color:rgba(192,132,252,0.4); color:var(--purple);background:rgba(192,132,252,0.06)}
.dbtn{display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:7px;font-size:10px;border:1px solid var(--border);background:var(--surface);color:var(--muted);cursor:pointer;font-family:inherit;transition:all 0.2s}
.dbtn:hover:not(:disabled){border-color:rgba(56,189,248,0.4);color:var(--blue);background:rgba(56,189,248,0.05)}
.dbtn:disabled{opacity:0.2;cursor:not-allowed}

/* MAIN CHART AREA */
.chart-row{display:grid;grid-template-columns:1fr 280px;gap:14px;align-items:start}
.chart-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;position:relative;overflow:hidden}
.chart-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;opacity:0.5}
.chart-card.cp::before{background:linear-gradient(90deg,transparent,var(--red),transparent)}
.chart-card.cr::before{background:linear-gradient(90deg,transparent,var(--green),transparent)}
.chart-card.both::before{background:linear-gradient(90deg,transparent,var(--blue),transparent)}
.chart-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.chart-head-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
.chart-total{font-family:'DM Mono',monospace;font-size:17px;color:#fff}
.chart-hint{font-size:9px;color:rgba(100,116,139,0.5);text-align:center;margin-top:5px}
.chart-wrap{position:relative}

/* SIDE PANEL */
.side-panel{display:flex;flex-direction:column;gap:12px}
.side-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
.side-title{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:10px}
.selected-info{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
.sel-period{font-family:'DM Mono',monospace;font-size:13px;color:var(--blue);margin-bottom:8px}
.sel-row{display:flex;justify-content:space-between;font-size:10px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
.sel-row:last-child{border-bottom:none}
.sel-label{color:var(--muted)}
.sel-val{font-family:'DM Mono',monospace}

/* LEGEND */
.legend-row{display:flex;gap:14px;margin-bottom:12px}
.leg{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted)}
.leg-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0}

/* MINI STATUS BARS */
.mini-status{display:flex;flex-direction:column;gap:5px}
.ms-row{display:flex;flex-direction:column;gap:2px}
.ms-label{display:flex;justify-content:space-between;font-size:9px}
.ms-label span:first-child{color:var(--muted)}
.ms-label span:last-child{font-family:'DM Mono',monospace;color:var(--text)}
.ms-bar{height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden}
.ms-fill{height:100%;border-radius:2px;transition:width 0.7s ease}

@keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
.kpi{animation:fadeUp 0.35s ease both}
.kpi:nth-child(1){animation-delay:.04s}.kpi:nth-child(2){animation-delay:.08s}
.kpi:nth-child(3){animation-delay:.12s}.kpi:nth-child(4){animation-delay:.16s}
</style>

<div class="nav">
  <div style="display:flex;align-items:baseline">
    <span class="logo-name">ALT MAX</span><span class="logo-tag">LOG</span>
  </div>
  <div class="nav-tabs">
    <button class="ntab" onclick="sendPrompt('Mostrar Caixa Realizado no novo layout')">Caixa Realizado</button>
    <button class="ntab" onclick="sendPrompt('Mostrar DRE Tabela no novo layout')">DRE Tabela</button>
    <button class="ntab" onclick="sendPrompt('Mostrar Extrato no novo layout')">Extrato</button>
    <button class="ntab active">A Pagar / A Receber</button>
    <button class="ntab" onclick="sendPrompt('Mostrar Fluxo de Caixa no novo layout')">Fluxo</button>
    <button class="ntab" onclick="sendPrompt('Mostrar Conciliação no novo layout')">Conciliação</button>
  </div>
  <div class="nav-right">
    <div class="period-pill">📅 <b>01/01/2025</b> → hoje</div>
    <select class="emp-sel"><option>Empresa Alpha Ltda</option><option>Beta Serviços S/A</option><option>Gama Comércio ME</option></select>
  </div>
</div>

<div class="subtabs">
  <div class="stab cp active" id="tabCP" onclick="switchTab('CP')" style="border-bottom-color:var(--red)">
    Contas a Pagar <span class="badge-cnt" id="cntCP">5</span>
  </div>
  <div class="stab cr" id="tabCR" onclick="switchTab('CR')" style="border-bottom-color:transparent">
    Contas a Receber <span class="badge-cnt" id="cntCR">1</span>
  </div>
  <div class="view-toggle">
    <button class="vtab" id="vtLanc"  onclick="switchView('lanc')">☰ Lançamentos</button>
    <button class="vtab" id="vtRepr"  onclick="switchView('repr')">◫ Representatividade</button>
    <button class="vtab active" id="vtTemp"  onclick="switchView('temp')">📅 Temporal</button>
  </div>
</div>

<div class="kpi-strip" id="kpiStrip"></div>

<!-- TEMPORAL VIEW -->
<div class="view active" id="viewTemp">
  <div class="temporal-view">
    <div class="drill-toolbar">
      <div class="drill-left">
        <div class="breadcrumb" id="breadcrumb"></div>
      </div>
      <div class="drill-right">
        <span class="level-pill anual" id="levelPill">Anual</span>
        <button class="dbtn" id="btnUp"   onclick="drillUp()">▲ Drill Up</button>
        <button class="dbtn" id="btnDown" onclick="drillDown()">▼ Drill Down</button>
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-card" id="mainCard">
        <div class="chart-head">
          <span class="chart-head-title" id="chartLabel">Vencimentos por ano</span>
          <span class="chart-total" id="chartTotal">—</span>
        </div>
        <div class="legend-row" id="legendRow"></div>
        <div class="chart-wrap" id="chartWrap" style="height:320px">
          <canvas id="mainChart"></canvas>
        </div>
        <div class="chart-hint" id="drillHint">clique em uma barra para detalhar ▼</div>
      </div>

      <div class="side-panel">
        <div class="selected-info" id="selectedInfo">
          <div class="sel-period" id="selPeriod">—</div>
          <div class="sel-row"><span class="sel-label">A Pagar</span><span class="sel-val" id="selCP" style="color:var(--red)">—</span></div>
          <div class="sel-row"><span class="sel-label">A Receber</span><span class="sel-val" id="selCR" style="color:var(--green)">—</span></div>
          <div class="sel-row"><span class="sel-label">Saldo</span><span class="sel-val" id="selBal">—</span></div>
          <div class="sel-row"><span class="sel-label">Nível</span><span class="sel-val" id="selLevel" style="color:var(--muted)">—</span></div>
        </div>

        <div class="side-card">
          <div class="side-title">Distribuição no período</div>
          <div class="mini-status" id="miniStatus"></div>
        </div>

        <div class="side-card">
          <div class="side-title">Status dos vencimentos</div>
          <div class="mini-status" id="statusDist"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- placeholder views -->
<div class="view" id="viewLanc" style="padding:40px;text-align:center;color:var(--muted)">
  ← Clique em "Lançamentos" para ver a tabela completa
</div>
<div class="view" id="viewRepr" style="padding:40px;text-align:center;color:var(--muted)">
  ← Clique em "Representatividade" para ver os rankings
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js"></script>
<script>
Chart.register(ChartDataLabels);

const fmt  = v => Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK = v => { const a=Math.abs(v); return (v<0?'−':'')+(a>=1000?(a/1000).toFixed(1)+'K':a.toFixed(2)); };

// ── DATA ─────────────────────────────────────────────────────────────────────
const CP_DATA = [
  {favorecido:'Taipastur',   categoria:'Descarga',      vcto:'14/03/2026', valor:855.10,   status:'A VENCER'},
  {favorecido:'Taipastur',   categoria:'Agregados',     vcto:'16/03/2026', valor:19266.00, status:'A VENCER'},
  {favorecido:'Triad',       categoria:'Serv. Contab.', vcto:'16/03/2026', valor:3000.00,  status:'A VENCER'},
  {favorecido:'Allianz',     categoria:'Seguro Carga',  vcto:'25/03/2026', valor:2147.60,  status:'A VENCER'},
  {favorecido:'Bsoft',       categoria:'Software / TI', vcto:'25/03/2026', valor:1334.31,  status:'A VENCER'},
  {favorecido:'LHC',         categoria:'Folha PJ',      vcto:'28/02/2026', valor:12000.00, status:'PAGO'},
  {favorecido:'João Vitor',  categoria:'Folha PJ',      vcto:'20/02/2026', valor:750.00,   status:'PAGO'},
  {favorecido:'Taipastur',   categoria:'Agregados',     vcto:'31/01/2026', valor:48591.00, status:'PAGO'},
  {favorecido:'Flash App',   categoria:'Desp. Viagens', vcto:'10/11/2025', valor:2000.00,  status:'PAGO'},
  {favorecido:'Cooper',      categoria:'Descarga',      vcto:'24/11/2025', valor:1175.00,  status:'PAGO'},
  {favorecido:'Bsoft',       categoria:'Software / TI', vcto:'27/10/2025', valor:204.60,   status:'PAGO'},
];

const CR_DATA = [
  {favorecido:'Ramax Cachoeira', categoria:'Receita MI', vcto:'04/12/2025', valor:1900.00,  status:'RECEBIDO'},
  {favorecido:'Ramax Cachoeira', categoria:'Receita MI', vcto:'04/12/2025', valor:17100.00, status:'RECEBIDO'},
  {favorecido:'Ramax Itariri',   categoria:'Receita MI', vcto:'15/12/2025', valor:8500.00,  status:'RECEBIDO'},
  {favorecido:'Ramax Itariri',   categoria:'Receita MI', vcto:'07/01/2026', valor:1175.00,  status:'RECEBIDO'},
  {favorecido:'Ramax Itariri',   categoria:'Receita MI', vcto:'16/12/2025', valor:8700.00,  status:'RECEBIDO'},
  {favorecido:'Ramax Itariri',   categoria:'Receita MI', vcto:'17/12/2025', valor:18000.00, status:'RECEBIDO'},
  {favorecido:'Ramax Itariri',   categoria:'Receita MI', vcto:'23/12/2025', valor:18500.00, status:'RECEBIDO'},
  {favorecido:'Ramax Itariri',   categoria:'Receita MI', vcto:'29/12/2025', valor:2583.00,  status:'RECEBIDO'},
  {favorecido:'Ramax Itariri',   categoria:'Receita MI', vcto:'01/01/2026', valor:33600.00, status:'RECEBIDO'},
  {favorecido:'Ramax Itariri',   categoria:'Receita MI', vcto:'05/01/2026', valor:13750.00, status:'RECEBIDO'},
  {favorecido:'Ramax Itariri',   categoria:'Receita MI', vcto:'06/01/2026', valor:7243.72,  status:'RECEBIDO'},
  {favorecido:'Ramax Mato Grosso',categoria:'Receita ME',vcto:'08/03/2026', valor:22300.00, status:'ATRASADO'},
  {favorecido:'Ramax Rondon',    categoria:'Receita MI', vcto:'17/02/2026', valor:29000.00, status:'RECEBIDO'},
  {favorecido:'Ramax Rondon',    categoria:'Receita MI', vcto:'20/02/2026', valor:29000.00, status:'RECEBIDO'},
  {favorecido:'Ramax Rondon',    categoria:'Receita MI', vcto:'25/02/2026', valor:21700.00, status:'RECEBIDO'},
];

// ── STATE ─────────────────────────────────────────────────────────────────────
let activeTab  = 'CP';
let activeView = 'temp';
let level      = 'year';  // year | month | week | day
let context    = { year: null, month: null, week: null };
let mainChart  = null;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const LEVEL_ORDER = ['year','month','week','day'];
const LEVEL_NAMES = { year:'Anual', month:'Mensal', week:'Semanal', day:'Diário' };
const LEVEL_PILL  = { year:'anual', month:'mensal', week:'semanal', day:'diario' };

const parseDMY = s => { const [d,m,y]=s.split('/').map(Number); return new Date(y,m-1,d); };
const getYear  = d => parseDMY(d).getFullYear();
const getMonthKey = d => { const dt=parseDMY(d); return \`\${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][dt.getMonth()]}/\${String(dt.getFullYear()).slice(2)}\`; };
const getWeekKey  = d => {
  const dt = parseDMY(d);
  const jan1 = new Date(dt.getFullYear(),0,1);
  const wk = Math.ceil(((dt-jan1)/86400000 + jan1.getDay()+1)/7);
  return \`Sem \${wk}/\${String(dt.getFullYear()).slice(2)}\`;
};
const getDayKey = d => d; // already DD/MM/YYYY

function aggregate(data, keyFn) {
  const map = {};
  data.forEach(r => {
    const k = keyFn(r.vcto);
    if(!map[k]) map[k] = { cp:0, cr:0, total:0, avencer:0, atrasado:0, pago:0 };
    const v = r.valor;
    const isCR = CR_DATA.includes(r);
    if(isCR) map[k].cr += v; else map[k].cp += v;
    map[k].total += v;
    if(r.status==='A VENCER')               map[k].avencer  += v;
    else if(r.status==='ATRASADO')          map[k].atrasado += v;
    else                                    map[k].pago     += v;
  });
  return map;
}

function getContextData() {
  const both = [...CP_DATA.map(r=>({...r,_src:'CP'})), ...CR_DATA.map(r=>({...r,_src:'CR'}))];
  let filtered = both;

  if(level === 'month' && context.year)
    filtered = filtered.filter(r => getYear(r.vcto) === context.year);

  if(level === 'week' && context.year && context.month) {
    const mIdx = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].indexOf(context.month);
    filtered = filtered.filter(r => {
      const dt = parseDMY(r.vcto);
      return dt.getFullYear() === context.year && dt.getMonth() === mIdx;
    });
  }

  if(level === 'day' && context.week) {
    // same week key
    filtered = filtered.filter(r => getWeekKey(r.vcto) === context.week);
  }

  return filtered;
}

function getKeyFn() {
  if(level==='year')  return r => String(getYear(r));
  if(level==='month') return r => getMonthKey(r);
  if(level==='week')  return r => getWeekKey(r);
  return r => getDayKey(r);
}

function getSortedKeys(map) {
  return Object.keys(map).sort((a,b) => {
    if(level==='year')  return Number(a)-Number(b);
    if(level==='month') {
      const mo = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const pa = a.split('/'); const pb = b.split('/');
      return (+pa[1]*100 + mo.indexOf(pa[0])) - (+pb[1]*100 + mo.indexOf(pb[0]));
    }
    if(level==='week') {
      const pa=a.replace('Sem ','').split('/'); const pb=b.replace('Sem ','').split('/');
      return (+pa[1]*100 + +pa[0]) - (+pb[1]*100 + +pb[0]);
    }
    // day: DD/MM/YYYY
    const pa=a.split('/'); const pb=b.split('/');
    return (+pa[2]*10000 + +pa[1]*100 + +pa[0]) - (+pb[2]*10000 + +pb[1]*100 + +pb[0]);
  });
}

// ── RENDER CHART ──────────────────────────────────────────────────────────────
function renderChart() {
  const data     = getContextData();
  const keyFn    = getKeyFn();
  const cpData   = data.filter(r=>r._src==='CP');
  const crData   = data.filter(r=>r._src==='CR');

  const cpMap = aggregate(cpData, r => keyFn(r));
  const crMap = aggregate(crData, r => keyFn(r));
  const allKeys = [...new Set([...Object.keys(cpMap), ...Object.keys(crMap)])];
  const sorted  = getSortedKeys(Object.fromEntries(allKeys.map(k=>[k,1])));

  const cpVals  = sorted.map(k => cpMap[k]?.cp  || 0);
  const crVals  = sorted.map(k => crMap[k]?.cr   || 0);
  const balVals = sorted.map(k => (crMap[k]?.cr||0) - (cpMap[k]?.cp||0));

  const totalCP = cpVals.reduce((s,v)=>s+v,0);
  const totalCR = crVals.reduce((s,v)=>s+v,0);

  // Update header
  document.getElementById('chartTotal').textContent = fmtK(totalCP + totalCR);
  document.getElementById('chartLabel').textContent = \`Vencimentos — \${LEVEL_NAMES[level]}\`;
  document.getElementById('levelPill').textContent  = LEVEL_NAMES[level];
  document.getElementById('levelPill').className    = \`level-pill \${LEVEL_PILL[level]}\`;
  document.getElementById('btnUp').disabled         = level === 'year';
  document.getElementById('btnDown').disabled       = level === 'day';
  document.getElementById('drillHint').style.display = level === 'day' ? 'none' : 'block';

  // Ajusta altura dinamicamente
  const h = Math.max(300, sorted.length * 22 + 80);
  document.getElementById('chartWrap').style.height = h + 'px';

  // Legend
  document.getElementById('legendRow').innerHTML = \`
    <div class="leg"><div class="leg-dot" style="background:var(--red)"></div>A Pagar</div>
    <div class="leg"><div class="leg-dot" style="background:var(--green)"></div>A Receber</div>
    <div class="leg"><div class="leg-dot" style="background:rgba(56,189,248,0.4);border:1px dashed var(--blue)"></div>Saldo</div>\`;

  if(mainChart) { mainChart.destroy(); mainChart = null; }

  mainChart = new Chart(document.getElementById('mainChart'), {
    type: 'bar',
    data: {
      labels: sorted,
      datasets: [
        {
          label: 'A Pagar',
          data: cpVals,
          backgroundColor: 'rgba(248,113,113,0.18)',
          borderColor: '#F87171',
          borderWidth: 1.5,
          borderRadius: 4,
          borderSkipped: false,
          datalabels: {
            display: ctx2 => ctx2.dataset.data[ctx2.dataIndex] > 0,
            anchor: 'end', align: 'end', clamp: true,
            color: '#F87171',
            font: { family:'DM Mono', size:9 },
            formatter: (v, ctx2) => {
              const tot = (cpVals[ctx2.dataIndex]||0) + (crVals[ctx2.dataIndex]||0);
              const pct = tot > 0 ? (v/tot*100).toFixed(0) : 0;
              return \`\${fmtK(v)}  \${pct}%\`;
            },
          }
        },
        {
          label: 'A Receber',
          data: crVals,
          backgroundColor: 'rgba(52,211,153,0.18)',
          borderColor: '#34D399',
          borderWidth: 1.5,
          borderRadius: 4,
          borderSkipped: false,
          datalabels: {
            display: ctx2 => ctx2.dataset.data[ctx2.dataIndex] > 0,
            anchor: 'end', align: 'end', clamp: true,
            color: '#34D399',
            font: { family:'DM Mono', size:9 },
            formatter: (v, ctx2) => {
              const tot = (cpVals[ctx2.dataIndex]||0) + (crVals[ctx2.dataIndex]||0);
              const pct = tot > 0 ? (v/tot*100).toFixed(0) : 0;
              return \`\${fmtK(v)}  \${pct}%\`;
            },
          }
        },
        {
          type: 'line',
          label: 'Saldo',
          data: balVals,
          borderColor: 'rgba(56,189,248,0.6)',
          borderWidth: 1.5,
          borderDash: [4,3],
          pointRadius: balVals.map(v=>v!==0?4:0),
          pointBackgroundColor: balVals.map(v => v>=0?'#34D399':'#F87171'),
          fill: false,
          tension: 0.35,
          datalabels: {
            display: ctx2 => Math.abs(ctx2.dataset.data[ctx2.dataIndex]) > 0,
            anchor: 'start', align: 'start', clamp: true,
            color: ctx2 => balVals[ctx2.dataIndex] >= 0 ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)',
            font: { family:'DM Mono', size:9 },
            formatter: v => (v>=0?'+':'')+fmtK(v),
          }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (e, els) => {
        if(!els.length || level==='day') return;
        const idx = els[0].index;
        const key = sorted[idx];
        drillInto(key, cpVals[idx], crVals[idx], balVals[idx]);
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(5,9,26,0.95)',
          borderColor: 'rgba(255,255,255,0.08)', borderWidth:1,
          titleColor:'#94a3b8', padding:12,
          callbacks: {
            label: c => \`  \${c.dataset.label}: \${fmtK(c.raw)}\`
          }
        },
      },
      scales: {
        x: {
          grid: { display:false },
          ticks: { color:'#475569', font:{ size:10, family:'DM Mono' }, maxRotation:0 }
        },
        y: {
          grid: { color:'rgba(255,255,255,0.03)', drawBorder:false },
          border: { dash:[3,3] },
          ticks: { color:'#475569', font:{ size:9, family:'DM Mono' }, callback: v => fmtK(v) }
        }
      },
      animation: { duration:500, easing:'easeInOutQuart' },
      layout: { padding:{ top:28, right:100, bottom:4 } }
    }
  });

  updateBreadcrumb();
  updateSidePanel(sorted, cpVals, crVals, balVals);
}

function drillInto(key, cp, cr, bal) {
  const curIdx = LEVEL_ORDER.indexOf(level);
  if(curIdx >= LEVEL_ORDER.length-1) return;

  if(level==='year')  { context.year  = Number(key); }
  if(level==='month') { const p=key.split('/'); context.month=p[0]; context.year=2000+Number(p[1]); }
  if(level==='week')  { context.week  = key; }

  level = LEVEL_ORDER[curIdx+1];
  renderChart();
  updateSelectedInfo(key, cp, cr, bal);
}

function drillUp() {
  const curIdx = LEVEL_ORDER.indexOf(level);
  if(curIdx <= 0) return;
  level = LEVEL_ORDER[curIdx-1];
  if(level==='year')  { context = { year:null, month:null, week:null }; }
  if(level==='month') { context.month=null; context.week=null; }
  if(level==='week')  { context.week=null; }
  renderChart();
}

function drillDown() {
  const curIdx = LEVEL_ORDER.indexOf(level);
  if(curIdx >= LEVEL_ORDER.length-1) return;
  level = LEVEL_ORDER[curIdx+1];
  renderChart();
}

function updateBreadcrumb() {
  const bc = document.getElementById('breadcrumb');
  const parts = [];

  parts.push({ label:'Anual', level:'year', active: level==='year' });
  if(level !== 'year') {
    const y = context.year || '—';
    parts.push({ label: String(y), level:'month', active: level==='month' });
  }
  if(level==='week'||level==='day') {
    const mo = context.month ? \`\${context.month}/\${String(context.year).slice(2)}\` : '—';
    parts.push({ label: mo, level:'week', active: level==='week' });
  }
  if(level==='day') {
    parts.push({ label: context.week||'—', level:'day', active: true });
  }

  bc.innerHTML = parts.map((p,i) => \`
    \${i>0?'<span class="bc-sep">›</span>':''}
    <span class="bc-item\${p.active?' active':''}" onclick="jumpTo('\${p.level}')">\${p.label}</span>
  \`).join('');
}

function jumpTo(target) {
  if(LEVEL_ORDER.indexOf(target) >= LEVEL_ORDER.indexOf(level)) return;
  level = target;
  if(target==='year')  context = {year:null, month:null, week:null};
  if(target==='month') { context.month=null; context.week=null; }
  if(target==='week')  { context.week=null; }
  renderChart();
}

function updateSelectedInfo(key, cp, cr, bal) {
  document.getElementById('selPeriod').textContent = key;
  document.getElementById('selCP').textContent     = fmtK(cp);
  document.getElementById('selCR').textContent     = fmtK(cr);
  const el = document.getElementById('selBal');
  el.textContent = (bal>=0?'+':'')+fmtK(bal);
  el.style.color = bal>=0?'var(--green)':'var(--red)';
  document.getElementById('selLevel').textContent  = LEVEL_NAMES[level];
}

function updateSidePanel(keys, cpVals, crVals, balVals) {
  const maxV = Math.max(...cpVals, ...crVals, 1);

  // distribution
  document.getElementById('miniStatus').innerHTML = keys.map((k,i) => {
    const tot = cpVals[i]+crVals[i];
    const cpPct = tot>0?Math.round(cpVals[i]/tot*100):0;
    const crPct = 100-cpPct;
    return \`<div class="ms-row">
      <div class="ms-label"><span>\${k}</span><span>\${fmtK(tot)}</span></div>
      <div style="height:5px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;display:flex">
        <div style="width:\${cpPct}%;background:#F87171;opacity:0.7"></div>
        <div style="width:\${crPct}%;background:#34D399;opacity:0.7"></div>
      </div>
    </div>\`;
  }).join('');

  // status
  const allData = getContextData();
  const avencer  = allData.filter(r=>r.status==='A VENCER').reduce((s,r)=>s+r.valor,0);
  const atrasado = allData.filter(r=>r.status==='ATRASADO').reduce((s,r)=>s+r.valor,0);
  const pago     = allData.filter(r=>r.status==='PAGO'||r.status==='RECEBIDO').reduce((s,r)=>s+r.valor,0);
  const tot2     = avencer+atrasado+pago||1;
  document.getElementById('statusDist').innerHTML = [
    {label:'A Vencer', val:avencer, c:'var(--green)'},
    {label:'Atrasado', val:atrasado,c:'var(--red)'},
    {label:'Pago/Recebido',val:pago,c:'var(--muted)'},
  ].map(s=>\`<div class="ms-row">
    <div class="ms-label"><span style="color:var(--muted)">\${s.label}</span><span>\${fmtK(s.val)}  \${Math.round(s.val/tot2*100)}%</span></div>
    <div class="ms-bar"><div class="ms-fill" style="width:\${Math.round(s.val/tot2*100)}%;background:\${s.c}"></div></div>
  </div>\`).join('');

  // default selected info
  const totalCP = cpVals.reduce((s,v)=>s+v,0);
  const totalCR = crVals.reduce((s,v)=>s+v,0);
  const bal     = totalCR - totalCP;
  document.getElementById('selPeriod').textContent = 'Período completo';
  document.getElementById('selCP').textContent     = fmtK(totalCP);
  document.getElementById('selCR').textContent     = fmtK(totalCR);
  const el = document.getElementById('selBal');
  el.textContent = (bal>=0?'+':'')+fmtK(bal);
  el.style.color = bal>=0?'var(--green)':'var(--red)';
  document.getElementById('selLevel').textContent  = LEVEL_NAMES[level];
}

// ── TABS & VIEW ───────────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  const isCP = tab==='CP';
  document.getElementById('tabCP').classList.toggle('active',isCP);
  document.getElementById('tabCR').classList.toggle('active',!isCP);
  document.getElementById('tabCP').style.borderBottomColor = isCP?'var(--red)':'transparent';
  document.getElementById('tabCR').style.borderBottomColor = !isCP?'var(--green)':'transparent';
  renderKPIs();
}

function switchView(view) {
  activeView = view;
  ['lanc','repr','temp'].forEach(v => {
    document.getElementById('view'+v.charAt(0).toUpperCase()+v.slice(1))?.classList.toggle('active', v===view);
    document.getElementById('vt'+v.charAt(0).toUpperCase()+v.slice(1))?.classList.toggle('active', v===view);
  });
  if(view==='temp') renderChart();
}

function renderKPIs() {
  const data    = activeTab==='CP' ? CP_DATA : CR_DATA;
  const isCP    = activeTab==='CP';
  const avencer = data.filter(r=>r.status==='A VENCER').reduce((s,r)=>s+r.valor,0);
  const atrasado= data.filter(r=>r.status==='ATRASADO').reduce((s,r)=>s+r.valor,0);
  const pmDays  = isCP ? 24.67 : 19.7;
  document.getElementById('kpiStrip').innerHTML = \`
    <div class="kpi"><div class="kpi-glow" style="background:\${isCP?'var(--red)':'var(--green)'}"></div>
      <div class="kpi-label">\${isCP?'Total a Pagar':'Total a Receber'}</div>
      <div class="kpi-num \${isCP?'r':'g'}">\${fmtK(avencer+atrasado)}</div><div class="kpi-sub">Em aberto</div></div>
    <div class="kpi"><div class="kpi-glow" style="background:var(--amber)"></div>
      <div class="kpi-label">A Vencer</div><div class="kpi-num w">\${fmtK(avencer)}</div><div class="kpi-sub">Dentro do prazo</div></div>
    <div class="kpi"><div class="kpi-glow" style="background:var(--red)"></div>
      <div class="kpi-label">Atrasado</div><div class="kpi-num \${atrasado>0?'r':'w'}">\${fmtK(atrasado)}</div>
      <div class="kpi-sub">\${atrasado>0?'Atenção necessária':'Nenhum em atraso'}</div></div>
    <div class="kpi"><div class="kpi-glow" style="background:var(--muted)"></div>
      <div class="kpi-label">Prazo Médio</div><div class="kpi-num w">\${pmDays} dias</div>
      <div class="kpi-sub">\${isCP?'Pagamento':'Recebimento'}</div></div>\`;
  document.getElementById('cntCP').textContent = CP_DATA.filter(r=>r.status==='A VENCER'||r.status==='ATRASADO').length;
  document.getElementById('cntCR').textContent = CR_DATA.filter(r=>r.status==='A VENCER'||r.status==='ATRASADO').length;
}

// ── INIT ─────────────────────────────────────────────────────────────────────
renderKPIs();
renderChart();
</script>
`
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'width:100%;height:calc(100vh - 0px);border:none;display:block'
    iframe.srcdoc = html
    ref.current.innerHTML = ''
    ref.current.appendChild(iframe)
  }, [])

  return <div ref={ref} style={{ width:'100%', height:'100vh' }} />
}
