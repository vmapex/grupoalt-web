"use client"
import { useEffect, useRef } from 'react'

export default function CaixaPage() {
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
.ntab:hover{color:var(--text)}
.ntab.active{background:rgba(56,189,248,0.12);color:var(--blue);font-weight:600}
.nav-right{display:flex;align-items:center;gap:8px}
.period-pill{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:5px 11px;font-size:10px;font-family:'DM Mono',monospace;color:var(--muted)}
.period-pill b{color:var(--text);font-weight:500}
.emp-sel{background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:10px;padding:5px 10px;border-radius:7px;font-family:inherit}
.emp-sel option{background:#0f172a}
.kpi-strip{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--border)}
.kpi{padding:14px 22px;border-right:1px solid var(--border);position:relative;overflow:hidden;cursor:default;transition:background 0.2s}
.kpi:last-child{border-right:none}
.kpi:hover{background:rgba(255,255,255,0.015)}
.kpi-glow{position:absolute;bottom:0;left:0;right:0;height:1.5px;opacity:0;transition:opacity 0.3s}
.kpi:hover .kpi-glow{opacity:1}
.kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:6px}
.kpi-num{font-family:'DM Mono',monospace;font-size:20px;font-weight:400}
.kpi-num.g{color:var(--green)}.kpi-num.r{color:var(--red)}.kpi-num.w{color:#fff}
.kpi-sub{font-size:9px;color:var(--muted);margin-top:2px}
.body{display:grid;grid-template-columns:1fr 252px;gap:0}
.charts-col{padding:18px 22px;border-right:1px solid var(--border)}
.dre-col{padding:18px 16px}
.drill-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.drill-left{display:flex;align-items:center;gap:10px}
.drill-title{font-size:11px;font-weight:600;color:var(--text)}
.breadcrumb{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted);font-family:'DM Mono',monospace}
.bc-sep{opacity:0.4}
.bc-item{cursor:pointer;transition:color 0.15s}
.bc-item:hover{color:var(--blue)}
.bc-item.active{color:var(--blue)}
.drill-btns{display:flex;align-items:center;gap:6px}
.dbtn{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:7px;font-size:10px;border:1px solid var(--border);background:var(--surface);color:var(--muted);cursor:pointer;font-family:inherit;transition:all 0.2s}
.dbtn:hover:not(:disabled){border-color:rgba(56,189,248,0.4);color:var(--blue);background:rgba(56,189,248,0.06)}
.dbtn:disabled{opacity:0.25;cursor:not-allowed}
.level-pill{padding:4px 10px;border-radius:6px;font-size:9px;font-family:'DM Mono',monospace;letter-spacing:0.5px;border:1px solid var(--border);color:var(--muted)}
.level-pill.quarterly{border-color:rgba(251,191,36,0.4);color:var(--amber);background:rgba(251,191,36,0.06)}
.level-pill.monthly{border-color:rgba(56,189,248,0.4);color:var(--blue);background:rgba(56,189,248,0.06)}
.level-pill.weekly{border-color:rgba(52,211,153,0.4);color:var(--green);background:rgba(52,211,153,0.06)}
.top-row{display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:10px}
.cc{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;transition:border-color 0.2s;position:relative;overflow:hidden}
.cc:hover{border-color:rgba(56,189,248,0.18)}
.cc-shine{position:absolute;top:0;left:0;right:0;height:1px;opacity:0;transition:opacity 0.3s}
.cc:hover .cc-shine{opacity:1}
.cc-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px}
.cc-title{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted)}
.cc-kpi{font-family:'DM Mono',monospace;font-size:16px;text-align:right;color:#fff}
.cc-kpi-sub{font-size:9px;color:var(--muted);text-align:right;margin-top:1px}
.h-lg{position:relative;height:150px}
.h-sm{position:relative;height:108px}
.charts-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.click-hint{font-size:8px;color:rgba(100,116,139,0.5);text-align:center;margin-top:4px;letter-spacing:0.3px}
.concil-big{font-family:'DM Mono',monospace;font-size:28px;color:#fff;line-height:1;margin:5px 0 2px}
.concil-label{font-size:9px;color:var(--muted);margin-bottom:10px}
.pbar{height:3px;background:rgba(255,255,255,0.07);border-radius:99px;overflow:hidden;margin-bottom:12px}
.pbar-fill{height:100%;border-radius:99px;transition:width 1s cubic-bezier(.4,0,.2,1)}
.concil-stats{display:flex;flex-direction:column;gap:6px}
.cs-row{display:flex;align-items:center;justify-content:space-between;font-size:10px}
.cs-left{display:flex;align-items:center;gap:5px;color:var(--muted)}
.cs-dot{width:5px;height:5px;border-radius:50%}
.cs-val{font-family:'DM Mono',monospace;font-size:10px;color:#fff}
.res-card{background:linear-gradient(135deg,rgba(52,211,153,0.07),rgba(56,189,248,0.04));border:1px solid rgba(52,211,153,0.18);border-radius:12px;padding:14px}
.res-big{font-family:'DM Mono',monospace;font-size:24px;color:var(--green);line-height:1;margin:6px 0 2px}
.res-pct{font-size:9px;color:rgba(52,211,153,0.6);margin-bottom:12px}
.res-row{display:flex;justify-content:space-between;font-size:10px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
.res-row:last-child{border-bottom:none;padding-top:5px}
.res-name{color:var(--muted)}
.res-val{font-family:'DM Mono',monospace;font-size:10px}
.dre-title-label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:14px}
.di{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);cursor:pointer;transition:padding-left 0.15s}
.di:last-child{border-bottom:none}
.di:hover{padding-left:4px}
.di-l{display:flex;align-items:center;gap:6px}
.di-dot{width:4px;height:4px;border-radius:50%}
.di-name{font-size:10px;color:var(--muted);transition:color 0.15s}
.di:hover .di-name{color:var(--text)}
.di-r{text-align:right}
.di-val{font-family:'DM Mono',monospace;font-size:10px;color:#fff}
.di-val.neg{color:var(--red)}
.di-pct{font-size:9px;color:var(--muted);margin-top:1px}
.di-pct.neg{color:rgba(248,113,113,0.55)}
.di-bar{height:1.5px;background:rgba(255,255,255,0.05);border-radius:1px;margin-top:4px;overflow:hidden}
.di-bar-inner{height:100%;border-radius:1px;transition:width 0.7s ease}
.footer{display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--border)}
.fc{padding:12px 20px;border-right:1px solid var(--border)}
.fc:last-child{border-right:none}
.fc-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:4px}
.fc-val{font-family:'DM Mono',monospace;font-size:14px}
.fc-val.g{color:var(--green)}.fc-val.r{color:var(--red)}.fc-val.b{color:var(--blue)}.fc-val.a{color:var(--amber)}
.fc-sub{font-size:9px;color:var(--muted);margin-top:1px}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.kpi{animation:fadeUp 0.35s ease both}
.kpi:nth-child(1){animation-delay:.04s}.kpi:nth-child(2){animation-delay:.08s}
.kpi:nth-child(3){animation-delay:.12s}.kpi:nth-child(4){animation-delay:.16s}.kpi:nth-child(5){animation-delay:.20s}
</style>

<div class="nav">
  <div style="display:flex;align-items:baseline">
    <span class="logo-name">ALT MAX</span><span class="logo-tag">LOG</span>
  </div>
  <div class="nav-tabs">
    <button class="ntab active">Caixa Realizado</button>
    <button class="ntab" onclick="sendPrompt('Mostrar DRE Tabela no novo layout')">DRE Tabela</button>
    <button class="ntab" onclick="sendPrompt('Mostrar Extrato no novo layout')">Extrato</button>
    <button class="ntab" onclick="sendPrompt('Mostrar Contas a Pagar no novo layout')">A Pagar</button>
    <button class="ntab" onclick="sendPrompt('Mostrar Contas a Receber no novo layout')">A Receber</button>
    <button class="ntab" onclick="sendPrompt('Mostrar Fluxo de Caixa no novo layout')">Fluxo</button>
    <button class="ntab" onclick="sendPrompt('Mostrar Conciliação no novo layout')">Conciliação</button>
  </div>
  <div class="nav-right">
    <div class="period-pill">📅 <b>01/10/2025</b> → <b>31/03/2026</b></div>
    <select class="emp-sel"><option>Empresa Alpha Ltda</option><option>Beta Serviços S/A</option><option>Gama Comércio ME</option></select>
  </div>
</div>

<div class="kpi-strip">
  <div class="kpi"><div class="kpi-glow" style="background:var(--blue)"></div>
    <div class="kpi-label">Saldo Inicial</div><div class="kpi-num w">0,00</div><div class="kpi-sub">Base do período</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Entradas</div><div class="kpi-num g">303.453,50</div><div class="kpi-sub">Receitas realizadas</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--red)"></div>
    <div class="kpi-label">Saídas</div><div class="kpi-num r">297.552,49</div><div class="kpi-sub">Custos + despesas</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Saldo Final</div><div class="kpi-num g">5.901,01</div><div class="kpi-sub">Posição atual</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Balanço</div><div class="kpi-num g">5.901,01</div><div class="kpi-sub">2,8% sobre RoB</div></div>
