'use client'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function CaixaPage() {
  const ref = useRef<HTMLDivElement>(null)
  const { token, empresaAtiva } = useAuthStore()

  useEffect(() => {
    if (!ref.current) return

    const empresaId = empresaAtiva?.id || 1
    const empresaNome = empresaAtiva?.nome || 'Empresa'
    const apiUrl = window.location.origin + '/api/proxy'

    const html = `<!DOCTYPE html>
<html>
<head>
<link rel="stylesheet" href="https://unpkg.com/@fontsource/dm-mono@4.5.14/index.css">
<link rel="stylesheet" href="https://unpkg.com/@fontsource/plus-jakarta-sans@8.0.0/index.css">
<style>
:root{--bg:#05091A;--surface:rgba(255,255,255,0.034);--border:rgba(255,255,255,0.07);--blue:#38BDF8;--green:#34D399;--red:#F87171;--amber:#FBBF24;--orange:#FB923C;--purple:#C084FC;--text:#F1F5F9;--muted:#64748B;}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);font-family:'Plus Jakarta Sans',sans-serif;color:var(--text);background-image:linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px);background-size:48px 48px;}
.period-pill{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:4px 10px;font-size:10px;font-family:'DM Mono',monospace}
.fsel{background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:10px;padding:4px 8px;border-radius:7px;font-family:inherit}
.fsel option{background:#0f172a}
.drill-btn{padding:3px 9px;border-radius:5px;font-size:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#94A3B8;cursor:pointer;font-family:inherit;transition:all .15s}
.drill-btn:hover{background:rgba(56,189,248,.1);color:#38BDF8;border-color:#38BDF8}
.drill-btn.active{background:rgba(56,189,248,.15);color:#38BDF8;border-color:#38BDF8}
.kpi-strip{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--border)}
.kpi{padding:12px 20px;border-right:1px solid var(--border);position:relative;overflow:hidden;cursor:default;transition:background 0.2s}
.kpi:last-child{border-right:none}
.kpi:hover{background:rgba(255,255,255,0.015)}
.kpi-glow{position:absolute;bottom:0;left:0;right:0;height:1.5px;opacity:0;transition:opacity 0.3s}
.kpi:hover .kpi-glow{opacity:1}
.kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:5px}
.kpi-num{font-family:'DM Mono',monospace;font-size:18px;font-weight:400}
.kpi-num.g{color:var(--green)}.kpi-num.r{color:var(--red)}.kpi-num.w{color:#fff}.kpi-num.b{color:var(--blue)}
.kpi-sub{font-size:9px;color:var(--muted);margin-top:2px}
.body{display:grid;grid-template-columns:1fr 220px;height:calc(100vh - 118px)}
.charts-col{padding:14px 18px;overflow-y:auto;border-right:1px solid var(--border)}
.drill-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.drill-left{display:flex;align-items:center;gap:8px}
.drill-title{font-size:10px;font-weight:600;color:var(--text)}
.breadcrumb{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--muted);font-family:'DM Mono',monospace}
.bc-item{cursor:pointer;transition:color .15s}.bc-item:hover{color:var(--blue)}.bc-item.active{color:var(--blue)}
.bc-sep{opacity:.4}
.level-pill{padding:3px 9px;border-radius:5px;font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.5px;border:1px solid var(--border);color:var(--muted)}
.level-pill.monthly{border-color:rgba(56,189,248,.4);color:var(--blue);background:rgba(56,189,248,.06)}
.level-pill.weekly{border-color:rgba(52,211,153,.4);color:var(--green);background:rgba(52,211,153,.06)}
.level-pill.quarterly{border-color:rgba(251,191,36,.4);color:var(--amber);background:rgba(251,191,36,.06)}
.top-row{display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:10px}
.cc{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:12px;transition:border-color .2s;position:relative;overflow:hidden}
.cc:hover{border-color:rgba(56,189,248,.18)}
.cc-shine{position:absolute;top:0;left:0;right:0;height:1px;opacity:0;transition:opacity .3s}
.cc:hover .cc-shine{opacity:1}
.cc-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px}
.cc-title{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted)}
.cc-kpi{font-family:'DM Mono',monospace;font-size:15px;text-align:right;color:#fff}
.cc-kpi-sub{font-size:9px;color:var(--muted);text-align:right;margin-top:1px}
.h-lg{position:relative;height:140px}
.h-sm{position:relative;height:100px}
.charts-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.click-hint{font-size:8px;color:rgba(100,116,139,.5);text-align:center;margin-top:3px;letter-spacing:.3px}
.concil-big{font-family:'DM Mono',monospace;font-size:26px;color:#fff;line-height:1;margin:4px 0 2px}
.concil-label{font-size:9px;color:var(--muted);margin-bottom:8px}
.pbar{height:3px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden;margin-bottom:10px}
.pbar-fill{height:100%;border-radius:99px;transition:width 1s cubic-bezier(.4,0,.2,1)}
.concil-stats{display:flex;flex-direction:column;gap:5px}
.cs-row{display:flex;align-items:center;justify-content:space-between;font-size:10px}
.cs-left{display:flex;align-items:center;gap:5px;color:var(--muted)}
.cs-dot{width:5px;height:5px;border-radius:50%}
.cs-val{font-family:'DM Mono',monospace;font-size:10px;color:#fff}
.res-card{background:linear-gradient(135deg,rgba(52,211,153,.07),rgba(56,189,248,.04));border:1px solid rgba(52,211,153,.18);border-radius:11px;padding:12px}
.res-big{font-family:'DM Mono',monospace;font-size:22px;color:var(--green);line-height:1;margin:5px 0 2px}
.res-pct{font-size:9px;color:rgba(52,211,153,.6);margin-bottom:10px}
.res-row{display:flex;justify-content:space-between;font-size:10px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.res-row:last-child{border-bottom:none}
.res-name{color:var(--muted)}
.res-val{font-family:'DM Mono',monospace;font-size:10px}
.dre-col{padding:14px 12px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
.dre-title-label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:12px}
.di{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);cursor:default;transition:padding-left .15s}
.di:last-child{border-bottom:none}
.di:hover{padding-left:3px}
.di-l{display:flex;align-items:center;gap:5px}
.di-dot{width:4px;height:4px;border-radius:50%}
.di-name{font-size:10px;color:var(--muted)}
.di:hover .di-name{color:var(--text)}
.di-r{text-align:right}
.di-val{font-family:'DM Mono',monospace;font-size:10px;color:#fff}
.di-val.neg{color:var(--red)}
.di-pct{font-size:9px;color:var(--muted);margin-top:1px}
.di-bar{height:1.5px;background:rgba(255,255,255,.05);border-radius:1px;margin-top:3px;overflow:hidden}
.di-bar-inner{height:100%;border-radius:1px;transition:width .7s ease}
.loading-overlay{display:flex;align-items:center;justify-content:center;height:200px;gap:10px;color:var(--muted);font-size:11px}
.spinner{width:14px;height:14px;border:2px solid rgba(56,189,248,.2);border-top-color:#38BDF8;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.kpi{animation:fadeUp .35s ease both}
.kpi:nth-child(1){animation-delay:.04s}.kpi:nth-child(2){animation-delay:.08s}
.kpi:nth-child(3){animation-delay:.12s}.kpi:nth-child(4){animation-delay:.16s}.kpi:nth-child(5){animation-delay:.20s}
</style>
</head>
<body>

<div class="toolbar" style="display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:8px 20px;border-bottom:1px solid var(--border);background:rgba(5,9,26,0.97)">
    <button class="drill-btn active" id="btnQ" onclick="setLevel('quarterly')">Trimestral</button>
    <button class="drill-btn" id="btnM" onclick="setLevel('monthly')">Mensal</button>
    <button class="drill-btn" id="btnW" onclick="setLevel('weekly')">Semanal</button>
    <div class="period-pill" id="periodPill">Carregando...</div>
    <select class="fsel" id="anoSel" onchange="changeAno(this.value)">
      <option value="2026">2026</option>
      <option value="2025">2025</option>
    </select>
</div>

<div class="kpi-strip">
  <div class="kpi"><div class="kpi-glow" style="background:var(--blue)"></div>
    <div class="kpi-label">Saldo Inicial</div><div class="kpi-num w" id="kSI">—</div><div class="kpi-sub">Base do período</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Entradas</div><div class="kpi-num g" id="kEnt">—</div><div class="kpi-sub">Receitas realizadas</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--red)"></div>
    <div class="kpi-label">Saídas</div><div class="kpi-num r" id="kSai">—</div><div class="kpi-sub">Custos + despesas</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Saldo Final</div><div class="kpi-num" id="kSF">—</div><div class="kpi-sub">Posição atual</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Balanço</div><div class="kpi-num" id="kBal">—</div><div class="kpi-sub">Resultado líquido</div></div>
</div>

<div class="body">
  <div class="charts-col">
    <div class="drill-bar">
      <div class="drill-left">
        <span class="drill-title">Granularidade</span>
        <div class="breadcrumb" id="breadcrumb"></div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="level-pill monthly" id="levelPill">Mensal</span>
        <button class="drill-btn" id="btnUp" onclick="drillUp()">▲ Drill Up</button>
        <button class="drill-btn" id="btnDown" onclick="drillDown()">▼ Drill Down</button>
      </div>
    </div>

    <div id="chartsArea">
      <div class="loading-overlay"><div class="spinner"></div>Carregando dados da Omie...</div>
    </div>
  </div>

  <div class="dre-col">
    <div class="dre-title-label">DRE Realizado</div>
    <div id="dreList"><div class="loading-overlay"><div class="spinner"></div></div></div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js"></script>
<script>
Chart.register(ChartDataLabels);

const API = '${apiUrl}';
const EMPRESA = ${empresaId};
const TOKEN = '${token}';

const fmt = v => Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK = v => {if(!v||v===0)return'—';const a=Math.abs(v);const s=v<0?'−':'';return s+(a>=1e6?(a/1e6).toFixed(1)+'M':a>=1e3?(a/1e3).toFixed(1)+'K':a.toFixed(2));};

let RAW = [];
let currentLevel = 'monthly';
let selectedPeriod = null;
let currentAno = 2026;
let charts = {};

// ── FETCH ─────────────────────────────────────────────────────────────────────
async function fetchData(ano) {
  const dtIni = '01/01/' + ano;
  const dtFim = '31/12/' + ano;
  const res = await fetch(
    API + '/empresas/' + EMPRESA + '/extrato?data_inicio=' + dtIni + '&data_fim=' + dtFim,
    { headers: { Authorization: 'Bearer ' + TOKEN } }
  );
  return await res.json();
}

// ── AGREGA POR PERÍODO ────────────────────────────────────────────────────────
function agregaPorPeriodo(lancamentos, nivel, filtroMes) {
  const map = {};

  lancamentos.forEach(r => {
    const dt = r.data_lancamento || '';
    if (!dt) return;
    const parts = dt.split('/');
    if (parts.length < 3) return;
    const [dd, mm, yyyy] = parts;
    const anoLanc = parseInt(yyyy);
    const mesLanc = parseInt(mm);
    const diaLanc = parseInt(dd);

    let key;
    if (nivel === 'quarterly') {
      const q = Math.ceil(mesLanc / 3);
      key = 'Q' + q + '/' + String(anoLanc).slice(2);
    } else if (nivel === 'monthly') {
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      key = meses[mesLanc-1] + '/' + String(anoLanc).slice(2);
    } else if (nivel === 'weekly' && filtroMes) {
      const [mNome, ano2] = filtroMes.split('/');
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const mIdx = meses.indexOf(mNome) + 1;
      if (mesLanc !== mIdx) return;
      const semana = Math.ceil(diaLanc / 7);
      key = 'Sem ' + semana + '·' + filtroMes;
    }
    if (!key) return;
    if (!map[key]) map[key] = { ent: 0, sai: 0, concil: 0, total: 0 };
    map[key].ent  += r.valor > 0 ? r.valor : 0;
    map[key].sai  += r.valor < 0 ? Math.abs(r.valor) : 0;
    if (r.conciliado) map[key].concil++;
    map[key].total++;
  });

  return map;
}

// ── BUILD CHARTS ──────────────────────────────────────────────────────────────
function buildCharts(data) {
  const map = agregaPorPeriodo(RAW, currentLevel, selectedPeriod);
  
  // Ordena as labels
  const labels = Object.keys(map).sort((a, b) => {
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const parseKey = k => {
      if (k.startsWith('Q')) {
        const [q, ano] = k.split('/');
        return parseInt(ano) * 10 + parseInt(q[1]);
      }
      if (k.startsWith('Sem')) {
        const parts = k.split('·');
        const sem = parseInt(parts[0].replace('Sem ',''));
        const [m, ano] = parts[1].split('/');
        return parseInt(ano) * 1000 + meses.indexOf(m) * 10 + sem;
      }
      const [m, ano] = k.split('/');
      return parseInt(ano) * 100 + meses.indexOf(m);
    };
    return parseKey(a) - parseKey(b);
  });

  const entradas = labels.map(l => map[l].ent);
  const saidas   = labels.map(l => map[l].sai);
  const saldos   = labels.map((l, i) => {
    const cumEnt = entradas.slice(0, i+1).reduce((s,v)=>s+v,0);
    const cumSai = saidas.slice(0, i+1).reduce((s,v)=>s+v,0);
    return cumEnt - cumSai;
  });

  const totEnt = entradas.reduce((s,v)=>s+v,0);
  const totSai = saidas.reduce((s,v)=>s+v,0);
  const totConcil = Object.values(map).reduce((s,v)=>s+v.concil,0);
  const totTotal  = Object.values(map).reduce((s,v)=>s+v.total,0);
  const pctConcil = totTotal > 0 ? Math.round(totConcil/totTotal*100) : 0;
  const saldoFinal = totEnt - totSai;

  // Atualiza KPIs
  document.getElementById('kSI').textContent = '0,00';
  document.getElementById('kEnt').textContent = fmtK(totEnt);
  document.getElementById('kSai').textContent = fmtK(totSai);
  const sfEl = document.getElementById('kSF');
  sfEl.textContent = fmtK(saldoFinal);
  sfEl.className = 'kpi-num ' + (saldoFinal >= 0 ? 'g' : 'r');
  const balEl = document.getElementById('kBal');
  balEl.textContent = fmtK(saldoFinal);
  balEl.className = 'kpi-num ' + (saldoFinal >= 0 ? 'g' : 'r');
  document.getElementById('periodPill').textContent = labels[0] + ' → ' + labels[labels.length-1];

  // Destrói charts antigos
  Object.values(charts).forEach(c => c.destroy());
  charts = {};

  document.getElementById('chartsArea').innerHTML = \`
    <div class="top-row">
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--blue),transparent)"></div>
        <div class="cc-head">
          <div class="cc-title" style="color:var(--blue)">Receita Bruta (Entradas)</div>
          <div><div class="cc-kpi" id="kRB">\${fmtK(totEnt)}</div><div class="cc-kpi-sub">Total período</div></div>
        </div>
        <div class="h-lg"><canvas id="cRB"></canvas></div>
        \${currentLevel==='monthly'?'<div class="click-hint">clique em uma barra para detalhar ▼</div>':''}
      </div>
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--green),transparent)"></div>
        <div class="cc-head"><div class="cc-title" style="color:var(--green)">Conciliação</div></div>
        <div class="concil-big" id="pbarPct">\${pctConcil}%</div>
        <div class="concil-label">dos lançamentos conciliados</div>
        <div class="pbar"><div class="pbar-fill" id="pbarFill" style="width:0%;background:var(--green)"></div></div>
        <div class="concil-stats">
          <div class="cs-row"><div class="cs-left"><div class="cs-dot" style="background:var(--green)"></div>Conciliados</div><span class="cs-val">\${totConcil}</span></div>
          <div class="cs-row"><div class="cs-left"><div class="cs-dot" style="background:var(--amber)"></div>Pendentes</div><span class="cs-val" style="color:var(--amber)">\${totTotal-totConcil}</span></div>
          <div class="cs-row" style="border-top:1px solid var(--border);padding-top:5px;margin-top:2px">
            <div class="cs-left"><div class="cs-dot" style="background:var(--muted)"></div>Total</div><span class="cs-val">\${totTotal}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="charts-grid">
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--red),transparent)"></div>
        <div class="cc-head"><div class="cc-title" style="color:var(--red)">Saídas</div><div><div class="cc-kpi" style="color:var(--red)">\${fmtK(totSai)}</div></div></div>
        <div class="h-sm"><canvas id="cSai"></canvas></div>
      </div>
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--blue),transparent)"></div>
        <div class="cc-head"><div class="cc-title" style="color:var(--blue)">Saldo Acumulado</div><div><div class="cc-kpi" style="color:\${saldoFinal>=0?'var(--green)':'var(--red)'}">\${fmtK(saldoFinal)}</div></div></div>
        <div class="h-sm"><canvas id="cSaldo"></canvas></div>
      </div>
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--green),transparent)"></div>
        <div class="cc-head"><div class="cc-title" style="color:var(--green)">Entradas × Saídas</div></div>
        <div class="h-sm"><canvas id="cComp"></canvas></div>
      </div>
      <div class="cc" style="grid-column:1/-1">
        <div class="cc-title" style="color:rgba(52,211,153,.7)">Resultado do Período</div>
        <div class="res-big">\${fmtK(Math.abs(saldoFinal))}</div>
        <div class="res-pct">\${saldoFinal>=0?'Resultado positivo':'Resultado negativo'} — \${(Math.abs(saldoFinal)/Math.max(totEnt,1)*100).toFixed(1)}% sobre entradas</div>
        <div style="display:flex;flex-direction:column;gap:0">
          <div class="res-row"><span class="res-name">Total entradas</span><span class="res-val" style="color:var(--green)">+\${fmtK(totEnt)}</span></div>
          <div class="res-row"><span class="res-name">Total saídas</span><span class="res-val" style="color:var(--red)">−\${fmtK(totSai)}</span></div>
          <div class="res-row" style="border-top:1px solid rgba(52,211,153,.2)!important">
            <span class="res-name" style="color:var(--text);font-weight:600">= Saldo final</span>
            <span class="res-val" style="color:\${saldoFinal>=0?'var(--green)':'var(--red)'};\font-weight:700">\${saldoFinal>=0?'+':''}\${fmtK(saldoFinal)}</span>
          </div>
        </div>
      </div>
    </div>\`;

  setTimeout(() => { document.getElementById('pbarFill').style.width = pctConcil + '%'; }, 300);

  const opts = (color, isLine=false) => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{display:false},
      datalabels:{
        display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
        color, font:{family:'DM Mono',size:9},
        anchor:'end', align:'end', offset:2,
        formatter: v => fmtK(v), clip:false
      },
      tooltip:{
        backgroundColor:'rgba(5,9,26,.95)',borderColor:'rgba(255,255,255,.08)',borderWidth:1,
        titleColor:'#64748b',bodyColor:color,padding:10,
        callbacks:{label:c=>fmtK(c.raw)}
      }
    },
    scales:{
      x:{grid:{display:false},ticks:{color:'#475569',font:{size:9,family:'DM Mono'},maxRotation:0,autoSkip:true,maxTicksLimit:8}},
      y:{display:false}
    },
    animation:{duration:450,easing:'easeInOutQuart'},
    layout:{padding:{top:22}}
  });

  const mkBar = (id, data, color, clickFn) => {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    const c = new Chart(ctx, {
      type:'bar',
      data:{labels, datasets:[{
        data, backgroundColor:data.map(v=>v>0?color+'22':'transparent'),
        borderColor:data.map(v=>v>0?color:'transparent'),
        borderWidth:1.5, borderRadius:5, borderSkipped:false,
        datalabels:{
          display:ctx2=>ctx2.dataset.data[ctx2.dataIndex]>0,
          color, font:{family:'DM Mono',size:9},
          anchor:'end',align:'end',offset:2,
          formatter:v=>fmtK(v),clip:false
        }
      }]},
      options:{...opts(color), onClick:(e,els)=>{ if(els.length && clickFn) clickFn(labels[els[0].index]); }}
    });
    charts[id] = c;
  };

  mkBar('cRB', entradas, '#38BDF8', currentLevel==='monthly'? l => drillDownTo(l) : null);
  mkBar('cSai', saidas, '#F87171', null);

  // Saldo acumulado — linha
  const ctxSaldo = document.getElementById('cSaldo');
  if (ctxSaldo) {
    charts['cSaldo'] = new Chart(ctxSaldo, {
      type:'line',
      data:{labels, datasets:[{
        data:saldos,
        borderColor: saldoFinal>=0?'#34D399':'#F87171',
        borderWidth:2, pointRadius:3,
        pointBackgroundColor: saldoFinal>=0?'#34D399':'#F87171',
        fill:true, backgroundColor: saldoFinal>=0?'rgba(52,211,153,.06)':'rgba(248,113,113,.06)',
        tension:.35,
        datalabels:{display:false}
      }]},
      options:{...opts(saldoFinal>=0?'#34D399':'#F87171',true),
        plugins:{...opts(saldoFinal>=0?'#34D399':'#F87171',true).plugins,
          datalabels:{display:false}}}
    });
  }

  // Comparativo Entradas × Saídas
  const ctxComp = document.getElementById('cComp');
  if (ctxComp) {
    charts['cComp'] = new Chart(ctxComp, {
      type:'bar',
      data:{labels, datasets:[
        {label:'Entradas',data:entradas,backgroundColor:'rgba(52,211,153,.25)',borderColor:'#34D399',borderWidth:1.5,borderRadius:4,datalabels:{display:false}},
        {label:'Saídas',  data:saidas,  backgroundColor:'rgba(248,113,113,.25)',borderColor:'#F87171',borderWidth:1.5,borderRadius:4,datalabels:{display:false}}
      ]},
      options:{...opts('#34D399'),
        plugins:{...opts('#34D399').plugins,
          legend:{display:true,position:'bottom',labels:{color:'#64748B',font:{size:9},boxWidth:10,padding:10}},
          datalabels:{display:false}}}
    });
  }

  // DRE
  buildDRE(totEnt, totSai, pctConcil);
}

function buildDRE(ent, sai, pctConcil) {
  const dre = [
    {name:'Entradas',   val:ent,         pct:100,             c:'#38BDF8', neg:false},
    {name:'Saídas',     val:sai,         pct:sai/Math.max(ent,1)*100,  c:'#F87171', neg:false},
    {name:'Saldo',      val:ent-sai,     pct:(ent-sai)/Math.max(ent,1)*100, c:ent-sai>=0?'#34D399':'#F87171', neg:ent-sai<0},
    {name:'Conciliados', val:pctConcil,  pct:pctConcil,       c:'#34D399', neg:false, isPct:true},
  ];

  document.getElementById('dreList').innerHTML = dre.map((d,i) => \`
    <div class="di" style="animation:fadeUp .3s \${i*.04}s both ease">
      <div class="di-l"><div class="di-dot" style="background:\${d.c}"></div><span class="di-name">\${d.name}</span></div>
      <div class="di-r">
        <div class="di-val\${d.neg?' neg':''}">\${d.isPct ? d.val+'%' : (d.neg?'−':'') + fmtK(Math.abs(d.val))}</div>
        \${!d.isPct?'<div class="di-pct\${d.neg?" neg":""}">' + Math.abs(d.pct).toFixed(1)+'%</div>':''}
      </div>
    </div>
    <div class="di-bar"><div class="di-bar-inner" style="width:\${Math.min(Math.abs(d.pct),100)}%;background:\${d.c};opacity:.55"></div></div>
  \`).join('');
}

// ── DRILL ─────────────────────────────────────────────────────────────────────
function setLevel(l) {
  currentLevel = l; selectedPeriod = null;
  ['btnQ','btnM','btnW'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById(l==='quarterly'?'btnQ':l==='monthly'?'btnM':'btnW').classList.add('active');
  updateUI(); buildCharts();
}

function drillDown() {
  if (currentLevel==='quarterly') { currentLevel='monthly'; selectedPeriod=null; }
  else if (currentLevel==='monthly') { currentLevel='weekly'; }
  updateUI(); buildCharts();
}

function drillUp() {
  if (currentLevel==='weekly') { currentLevel='monthly'; selectedPeriod=null; }
  else if (currentLevel==='monthly') { currentLevel='quarterly'; selectedPeriod=null; }
  updateUI(); buildCharts();
}

function drillDownTo(label) {
  currentLevel='weekly'; selectedPeriod=label;
  updateUI(); buildCharts();
}

function updateUI() {
  const names = {quarterly:'Trimestral',monthly:'Mensal',weekly:'Semanal'};
  const cls   = {quarterly:'quarterly', monthly:'monthly', weekly:'weekly'};
  const pill  = document.getElementById('levelPill');
  pill.textContent = names[currentLevel] + (selectedPeriod?' · '+selectedPeriod:'');
  pill.className = 'level-pill '+cls[currentLevel];
  document.getElementById('btnUp').disabled   = currentLevel==='quarterly';
  document.getElementById('btnDown').disabled = currentLevel==='weekly';

  const bc = document.getElementById('breadcrumb');
  if (currentLevel==='quarterly') {
    bc.innerHTML = '<span class="bc-item active">Trimestral</span>';
  } else if (currentLevel==='monthly') {
    bc.innerHTML = '<span class="bc-item" onclick="setLevel(\'quarterly\')">Trimestral</span><span class="bc-sep">›</span><span class="bc-item active">Mensal</span>';
  } else {
    bc.innerHTML = '<span class="bc-item" onclick="setLevel(\'quarterly\')">Trimestral</span><span class="bc-sep">›</span><span class="bc-item" onclick="setLevel(\'monthly\')">Mensal</span><span class="bc-sep">›</span><span class="bc-item active">' + (selectedPeriod||'Semanal') + '</span>';
  }
}

async function changeAno(ano) {
  currentAno = parseInt(ano);
  document.getElementById('chartsArea').innerHTML = '<div class="loading-overlay"><div class="spinner"></div>Carregando...</div>';
  RAW = await fetchData(ano);
  normalizeRAW();
  buildCharts();
}

function normalizeRAW() {
  RAW = RAW.map(r => ({
    ...r,
    valor: r.valor !== undefined ? r.valor :
           (r.nValorEntrada || 0) - (r.nValorSaida || 0),
    data_lancamento: r.data_lancamento || r.dDataLancamento || '',
    conciliado: r.conciliado !== undefined ? r.conciliado :
                (r.lLancConciliado === 'S' || r.conciliado === true),
  }));
}

// ── INIT ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    RAW = await fetchData(currentAno);
    normalizeRAW();
    updateUI();
    buildCharts();
  } catch(e) {
    document.getElementById('chartsArea').innerHTML = '<div class="loading-overlay" style="color:var(--red)">Erro ao carregar: ' + e.message + '</div>';
  }
})();
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
