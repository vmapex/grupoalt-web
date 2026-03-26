"use client"
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function FluxoPage() {
  const ref = useRef<HTMLDivElement>(null)
  const { token, empresaAtiva } = useAuthStore()

  useEffect(() => {
    if (!ref.current) return

    const empresaId = empresaAtiva?.id || 1
    const apiUrl = window.location.origin + '/api/proxy'

    const html = `
<link rel="stylesheet" href="https://unpkg.com/@fontsource/dm-mono@4.5.14/index.css">
<link rel="stylesheet" href="https://unpkg.com/@fontsource/plus-jakarta-sans@8.0.0/index.css">
<style>
:root{
  --bg:#05091A;--surface:rgba(255,255,255,0.034);--border:rgba(255,255,255,0.07);
  --blue:#38BDF8;--green:#34D399;--red:#F87171;--amber:#FBBF24;--orange:#FB923C;
  --text:#F1F5F9;--muted:#64748B;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);font-family:'Plus Jakarta Sans',sans-serif;color:var(--text);
  background-image:linear-gradient(rgba(56,189,248,0.025)1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025)1px,transparent 1px);
  background-size:48px 48px;}


/* HORIZON BAR */
.horizon-bar{display:flex;align-items:center;gap:10px;padding:10px 24px;border-bottom:1px solid var(--border);background:rgba(5,9,26,0.5);flex-wrap:wrap}

.hz-from{display:flex;align-items:center;gap:8px;background:rgba(56,189,248,0.07);border:1px solid rgba(56,189,248,0.2);border-radius:8px;padding:6px 14px;font-size:10px;font-family:'DM Mono',monospace;white-space:nowrap}
.today-dot{width:6px;height:6px;border-radius:50%;background:var(--blue);animation:pulse 2s infinite;flex-shrink:0}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
.hz-from-label{color:var(--muted)}
.hz-from-date{color:var(--blue);font-weight:500}
.hz-from-lock{font-size:9px;color:rgba(56,189,248,0.4);margin-left:4px}
.hz-arrow{color:var(--muted);font-size:14px}

.hz-presets{display:flex;gap:3px;flex-wrap:wrap}
.hz-btn{padding:5px 12px;border-radius:7px;font-size:10px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font-family:inherit;transition:all 0.2s;white-space:nowrap}
.hz-btn:hover{color:var(--text);border-color:rgba(56,189,248,0.3)}
.hz-btn.active{background:rgba(56,189,248,0.1);border-color:rgba(56,189,248,0.5);color:var(--blue);font-weight:600}

.hz-sep{font-size:10px;color:var(--muted);white-space:nowrap}

/* Custom date — botão Aplicar explícito */
.hz-custom{display:flex;align-items:center;gap:6px}
.hz-custom label{font-size:10px;color:var(--muted);white-space:nowrap}
input[type="date"]{background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:10px;padding:5px 10px;border-radius:7px;font-family:'DM Mono',monospace;cursor:pointer;transition:border-color 0.2s;color-scheme:dark;width:140px}
input[type="date"]:focus{outline:none;border-color:rgba(56,189,248,0.4)}
.apply-btn{display:flex;align-items:center;gap:4px;padding:5px 14px;border-radius:7px;font-size:10px;border:1px solid rgba(56,189,248,0.4);background:rgba(56,189,248,0.1);color:var(--blue);cursor:pointer;font-family:inherit;transition:all 0.2s;white-space:nowrap}
.apply-btn:hover{background:rgba(56,189,248,0.2)}

.hz-result{margin-left:auto;display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 12px}
.hz-result-days{font-family:'DM Mono',monospace;font-size:16px;font-weight:400;color:#fff}
.hz-result-label{font-size:9px;color:var(--muted)}
.hz-result-range{font-size:10px;color:rgba(56,189,248,0.7);font-family:'DM Mono',monospace;margin-left:4px;border-left:1px solid var(--border);padding-left:10px}

/* KPI */
.kpi-strip{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--border)}
.kpi{padding:13px 20px;border-right:1px solid var(--border);position:relative;overflow:hidden;transition:background 0.2s}
.kpi:last-child{border-right:none}
.kpi:hover{background:rgba(255,255,255,0.015)}
.kpi-glow{position:absolute;bottom:0;left:0;right:0;height:1.5px;opacity:0;transition:opacity 0.3s}
.kpi:hover .kpi-glow{opacity:1}
.kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:5px}
.kpi-num{font-family:'DM Mono',monospace;font-size:18px;font-weight:400}
.kpi-num.g{color:var(--green)}.kpi-num.r{color:var(--red)}.kpi-num.w{color:#fff}.kpi-num.b{color:var(--blue)}
.kpi-sub{font-size:9px;color:var(--muted);margin-top:2px}

.body{display:grid;grid-template-columns:1fr 248px;min-height:calc(100vh - 160px)}
.main-col{display:flex;flex-direction:column;border-right:1px solid var(--border)}
.right-col{padding:16px 14px;display:flex;flex-direction:column;gap:12px;overflow-y:auto}
.charts-area{padding:14px 20px;display:flex;flex-direction:column;gap:12px;flex:1}

.cc{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.cc-shine{height:1px;opacity:0.6}
.cc-toolbar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border);background:rgba(5,9,26,0.3)}
.cc-label{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted)}
.cc-ref{font-size:9px;color:rgba(56,189,248,0.6);font-family:'DM Mono',monospace}
.toggle-grp{display:flex;gap:2px;background:rgba(255,255,255,0.04);border-radius:6px;padding:2px}
.tgbtn{padding:3px 9px;border-radius:4px;font-size:9px;cursor:pointer;border:none;background:transparent;color:var(--muted);font-family:inherit;transition:all 0.2s}
.tgbtn:hover{color:var(--text)}.tgbtn.active{background:rgba(56,189,248,0.12);color:var(--blue)}
.cc-legend-bar{display:flex;align-items:center;gap:12px;padding:8px 14px 0}
.leg{display:flex;align-items:center;gap:5px;font-size:9px;color:var(--muted)}
.leg-sq{width:7px;height:7px;border-radius:2px;flex-shrink:0}
.chart-wrap{padding:8px 14px 10px}
.two-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cc-simple{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:13px}
.cc-simple-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.cc-simple-title{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted)}
.cc-simple-total{font-family:'DM Mono',monospace;font-size:13px;color:#fff}

.panel-title{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:8px}
.proj-card{background:linear-gradient(135deg,rgba(56,189,248,0.07),rgba(52,211,153,0.04));border:1px solid rgba(56,189,248,0.2);border-radius:10px;padding:13px}
.proj-big{font-family:'DM Mono',monospace;font-size:20px;line-height:1;margin:4px 0 2px}
.proj-sub{font-size:9px;color:var(--muted)}
.summary-card{background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:11px}
.sum-row{display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
.sum-row:last-child{border-bottom:none}
.sum-left{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--muted)}
.sum-dot{width:5px;height:5px;border-radius:50%}
.sum-val{font-family:'DM Mono',monospace;font-size:11px}
.mini-chart{display:flex;flex-direction:column;gap:4px}
.mc-row{display:flex;flex-direction:column;gap:2px}
.mc-label{display:flex;justify-content:space-between;font-size:9px}
.mc-label span:first-child{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px}
.mc-label span:last-child{font-family:'DM Mono',monospace;color:var(--text)}
.mc-bar{height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden}
.mc-fill{height:100%;border-radius:2px;transition:width 0.7s ease}
.divider{height:1px;background:var(--border)}
.mini-table{width:100%;border-collapse:collapse}
.mini-table th{padding:4px 6px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);font-family:'DM Mono',monospace;text-align:left}
.mini-table th:last-child{text-align:right}
.mini-table td{padding:4px 6px;border-bottom:1px solid rgba(255,255,255,0.03);font-size:9px}
.mini-table td:last-child{text-align:right;font-family:'DM Mono',monospace}
.mini-table tr:last-child td{border-bottom:none}
.empty-state{padding:12px;text-align:center;font-size:10px;color:var(--muted)}

@keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
.kpi{animation:fadeUp 0.35s ease both}
.kpi:nth-child(1){animation-delay:.04s}.kpi:nth-child(2){animation-delay:.08s}
.kpi:nth-child(3){animation-delay:.12s}.kpi:nth-child(4){animation-delay:.16s}.kpi:nth-child(5){animation-delay:.20s}
.loading-overlay{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;gap:14px;color:var(--muted);font-size:12px}
.spinner{width:20px;height:20px;border:2px solid rgba(56,189,248,0.2);border-top-color:#38BDF8;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.error-msg{text-align:center;padding:40px 20px;color:var(--red);font-size:12px}
</style>


<div class="loading-overlay" id="loadingOverlay"><div class="spinner"></div>Carregando fluxo de caixa...</div>
<div id="mainContent" style="display:none">
<!-- HORIZON BAR -->
<div class="horizon-bar">
  <div class="hz-from">
    <div class="today-dot"></div>
    <span class="hz-from-label">De</span>
    <span class="hz-from-date" id="todayStr">—</span>
    <span class="hz-from-lock">🔒 fixo</span>
  </div>

  <span class="hz-arrow">→</span>

  <div class="hz-presets">
    <button class="hz-btn"        onclick="setHorizon(7,   this)">+7d</button>
    <button class="hz-btn active" onclick="setHorizon(30,  this)">+30d</button>
    <button class="hz-btn"        onclick="setHorizon(60,  this)">+60d</button>
    <button class="hz-btn"        onclick="setHorizon(90,  this)">+90d</button>
    <button class="hz-btn"        onclick="setHorizon(180, this)">+6m</button>
    <button class="hz-btn"        onclick="setHorizon(365, this)">+12m</button>
  </div>

  <span class="hz-sep">ou até</span>

  <div class="hz-custom">
    <label>Data final</label>
    <input type="date" id="dtFim">
    <button class="apply-btn" onclick="applyCustomDate()">✓ Aplicar</button>
  </div>

  <div class="hz-result">
    <div>
      <div class="hz-result-days" id="hzDays">—</div>
      <div class="hz-result-label">dias à frente</div>
    </div>
    <span class="hz-result-range" id="hzRange">—</span>
  </div>
</div>

<div class="kpi-strip">
  <div class="kpi"><div class="kpi-glow" style="background:var(--blue)"></div>
    <div class="kpi-label">Saldo Atual</div><div class="kpi-num b" id="kSaldo">—</div><div class="kpi-sub">Base para projeção</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Entradas Previstas</div><div class="kpi-num g" id="kEnt">—</div><div class="kpi-sub">CR · dt. previsão</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--red)"></div>
    <div class="kpi-label">Saídas Previstas</div><div class="kpi-num r" id="kSai">—</div><div class="kpi-sub">CP · dt. previsão</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--blue)"></div>
    <div class="kpi-label">Saldo Projetado</div><div class="kpi-num" id="kSF">—</div><div class="kpi-sub">Posição esperada</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--amber)"></div>
    <div class="kpi-label">Cobertura</div><div class="kpi-num" id="kCob" style="color:var(--amber)">—</div><div class="kpi-sub">Entradas / Saídas</div></div>
</div>

<div class="body">
  <div class="main-col">
    <div class="charts-area">
      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--blue),transparent)"></div>
        <div class="cc-toolbar">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="cc-label">Entradas × Saídas Mensais</span>
            <span class="cc-ref" id="ref1">—</span>
          </div>
          <div class="toggle-grp">
            <button class="tgbtn active" id="tgB" onclick="setType('bars')">Barras</button>
            <button class="tgbtn" id="tgW" onclick="setType('waterfall')">Waterfall</button>
            <button class="tgbtn" id="tgL" onclick="setType('line')">Linha</button>
          </div>
        </div>
        <div class="cc-legend-bar">
          <div class="leg"><div class="leg-sq" style="background:rgba(52,211,153,0.7)"></div>Entradas (CR)</div>
          <div class="leg"><div class="leg-sq" style="background:rgba(248,113,113,0.7)"></div>Saídas (CP)</div>
          <div class="leg"><div class="leg-sq" style="background:transparent;border:1px dashed rgba(56,189,248,0.5)"></div>Saldo acumulado</div>
        </div>
        <div class="chart-wrap" style="height:210px"><canvas id="chart1"></canvas></div>
      </div>

      <div class="cc">
        <div class="cc-shine" style="background:linear-gradient(90deg,transparent,var(--green),transparent)"></div>
        <div class="cc-toolbar">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="cc-label">Saldo Final por Dia</span>
            <span class="cc-ref">usando dt. previsão</span>
          </div>
        </div>
        <div class="cc-legend-bar">
          <div class="leg"><div class="leg-sq" style="background:rgba(52,211,153,0.7)"></div>Positivo</div>
          <div class="leg"><div class="leg-sq" style="background:rgba(248,113,113,0.7)"></div>Negativo</div>
        </div>
        <div class="chart-wrap" style="height:210px"><canvas id="chart2"></canvas></div>
      </div>

      <div class="two-cols">
        <div class="cc-simple">
          <div class="cc-simple-head"><span class="cc-simple-title">Saldo líquido mensal</span><span class="cc-simple-total" id="totLiq">—</span></div>
          <div style="position:relative;height:120px"><canvas id="chart3"></canvas></div>
        </div>
        <div class="cc-simple">
          <div class="cc-simple-head"><span class="cc-simple-title">Saídas por categoria (CP)</span><span class="cc-simple-total" id="totCat">—</span></div>
          <div style="position:relative;height:120px"><canvas id="chart4"></canvas></div>
        </div>
      </div>
    </div>
  </div>

  <div class="right-col">
    <div class="proj-card">
      <div class="panel-title" style="margin-bottom:4px">Saldo Projetado Final</div>
      <div class="proj-big" id="projBig">—</div>
      <div class="proj-sub" id="projSub">—</div>
    </div>
    <div class="divider"></div>
    <div>
      <div class="panel-title">Resumo do horizonte</div>
      <div class="summary-card">
        <div class="sum-row"><div class="sum-left"><div class="sum-dot" style="background:var(--blue)"></div>Saldo atual</div><div class="sum-val" style="color:var(--blue)" id="rSaldo">—</div></div>
        <div class="sum-row"><div class="sum-left"><div class="sum-dot" style="background:var(--green)"></div>Entradas previstas</div><div class="sum-val" id="rEnt">—</div></div>
        <div class="sum-row"><div class="sum-left"><div class="sum-dot" style="background:var(--red)"></div>Saídas previstas</div><div class="sum-val" id="rSai">—</div></div>
        <div class="sum-row"><div class="sum-left"><div class="sum-dot" style="background:var(--blue)"></div>Projeção final</div><div class="sum-val" id="rProj">—</div></div>
        <div class="sum-row"><div class="sum-left"><div class="sum-dot" style="background:var(--amber)"></div>Cobertura</div><div class="sum-val" id="rCob">—</div></div>
      </div>
    </div>
    <div class="divider"></div>
    <div><div class="panel-title">Dias positivos vs negativos</div><div class="summary-card" id="dayStats"></div></div>
    <div class="divider"></div>
    <div><div class="panel-title">Maiores entradas previstas</div><div class="mini-chart" id="topCR"></div></div>
    <div class="divider"></div>
    <div><div class="panel-title">Maiores saídas previstas</div><div class="mini-chart" id="topCP"></div></div>
    <div class="divider"></div>
    <div><div class="panel-title">Próximas previsões</div><div id="proxVenc"></div></div>
  </div>
</div>
</div><!-- /mainContent -->

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js"></script>
<script>
Chart.register(ChartDataLabels);

const API = '${apiUrl}';
const EMPRESA = ${empresaId};
const TOKEN = '${token}';

const fmtK=v=>{const a=Math.abs(v);return(v<0?'−':'')+(a>=1000?(a/1000).toFixed(1)+'K':a.toFixed(2));};
const MONTHS=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
let SALDO_ATUAL=0;

const TODAY=new Date();TODAY.setHours(0,0,0,0);
const toISO=d=>\`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2,'0')}-\${String(d.getDate()).padStart(2,'0')}\`;
const fmtBR=d=>\`\${String(d.getDate()).padStart(2,'0')}/\${MONTHS[d.getMonth()]}/\${d.getFullYear()}\`;
const parseDMY=s=>{const[d,m,y]=s.split('/').map(Number);return new Date(y,m-1,d);};

document.getElementById('todayStr').textContent=fmtBR(TODAY);

let dateTo=new Date(TODAY);dateTo.setDate(dateTo.getDate()+30);
document.getElementById('dtFim').value=toISO(dateTo);

function setHorizon(days, btn){
  document.querySelectorAll('.hz-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  dateTo=new Date(TODAY);
  dateTo.setDate(dateTo.getDate()+days);
  document.getElementById('dtFim').value=toISO(dateTo);
  renderAll();
}

function applyCustomDate(){
  const v=document.getElementById('dtFim').value;
  if(!v){alert('Por favor selecione uma data.');return;}
  const parts=v.split('-').map(Number);
  const nd=new Date(parts[0],parts[1]-1,parts[2]);
  nd.setHours(0,0,0,0);
  if(nd<TODAY){alert('A data final deve ser igual ou posterior a hoje.');return;}
  document.querySelectorAll('.hz-btn').forEach(b=>b.classList.remove('active'));
  dateTo=nd;
  renderAll();
}

// DATA (loaded from API)
let CP_ALL=[];
let CR_ALL=[];

async function loadFromAPI() {
  try {
    const [cpRes, crRes, saldosRes] = await Promise.all([
      fetch(API + '/empresas/' + EMPRESA + '/cp', { headers: { Authorization: 'Bearer ' + TOKEN } }),
      fetch(API + '/empresas/' + EMPRESA + '/cr', { headers: { Authorization: 'Bearer ' + TOKEN } }),
      fetch(API + '/empresas/' + EMPRESA + '/saldos', { headers: { Authorization: 'Bearer ' + TOKEN } })
    ]);
    const cpJson = await cpRes.json();
    const crJson = await crRes.json();
    const saldosJson = await saldosRes.json();

    const cpArr = Array.isArray(cpJson) ? cpJson : (cpJson.contas || cpJson.items || []);
    const crArr = Array.isArray(crJson) ? crJson : (crJson.contas || crJson.items || []);
    const saldos = Array.isArray(saldosJson) ? saldosJson : (saldosJson.contas || saldosJson.saldos || []);

    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('mainContent').style.display = '';

    SALDO_ATUAL = saldos.reduce((s, c) => s + (c.saldo || 0), 0);

    CP_ALL = cpArr.map(r => ({
      favorecido: r.favorecido || r.nome_favorecido || '—',
      categoria: r.categoria || r.codigo_categoria || '—',
      previsao: r.data_previsao || r.data_vencimento || '—',
      valor: r.valor || 0,
      status: r.status || 'A VENCER'
    }));

    CR_ALL = crArr.map(r => ({
      favorecido: r.favorecido || r.nome_favorecido || '—',
      categoria: r.categoria || r.codigo_categoria || '—',
      previsao: r.data_previsao || r.data_vencimento || '—',
      valor: r.valor || 0,
      status: r.status || 'A RECEBER'
    }));

    renderAll();
  } catch(e) {
    console.error('Erro ao carregar fluxo:', e);
    document.getElementById('loadingOverlay').innerHTML = '<div class="error-msg">Erro ao carregar dados: ' + e.message + '<br><br><button onclick="loadFromAPI()" style="padding:6px 16px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);color:#38BDF8;border-radius:8px;font-size:11px;cursor:pointer;font-family:inherit">Tentar novamente</button></div>';
  }
}

let chartType='bars';
let charts={};

function filterData(raw){
  return raw.filter(r=>{
    const dt=parseDMY(r.previsao);dt.setHours(0,0,0,0);
    return dt>=TODAY&&dt<=dateTo&&r.status!=='PAGO'&&r.status!=='RECEBIDO';
  });
}

function renderAll(){
  const CP=filterData(CP_ALL);
  const CR=filterData(CR_ALL);
  const dias=Math.round((dateTo-TODAY)/86400000);
  document.getElementById('hzDays').textContent=\`+\${dias}\`;
  document.getElementById('hzRange').textContent=\`\${fmtBR(TODAY)} → \${fmtBR(dateTo)}\`;
  document.getElementById('ref1').textContent=\`hoje → \${fmtBR(dateTo)}\`;
  buildChart1(CP,CR);
  buildChart2(CP,CR);
  buildChart4(CP);
}

function setType(t){
  chartType=t;
  ['B','W','L'].forEach(k=>document.getElementById('tg'+k).classList.toggle('active',
    (t==='bars'&&k==='B')||(t==='waterfall'&&k==='W')||(t==='line'&&k==='L')));
  renderAll();
}

function aggMonthly(data){const map={};data.forEach(r=>{const d=parseDMY(r.previsao);const k=\`\${MONTHS[d.getMonth()]}/\${String(d.getFullYear()).slice(2)}\`;map[k]=(map[k]||0)+r.valor;});return map;}
function sortMonths(keys){return [...keys].sort((a,b)=>{const[ma,ya]=a.split('/');const[mb,yb]=b.split('/');return(+ya*100+MONTHS.indexOf(ma))-(+yb*100+MONTHS.indexOf(mb));});}

function buildChart1(CP,CR){
  if(charts.c1){charts.c1.destroy();charts.c1=null;}
  const cpMap=aggMonthly(CP),crMap=aggMonthly(CR);
  const allKeys=sortMonths([...new Set([...Object.keys(cpMap),...Object.keys(crMap)])]);
  if(!allKeys.length){updateRight(0,0,CP,CR);return;}
  const cpV=allKeys.map(k=>cpMap[k]||0),crV=allKeys.map(k=>crMap[k]||0);
  const liqV=allKeys.map((_,i)=>crV[i]-cpV[i]);
  const totCR=crV.reduce((s,v)=>s+v,0),totCP=cpV.reduce((s,v)=>s+v,0);
  const crPcts=crV.map(v=>totCR>0?+(v/totCR*100).toFixed(1):0);
  const cpPcts=cpV.map(v=>totCP>0?+(v/totCP*100).toFixed(1):0);
  let cum=SALDO_ATUAL;const cumV=liqV.map(v=>{cum+=v;return cum;});

  let datasets;
  if(chartType==='waterfall'){
    datasets=[{label:'Saldo',data:liqV,backgroundColor:liqV.map(v=>v>=0?'rgba(52,211,153,0.22)':'rgba(248,113,113,0.22)'),borderColor:liqV.map(v=>v>=0?'#34D399':'#F87171'),borderWidth:1.5,borderRadius:4,borderSkipped:false,datalabels:{display:true,anchor:'end',align:liqV.map(v=>v>=0?'end':'start'),clamp:true,color:liqV.map(v=>v>=0?'#34D399':'#F87171'),font:{family:'DM Mono',size:10},formatter:v=>\`\${v>=0?'+':''}\${fmtK(v)}\`}},
    {type:'line',data:cumV,borderColor:'rgba(56,189,248,0.5)',borderWidth:1.5,borderDash:[4,3],pointRadius:3,pointBackgroundColor:cumV.map(v=>v>=0?'#34D399':'#F87171'),fill:false,tension:0.35,datalabels:{display:false}}];
  } else if(chartType==='line'){
    datasets=[
      {type:'line',label:'Entradas CR',data:crV,borderColor:'#34D399',backgroundColor:'rgba(52,211,153,0.06)',borderWidth:2,fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#34D399',datalabels:{display:true,anchor:'end',align:'end',clamp:true,color:'#34D399',font:{family:'DM Mono',size:10},formatter:(v,c)=>\`\${fmtK(v)}  \${crPcts[c.dataIndex]}%\`}},
      {type:'line',label:'Saídas CP', data:cpV,borderColor:'#F87171',backgroundColor:'rgba(248,113,113,0.06)',borderWidth:2,fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#F87171',datalabels:{display:true,anchor:'start',align:'start',clamp:true,color:'#F87171',font:{family:'DM Mono',size:10},formatter:(v,c)=>\`\${fmtK(v)}  \${cpPcts[c.dataIndex]}%\`}},
      {type:'line',data:cumV,borderColor:'rgba(56,189,248,0.5)',borderWidth:1.5,borderDash:[4,3],pointRadius:2,fill:false,tension:0.35,datalabels:{display:false}}
    ];
  } else {
    datasets=[
      {label:'Entradas CR',data:crV,backgroundColor:'rgba(52,211,153,0.18)',borderColor:'#34D399',borderWidth:1.5,borderRadius:5,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,color:'#34D399',font:{family:'DM Mono',size:10},formatter:(v,c)=>\`\${fmtK(v)}  \${crPcts[c.dataIndex]}%\`}},
      {label:'Saídas CP', data:cpV,backgroundColor:'rgba(248,113,113,0.18)',borderColor:'#F87171',borderWidth:1.5,borderRadius:5,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,color:'#F87171',font:{family:'DM Mono',size:10},formatter:(v,c)=>\`\${fmtK(v)}  \${cpPcts[c.dataIndex]}%\`}},
      {type:'line',data:cumV,borderColor:'rgba(56,189,248,0.5)',borderWidth:1.5,borderDash:[4,3],pointRadius:3,pointBackgroundColor:cumV.map(v=>v>=0?'#34D399':'#F87171'),fill:false,tension:0.35,datalabels:{display:false}}
    ];
  }

  charts.c1=new Chart(document.getElementById('chart1'),{type:'bar',data:{labels:allKeys,datasets},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(5,9,26,0.95)',borderColor:'rgba(255,255,255,0.08)',borderWidth:1,titleColor:'#94a3b8',padding:11,callbacks:{label:c=>\`  \${c.dataset.label||'Saldo'}: \${fmtK(c.raw)}\`}}},
      scales:{x:{grid:{display:false},ticks:{color:'#475569',font:{size:10,family:'DM Mono'},maxRotation:0,autoSkip:false}},y:{grid:{color:'rgba(255,255,255,0.03)',drawBorder:false},border:{dash:[3,3]},ticks:{color:'#475569',font:{size:9,family:'DM Mono'},callback:v=>fmtK(v)}}},
      animation:{duration:450},layout:{padding:{top:28,right:100,bottom:2}}}});

  buildChart3(allKeys,liqV);
  updateRight(totCR,totCP,CP,CR);
}

function buildChart2(CP,CR){
  if(charts.c2){charts.c2.destroy();charts.c2=null;}
  const dayMap={};
  CR.forEach(r=>{dayMap[r.previsao]=(dayMap[r.previsao]||{e:0,s:0});dayMap[r.previsao].e+=r.valor;});
  CP.forEach(r=>{dayMap[r.previsao]=(dayMap[r.previsao]||{e:0,s:0});dayMap[r.previsao].s+=r.valor;});

  const labels=[],saldos=[];
  let saldo=SALDO_ATUAL;
  const cur=new Date(TODAY);
  while(cur<=dateTo){
    const key=\`\${String(cur.getDate()).padStart(2,'0')}/\${String(cur.getMonth()+1).padStart(2,'0')}/\${cur.getFullYear()}\`;
    if(dayMap[key]) saldo+=dayMap[key].e-dayMap[key].s;
    labels.push(\`\${String(cur.getDate()).padStart(2,'0')}/\${MONTHS[cur.getMonth()]}/\${String(cur.getFullYear()).slice(2)}\`);
    saldos.push(Math.round(saldo*100)/100);
    cur.setDate(cur.getDate()+1);
  }

  const posC=saldos.filter(v=>v>=0).length,negC=saldos.filter(v=>v<0).length;
  document.getElementById('dayStats').innerHTML=\`
    <div class="sum-row"><div class="sum-left"><div class="sum-dot" style="background:var(--green)"></div>Dias positivos</div><div class="sum-val" style="color:var(--green)">\${posC}d</div></div>
    <div class="sum-row"><div class="sum-left"><div class="sum-dot" style="background:var(--red)"></div>Dias negativos</div><div class="sum-val" style="color:var(--red)">\${negC}d</div></div>
    <div class="sum-row"><div class="sum-left"><div class="sum-dot" style="background:var(--muted)"></div>Total dias</div><div class="sum-val">\${saldos.length}d</div></div>
    <div class="sum-row"><div class="sum-left"><div class="sum-dot" style="background:var(--blue)"></div>Mín / Máx</div>
      <div class="sum-val" style="font-size:10px">
        <span style="color:var(--red)">\${fmtK(Math.min(...saldos))}</span>
        <span style="color:var(--muted)"> / </span>
        <span style="color:var(--green)">\${fmtK(Math.max(...saldos))}</span>
      </div></div>\`;

  const many=labels.length>20;
  charts.c2=new Chart(document.getElementById('chart2'),{
    type:'bar',data:{labels,datasets:[{data:saldos,
      backgroundColor:saldos.map(v=>v>=0?'rgba(52,211,153,0.2)':'rgba(248,113,113,0.2)'),
      borderColor:saldos.map(v=>v>=0?'#34D399':'#F87171'),
      borderWidth:1.5,borderRadius:3,borderSkipped:false,
      datalabels:{display:true,anchor:saldos.map(v=>v>=0?'end':'start'),align:saldos.map(v=>v>=0?'end':'start'),clamp:true,
        rotation:many?-90:0,color:saldos.map(v=>v>=0?'#34D399':'#F87171'),
        font:{family:'DM Mono',size:many?8:10},formatter:v=>fmtK(v)}}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(5,9,26,0.95)',borderColor:'rgba(255,255,255,0.08)',borderWidth:1,titleColor:'#94a3b8',padding:11,callbacks:{label:c=>\`  Saldo: \${fmtK(c.raw)}  \${c.raw>=0?'✓':'✗'}\`}}},
      scales:{x:{grid:{display:false},ticks:{color:'#334155',font:{size:many?7:10,family:'DM Mono'},maxRotation:many?45:0,autoSkip:labels.length>60}},
        y:{grid:{color:'rgba(255,255,255,0.03)',drawBorder:false},border:{dash:[3,3]},ticks:{color:'#475569',font:{size:9,family:'DM Mono'},callback:v=>fmtK(v)},
          afterDataLimits(s){const r=Math.max(Math.abs(s.min),Math.abs(s.max))*0.12;s.max+=r;s.min-=r;}}},
      animation:{duration:500},layout:{padding:{top:many?44:30,right:70,bottom:2}}}});
}

function buildChart3(keys,liqV){
  if(charts.c3){charts.c3.destroy();charts.c3=null;}
  const tot=liqV.reduce((s,v)=>s+v,0);
  const el=document.getElementById('totLiq');el.textContent=(tot>=0?'+':'')+fmtK(tot);el.style.color=tot>=0?'var(--green)':'var(--red)';
  if(!keys.length)return;
  charts.c3=new Chart(document.getElementById('chart3'),{type:'bar',data:{labels:keys,datasets:[{data:liqV,backgroundColor:liqV.map(v=>v>=0?'rgba(52,211,153,0.18)':'rgba(248,113,113,0.18)'),borderColor:liqV.map(v=>v>=0?'#34D399':'#F87171'),borderWidth:1.5,borderRadius:4,borderSkipped:false,datalabels:{display:true,anchor:'end',align:liqV.map(v=>v>=0?'end':'start'),clamp:true,color:liqV.map(v=>v>=0?'#34D399':'#F87171'),font:{family:'DM Mono',size:9},formatter:v=>\`\${v>=0?'+':''}\${fmtK(v)}\`}}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(5,9,26,0.95)',borderColor:'rgba(255,255,255,0.08)',borderWidth:1,titleColor:'#94a3b8',padding:10}},
      scales:{x:{grid:{display:false},ticks:{color:'#475569',font:{size:9,family:'DM Mono'},maxRotation:0}},y:{grid:{color:'rgba(255,255,255,0.03)',drawBorder:false},border:{dash:[3,3]},ticks:{color:'#475569',font:{size:9,family:'DM Mono'},callback:v=>fmtK(v)}}},
      animation:{duration:400},layout:{padding:{top:22,right:60,bottom:2}}}});
}

function buildChart4(CP){
  if(charts.c4){charts.c4.destroy();charts.c4=null;}
  const catMap={};CP.forEach(r=>{catMap[r.categoria]=(catMap[r.categoria]||0)+r.valor;});
  if(!Object.keys(catMap).length){document.getElementById('totCat').textContent='—';return;}
  const sorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const tot=sorted.reduce((s,[,v])=>s+v,0);
  const labels=sorted.map(([k])=>k),values=sorted.map(([,v])=>v);
  const pcts=values.map(v=>tot>0?+(v/tot*100).toFixed(1):0);
  document.getElementById('totCat').textContent=fmtK(tot);
  const COLS=['#FB923C','#F87171','#FBBF24','#C084FC','#38BDF8'];
  charts.c4=new Chart(document.getElementById('chart4'),{type:'bar',data:{labels,datasets:[{data:values,backgroundColor:values.map((_,i)=>COLS[i%COLS.length]+'28'),borderColor:values.map((_,i)=>COLS[i%COLS.length]),borderWidth:1.5,borderRadius:4,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,color:values.map((_,i)=>COLS[i%COLS.length]),font:{family:'DM Mono',size:9},formatter:(v,c)=>\`\${fmtK(v)}  \${pcts[c.dataIndex]}%\`}}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(5,9,26,0.95)',borderColor:'rgba(255,255,255,0.08)',borderWidth:1,titleColor:'#94a3b8',padding:10,callbacks:{label:c=>\`  \${fmtK(c.raw)} (\${pcts[c.dataIndex]}%)\`}}},
      scales:{x:{grid:{display:false},ticks:{color:'#475569',font:{size:9,family:'DM Mono'},maxRotation:20,autoSkip:false}},y:{display:false}},
      animation:{duration:400},layout:{padding:{top:22,right:80,bottom:2}}}});
}

function updateRight(totCR,totCP,CP,CR){
  const liq=totCR-totCP,sf=SALDO_ATUAL+liq,cob=totCP>0?totCR/totCP:null;
  const dias=Math.round((dateTo-TODAY)/86400000);
  document.getElementById('kSaldo').textContent=fmtK(SALDO_ATUAL);
  document.getElementById('kEnt').textContent=fmtK(totCR);
  document.getElementById('kSai').textContent=fmtK(totCP);
  const sfEl=document.getElementById('kSF');sfEl.textContent=fmtK(sf);sfEl.className=\`kpi-num \${sf>=0?'g':'r'}\`;
  document.getElementById('kCob').textContent=cob!=null?cob.toFixed(2)+'x':'—';
  const pb=document.getElementById('projBig');pb.textContent=(sf>=0?'+':'')+fmtK(sf);pb.style.color=sf>=0?'var(--green)':'var(--red)';
  document.getElementById('projSub').textContent=\`Horizonte de \${dias} dias · até \${fmtBR(dateTo)}\`;
  document.getElementById('rSaldo').textContent=fmtK(SALDO_ATUAL);
  document.getElementById('rEnt').textContent=fmtK(totCR);
  document.getElementById('rSai').textContent=fmtK(totCP);
  const rp=document.getElementById('rProj');rp.textContent=(sf>=0?'+':'')+fmtK(sf);rp.style.color=sf>=0?'var(--green)':'var(--red)';
  document.getElementById('rCob').textContent=cob!=null?cob.toFixed(2)+'x':'—';

  const crByFav={};CR.forEach(r=>{crByFav[r.favorecido]=(crByFav[r.favorecido]||0)+r.valor;});
  const tCRs=Object.entries(crByFav).sort((a,b)=>b[1]-a[1]).slice(0,4);const mCR=tCRs[0]?.[1]||1;
  document.getElementById('topCR').innerHTML=tCRs.length
    ?tCRs.map(([n,v])=>\`<div class="mc-row"><div class="mc-label"><span>\${n.split(' ').slice(0,2).join(' ')}</span><span>\${fmtK(v)}</span></div><div class="mc-bar"><div class="mc-fill" style="width:\${Math.round(v/mCR*100)}%;background:var(--green);opacity:0.7"></div></div></div>\`).join('')
    :'<div class="empty-state">Nenhuma entrada no horizonte</div>';

  const cpByFav={};CP.forEach(r=>{cpByFav[r.favorecido]=(cpByFav[r.favorecido]||0)+r.valor;});
  const tCPs=Object.entries(cpByFav).sort((a,b)=>b[1]-a[1]).slice(0,4);const mCP=tCPs[0]?.[1]||1;
  document.getElementById('topCP').innerHTML=tCPs.length
    ?tCPs.map(([n,v])=>\`<div class="mc-row"><div class="mc-label"><span>\${n.split(' ').slice(0,2).join(' ')}</span><span>\${fmtK(v)}</span></div><div class="mc-bar"><div class="mc-fill" style="width:\${Math.round(v/mCP*100)}%;background:var(--red);opacity:0.7"></div></div></div>\`).join('')
    :'<div class="empty-state">Nenhuma saída no horizonte</div>';

  const prox=[...CP.map(r=>({...r,tipo:'CP'})),...CR.map(r=>({...r,tipo:'CR'}))]
    .sort((a,b)=>{const[da,ma,ya]=a.previsao.split('/').map(Number);const[db,mb,yb]=b.previsao.split('/').map(Number);return(ya*10000+ma*100+da)-(yb*10000+mb*100+db);}).slice(0,6);
  document.getElementById('proxVenc').innerHTML=prox.length
    ?\`<table class="mini-table"><thead><tr><th>Favorecido</th><th>Previsão</th><th>Valor</th></tr></thead><tbody>\${prox.map(r=>\`<tr><td style="max-width:76px;overflow:hidden;text-overflow:ellipsis;color:var(--muted)">\${r.favorecido.split(' ')[0]}</td><td style="color:var(--muted);font-family:'DM Mono',monospace">\${r.previsao}</td><td style="color:\${r.tipo==='CP'?'var(--red)':'var(--green)'}">\${r.tipo==='CP'?'−':'+'}\${fmtK(r.valor)}</td></tr>\`).join('')}</tbody></table>\`
    :'<div class="empty-state">Nenhuma previsão no horizonte</div>';
}

loadFromAPI();
</script>
`
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'width:100%;height:calc(100vh - 0px);border:none;display:block'
    iframe.srcdoc = html
    ref.current.innerHTML = ''
    ref.current.appendChild(iframe)
  }, [empresaAtiva, token])

  return <div ref={ref} style={{ width:'100%', height:'calc(100vh - 48px)' }} />
}