</div>

<div class="body">
  <div class="charts-col">
    <div class="drill-bar">
      <div class="drill-left">
        <span class="drill-title">Granularidade</span>
        <div class="breadcrumb" id="breadcrumb"></div>
      </div>
      <div class="drill-btns">
        <span class="level-pill monthly" id="levelPill">Mensal</span>
        <button class="dbtn" id="btnUp" onclick="drillUp()"><span>▲</span> Drill Up</button>
        <button class="dbtn" id="btnDown" onclick="drillDown()"><span>▼</span> Drill Down</button>
      </div>
    </div>

    <div class="top-row">
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--blue),transparent)"></div>
        <div class="cc-head">
          <div class="cc-title" style="color:var(--blue)">Receita Bruta</div>
          <div><div class="cc-kpi" id="kRB">210,7K</div><div class="cc-kpi-sub">Total período</div></div>
        </div>
        <div class="h-lg"><canvas id="cRB"></canvas></div>
        <div class="click-hint" id="hintRB">clique em uma barra para detalhar ▼</div>
      </div>
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--green),transparent)"></div>
        <div class="cc-head"><div class="cc-title" style="color:var(--green)">Conciliação</div></div>
        <div class="concil-big">87%</div>
        <div class="concil-label">dos lançamentos conciliados</div>
        <div class="pbar"><div class="pbar-fill" id="pbarFill" style="width:0%;background:var(--green)"></div></div>
        <div class="concil-stats">
          <div class="cs-row"><div class="cs-left"><div class="cs-dot" style="background:var(--green)"></div>Conciliados</div><span class="cs-val">342</span></div>
          <div class="cs-row"><div class="cs-left"><div class="cs-dot" style="background:var(--amber)"></div>Pendentes</div><span class="cs-val" style="color:var(--amber)">51</span></div>
          <div class="cs-row" style="border-top:1px solid var(--border);padding-top:6px;margin-top:2px">
            <div class="cs-left"><div class="cs-dot" style="background:var(--muted)"></div>Total</div><span class="cs-val">393</span>
          </div>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--amber),transparent)"></div>
        <div class="cc-head">
          <div class="cc-title" style="color:var(--amber)">T.D.C.F.</div>
          <div><div class="cc-kpi" style="color:var(--amber)" id="kTD">31,2K</div><div class="cc-kpi-sub">14,79% RoB</div></div>
        </div>
        <div class="h-sm"><canvas id="cTD"></canvas></div>
      </div>
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--red),transparent)"></div>
        <div class="cc-head">
          <div class="cc-title" style="color:var(--red)">Custo Variável</div>
          <div><div class="cc-kpi" style="color:var(--red)" id="kCV">154,4K</div><div class="cc-kpi-sub">73,2% RoB</div></div>
        </div>
        <div class="h-sm"><canvas id="cCV"></canvas></div>
      </div>
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--orange),transparent)"></div>
        <div class="cc-head">
          <div class="cc-title" style="color:var(--orange)">Custo Fixo</div>
          <div><div class="cc-kpi" style="color:var(--orange)" id="kCF">90,5K</div><div class="cc-kpi-sub">42,9% RoB</div></div>
        </div>
        <div class="h-sm"><canvas id="cCF"></canvas></div>
      </div>
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--green),transparent)"></div>
        <div class="cc-head">
          <div class="cc-title" style="color:var(--green)">Receita NOP</div>
          <div><div class="cc-kpi" style="color:var(--green)" id="kRN">92,7K</div><div class="cc-kpi-sub">44,0% RoB</div></div>
        </div>
        <div class="h-sm"><canvas id="cRN"></canvas></div>
      </div>
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--purple),transparent)"></div>
        <div class="cc-head">
          <div class="cc-title" style="color:var(--purple)">Despesa NOP</div>
          <div><div class="cc-kpi" style="color:var(--purple)" id="kDN">21,6K</div><div class="cc-kpi-sub">10,2% RoB</div></div>
        </div>
        <div class="h-sm"><canvas id="cDN"></canvas></div>
      </div>
      <div class="res-card">
        <div class="cc-title" style="color:rgba(52,211,153,0.7)">Resultado Final</div>
        <div class="res-big">5.901</div>
        <div class="res-pct">EBT2 — 2,8% sobre RoB</div>
        <div style="display:flex;flex-direction:column;gap:0">
          <div class="res-row"><span class="res-name">EBT1</span><span class="res-val" style="color:var(--red)">−65.248</span></div>
          <div class="res-row"><span class="res-name">+ RNOP</span><span class="res-val" style="color:var(--green)">+92.702</span></div>
          <div class="res-row"><span class="res-name">− DNOP</span><span class="res-val" style="color:var(--purple)">−21.553</span></div>
          <div class="res-row" style="border-top:1px solid rgba(52,211,153,0.2)!important">
            <span class="res-name" style="color:var(--text);font-weight:600">= EBT2</span>
            <span class="res-val" style="color:var(--green);font-weight:700">+5.901</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="dre-col">
    <div class="dre-title-label">DRE Realizado</div>
    <div id="dreList"></div>
  </div>
</div>

<div class="footer">
  <div class="fc"><div class="fc-label">Resultado Líquido</div><div class="fc-val g">+5.901,01</div><div class="fc-sub">EBT2 = 2,8% RoB</div></div>
  <div class="fc"><div class="fc-label">Margem de Contribuição</div><div class="fc-val b">25.232</div><div class="fc-sub">12,0% sobre RoB</div></div>
  <div class="fc"><div class="fc-label">Cobertura CF</div><div class="fc-val r">−65.248</div><div class="fc-sub">EBT1 = −31,0%</div></div>
  <div class="fc"><div class="fc-label">Receitas NOP</div><div class="fc-val g">+71.149</div><div class="fc-sub">Salvou o resultado</div></div>
  <div class="fc"><div class="fc-label">Taxa TDCF</div><div class="fc-val a">14,79%</div><div class="fc-sub">Sobre receita bruta</div></div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js"></script>
<script>
Chart.register(ChartDataLabels);
setTimeout(()=>{ document.getElementById('pbarFill').style.width='87%'; }, 300);

const fmtK = v => {
  if(!v || v === 0) return '';
  const a = Math.abs(v);
  const s = v < 0 ? '−' : '';
  return s + (a >= 1000 ? (a/1000).toFixed(1)+'K' : a.toFixed(0));
};

// ── DATA ─────────────────────────────────────────────────────────────────────

const DATA = {
  quarterly: {
    labels: ['Q4/25', 'Q1/26'],
    RB: [45700,  202042],
    TD: [9263,   21906],
    CV: [45653,  108698],
    CF: [53413,  37067],
    RN: [73600,  19100],
    DN: [6244,   15309],
  },
  monthly: {
    labels: ['Out/25','Nov/25','Dez/25','Jan/26','Fev/26','Mar/26'],
    RB: [0,     0,     45700, 78108, 86944, 36990],
    TD: [0,     0,     9263,  13287, 8619,  0],
    CV: [0,     10675, 34978, 48591, 23117, 36990],
    CF: [205,   22213, 30995, 18353, 10573, 8141],
    RN: [1100,  34000, 38500, 15000, 4100,  0],
    DN: [877,   0,     5367,  15035, 274,   0],
  },
};

// Weekly breakdown — labels always "Sem N · Mês/Ano"
const WEEKLY = {
  'Out/25': { labels:['Sem 1·Out/25','Sem 2·Out/25','Sem 3·Out/25','Sem 4·Out/25'], RB:[0,0,0,0], TD:[0,0,0,0], CV:[0,0,0,0], CF:[205,0,0,0], RN:[1100,0,0,0], DN:[877,0,0,0] },
  'Nov/25': { labels:['Sem 1·Nov/25','Sem 2·Nov/25','Sem 3·Nov/25','Sem 4·Nov/25'], RB:[0,0,0,0], TD:[0,0,0,0], CV:[0,4500,3200,2975], CF:[5200,6400,5313,5300], RN:[0,34000,0,0], DN:[0,0,0,0] },
  'Dez/25': { labels:['Sem 1·Dez/25','Sem 2·Dez/25','Sem 3·Dez/25','Sem 4·Dez/25'], RB:[0,8200,16300,21200], TD:[0,1800,3500,3963], CV:[7800,9200,10200,7778], CF:[7500,8200,7800,7495], RN:[0,0,38500,0], DN:[0,2367,3000,0] },
  'Jan/26': { labels:['Sem 1·Jan/26','Sem 2·Jan/26','Sem 3·Jan/26','Sem 4·Jan/26'], RB:[12400,18900,22500,24308], TD:[2100,3200,4000,3987], CV:[9800,13200,14500,11091], CF:[4200,5100,4800,4253], RN:[0,0,15000,0], DN:[15035,0,0,0] },
  'Fev/26': { labels:['Sem 1·Fev/26','Sem 2·Fev/26','Sem 3·Fev/26','Sem 4·Fev/26'], RB:[14200,21500,28000,23244], TD:[1400,2100,2800,2319], CV:[3800,5900,7200,6217], CF:[2700,3100,2600,2173], RN:[4100,0,0,0], DN:[274,0,0,0] },
  'Mar/26': { labels:['Sem 1·Mar/26','Sem 2·Mar/26','Sem 3·Mar/26','Sem 4·Mar/26'], RB:[8200,12300,9800,6690], TD:[0,0,0,0], CV:[8200,12300,9800,6690], CF:[2100,2300,2000,1741], RN:[0,0,0,0], DN:[0,0,0,0] },
};

const MONTHLY_KEYS = ['Out/25','Nov/25','Dez/25','Jan/26','Fev/26','Mar/26'];

let currentLevel = 'monthly';
let selectedMonth = null;
let charts = {};

const CHART_DEFS = [
  { id:'cRB', key:'RB', color:'#38BDF8', kpiId:'kRB', isMain:true },
  { id:'cTD', key:'TD', color:'#FBBF24', kpiId:'kTD' },
  { id:'cCV', key:'CV', color:'#F87171', kpiId:'kCV' },
  { id:'cCF', key:'CF', color:'#FB923C', kpiId:'kCF' },
  { id:'cRN', key:'RN', color:'#34D399', kpiId:'kRN' },
  { id:'cDN', key:'DN', color:'#C084FC', kpiId:'kDN' },
];

function getLevelData() {
  if(currentLevel === 'quarterly') return DATA.quarterly;
  if(currentLevel === 'monthly')   return DATA.monthly;
  if(currentLevel === 'weekly' && selectedMonth) return WEEKLY[selectedMonth];
  return DATA.monthly;
}

function buildAllCharts() {
  const d = getLevelData();
  CHART_DEFS.forEach(def => {
    if(charts[def.id]) { charts[def.id].destroy(); delete charts[def.id]; }
    charts[def.id] = buildChart(def.id, d.labels, d[def.key], def.color, def.isMain, def.key);
    if(def.kpiId) {
      const total = d[def.key].reduce((s,v)=>s+(v||0), 0);
      document.getElementById(def.kpiId).textContent = fmtK(total) || '—';
    }
  });
}

function buildChart(id, labels, data, color, isMain, key) {
  const ctx = document.getElementById(id);

  // Shorten weekly labels for axis: "Sem 1·Jan/26" → "S1·Jan/26"
  const axisLabels = labels.map(l => l.replace('Sem ','S'));

  const datasets = [{
    data,
    backgroundColor: data.map(v => v > 0 ? color+'18' : 'transparent'),
    borderColor:     data.map(v => v > 0 ? color     : 'transparent'),
    borderWidth: 1.5,
    borderRadius: 5,
    borderSkipped: false,
    hoverBackgroundColor: color+'35',
    datalabels: {
      display: ctx2 => ctx2.datasetIndex === 0 && ctx2.dataset.data[ctx2.dataIndex] > 0,
      color: color,
      font: { family:'DM Mono', size: isMain ? 10 : 9 },
      anchor: 'end',
      align:  'end',
      offset: 2,
      formatter: v => fmtK(v),
      clip: false,
    }
  }];

  // Trend line only on main chart at monthly level
  if(isMain && currentLevel === 'monthly') {
    datasets.push({
      type: 'line',
      data: data.map(v => v > 0 ? v : null),
      borderColor: color + '45',
      borderWidth: 1.5,
      borderDash: [4,4],
      pointRadius: data.map(v => v > 0 ? 3 : 0),
      pointBackgroundColor: color,
      fill: false,
      tension: 0.35,
      datalabels: { display: false },
    });
  }

  return new Chart(ctx, {
    type: 'bar',
    data: { labels: axisLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (e, els) => {
        if(currentLevel !== 'monthly' || !els.length) return;
        drillDownTo(MONTHLY_KEYS[els[0].index]);
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(5,9,26,0.95)',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#64748b',
          bodyColor: color,
          padding: 10,
          callbacks: {
            title: items => labels[items[0].dataIndex], // full label in tooltip
            label: c => c.raw > 0 ? '  ' + fmtK(c.raw) : null
          }
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#475569',
            font: { size: 9, family: 'DM Mono' },
            maxRotation: 0,
            autoSkip: false,
          }
        },
        y: { display: false }
      },
      animation: { duration: 450, easing: 'easeInOutQuart' },
      layout: { padding: { top: isMain ? 26 : 22 } }
    }
  });
}

// ── DRILL ─────────────────────────────────────────────────────────────────────

function drillUp() {
  if(currentLevel === 'weekly')   { currentLevel = 'monthly'; selectedMonth = null; }
  else if(currentLevel === 'monthly') { currentLevel = 'quarterly'; selectedMonth = null; }
  updateUI(); buildAllCharts();
}

function drillDown() {
  if(currentLevel === 'quarterly') { currentLevel = 'monthly'; selectedMonth = null; }
  else if(currentLevel === 'monthly') { drillDownTo('Dez/25'); return; }
  updateUI(); buildAllCharts();
}

function drillDownTo(month) {
  currentLevel = 'weekly'; selectedMonth = month;
  updateUI(); buildAllCharts();
}

function drillTo(level) {
  currentLevel = level; selectedMonth = null;
  updateUI(); buildAllCharts();
}

function updateUI() {
  const pill   = document.getElementById('levelPill');
  const btnUp  = document.getElementById('btnUp');
  const btnDown= document.getElementById('btnDown');
  const hint   = document.getElementById('hintRB');

  const names = { quarterly:'Trimestral', monthly:'Mensal', weekly:'Semanal' };
  const cls   = { quarterly:'quarterly',  monthly:'monthly',  weekly:'weekly' };

  pill.textContent = names[currentLevel] + (selectedMonth ? ' · ' + selectedMonth : '');
  pill.className   = 'level-pill ' + cls[currentLevel];
  btnUp.disabled   = currentLevel === 'quarterly';
  btnDown.disabled = currentLevel === 'weekly';
  if(hint) hint.style.display = currentLevel === 'monthly' ? 'block' : 'none';

  // Breadcrumb
  const bc = document.getElementById('breadcrumb');
  if(currentLevel === 'quarterly') {
    bc.innerHTML = \`<span class="bc-item active" onclick="drillTo('quarterly')">Trimestral</span>\`;
  } else if(currentLevel === 'monthly') {
    bc.innerHTML = \`
      <span class="bc-item" onclick="drillTo('quarterly')">Trimestral</span>
      <span class="bc-sep">›</span>
      <span class="bc-item active" onclick="drillTo('monthly')">Mensal</span>\`;
  } else {
    bc.innerHTML = \`
      <span class="bc-item" onclick="drillTo('quarterly')">Trimestral</span>
      <span class="bc-sep">›</span>
      <span class="bc-item" onclick="drillTo('monthly')">Mensal</span>
      <span class="bc-sep">›</span>
      <span class="bc-item active">\${selectedMonth}</span>\`;
  }
}

// ── DRE ──────────────────────────────────────────────────────────────────────

const DRE=[
  {name:'RoB',       val:210752,pct:100.0,c:'#38BDF8',neg:false},
  {name:'T.D.C.F.',  val:31169, pct:14.79,c:'#FBBF24',neg:false},
  {name:'Rec. Líq.', val:179583,pct:85.2, c:'#38BDF8',neg:false},
  {name:'Cust. Var.',val:154351,pct:73.2, c:'#F87171',neg:false},
  {name:'Marg. Cont.',val:25232,pct:12.0, c:'#FB923C',neg:false},
  {name:'Cust. Fixo', val:90480,pct:42.9, c:'#FB923C',neg:false},
  {name:'EBT1',      val:-65248,pct:-31.0,c:'#F87171',neg:true},
  {name:'RNOP',      val:92702, pct:44.0, c:'#34D399',neg:false},
  {name:'DNOP',      val:21553, pct:10.2, c:'#C084FC',neg:false},
  {name:'EBT2',      val:5901,  pct:2.8,  c:'#34D399',neg:false},
];

document.getElementById('dreList').innerHTML = DRE.map((d,i)=>\`
  <div class="di" style="animation:fadeUp 0.3s \${i*0.035}s both ease">
    <div class="di-l"><div class="di-dot" style="background:\${d.c}"></div><span class="di-name">\${d.name}</span></div>
    <div class="di-r">
      <div class="di-val\${d.neg?' neg':''}">\${fmtK(d.val)}</div>
      <div class="di-pct\${d.neg?' neg':''}">\${d.pct.toFixed(1)}%</div>
    </div>
  </div>
  <div class="di-bar"><div class="di-bar-inner" style="width:\${Math.min(Math.abs(d.pct),100)}%;background:\${d.c};opacity:0.55"></div></div>
\`).join('');

// ── INIT ─────────────────────────────────────────────────────────────────────
updateUI();
buildAllCharts();
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
