"use client"
import { useEffect, useRef } from 'react'

export default function ExtratoPage() {
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
  --text:#F1F5F9;--muted:#64748B;--subtle:#0F172A;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);font-family:'Plus Jakarta Sans',sans-serif;color:var(--text);
  background-image:linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px);
  background-size:48px 48px;}

/* NAV */
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

/* KPI STRIP */
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

/* BODY */
.body{display:grid;grid-template-columns:1fr 220px;min-height:calc(100vh - 130px)}
.main-col{display:flex;flex-direction:column;border-right:1px solid var(--border)}

/* FILTER BAR */
.filter-bar{display:flex;align-items:center;gap:8px;padding:12px 22px;border-bottom:1px solid var(--border);flex-wrap:wrap;background:rgba(5,9,26,0.4)}
.search-wrap{position:relative;flex:1;min-width:200px}
.search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:13px;pointer-events:none}
.search-wrap input{width:100%;background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:11px;padding:7px 10px 7px 30px;border-radius:8px;font-family:inherit;transition:border-color 0.2s}
.search-wrap input:focus{outline:none;border-color:rgba(56,189,248,0.4)}
.search-wrap input::placeholder{color:var(--muted)}
.fsel{background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:11px;padding:7px 10px;border-radius:8px;font-family:inherit;cursor:pointer;transition:border-color 0.2s}
.fsel:focus{outline:none;border-color:rgba(56,189,248,0.4)}
.fsel option{background:#0f172a}
.filter-count{font-size:10px;color:var(--muted);font-family:'DM Mono',monospace;margin-left:4px;white-space:nowrap}
.export-btn{display:flex;align-items:center;gap:5px;padding:7px 13px;border-radius:8px;font-size:10px;border:1px solid var(--border);background:var(--surface);color:var(--muted);cursor:pointer;font-family:inherit;transition:all 0.2s;white-space:nowrap}
.export-btn:hover{border-color:rgba(52,211,153,0.4);color:var(--green)}

/* SUMMARY ROW */
.summary-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 22px;border-bottom:1px solid var(--border)}
.sum-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px}
.sum-icon{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.sum-label{font-size:9px;text-transform:uppercase;letter-spacing:0.8px;color:var(--muted)}
.sum-val{font-family:'DM Mono',monospace;font-size:14px;margin-top:1px}

/* TABLE */
.table-wrap{flex:1;overflow-y:auto;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:11px;min-width:700px}
thead{position:sticky;top:0;z-index:5}
thead tr{background:#080d1e;border-bottom:1px solid var(--border)}
th{padding:9px 14px;text-align:left;font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;white-space:nowrap;cursor:pointer;user-select:none;transition:color 0.15s;font-family:'DM Mono',monospace}
th:hover{color:var(--text)}
th.r{text-align:right}
th .sort-ico{opacity:0.3;margin-left:3px;font-size:8px}
th.sorted .sort-ico{opacity:1;color:var(--blue)}
tbody tr{border-bottom:1px solid rgba(255,255,255,0.03);transition:background 0.12s;cursor:default}
tbody tr:hover{background:rgba(255,255,255,0.025)}
tbody tr.entrada-row:hover{background:rgba(52,211,153,0.04)}
tbody tr.saida-row:hover{background:rgba(248,113,113,0.04)}
td{padding:8px 14px;color:var(--text);font-size:11px;white-space:nowrap;vertical-align:middle}
td.mono{font-family:'DM Mono',monospace}
td.muted{color:var(--muted)}
td.val-g{font-family:'DM Mono',monospace;color:var(--green);text-align:right;font-weight:500}
td.val-r{font-family:'DM Mono',monospace;color:var(--red);text-align:right;font-weight:500}
td.obs{max-width:180px;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font-size:10px}

/* BADGES */
.badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:99px;font-size:9px;font-weight:600;letter-spacing:0.3px;white-space:nowrap}
.badge.entrada{background:rgba(52,211,153,0.12);color:var(--green);border:1px solid rgba(52,211,153,0.2)}
.badge.saida{background:rgba(248,113,113,0.12);color:var(--red);border:1px solid rgba(248,113,113,0.2)}
.badge.concil{background:rgba(52,211,153,0.1);color:var(--green);border:1px solid rgba(52,211,153,0.15)}
.badge.pend{background:rgba(251,191,36,0.1);color:var(--amber);border:1px solid rgba(251,191,36,0.15)}

/* DOT */
.bank-dot{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:5px;flex-shrink:0}

/* RIGHT PANEL */
.right-panel{padding:16px 14px;display:flex;flex-direction:column;gap:14px}
.panel-title{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:2px}
.bank-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;transition:border-color 0.2s}
.bank-card:hover{border-color:rgba(56,189,248,0.2)}
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

/* TABLE FOOTER */
.table-footer{padding:10px 22px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--muted);background:rgba(5,9,26,0.6)}
.tf-right{font-family:'DM Mono',monospace;font-size:10px}

@keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
.kpi{animation:fadeUp 0.35s ease both}
.kpi:nth-child(1){animation-delay:.04s}.kpi:nth-child(2){animation-delay:.08s}
.kpi:nth-child(3){animation-delay:.12s}.kpi:nth-child(4){animation-delay:.16s}.kpi:nth-child(5){animation-delay:.20s}
.sum-card{animation:fadeUp 0.4s ease both}
.sum-card:nth-child(1){animation-delay:.1s}.sum-card:nth-child(2){animation-delay:.14s}.sum-card:nth-child(3){animation-delay:.18s}
</style>

<div class="nav">
  <div style="display:flex;align-items:baseline">
    <span class="logo-name">ALT MAX</span><span class="logo-tag">LOG</span>
  </div>
  <div class="nav-tabs">
    <button class="ntab" onclick="sendPrompt('Mostrar Caixa Realizado no novo layout')">Caixa Realizado</button>
    <button class="ntab" onclick="sendPrompt('Mostrar DRE Tabela no novo layout')">DRE Tabela</button>
    <button class="ntab active">Extrato</button>
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
    <div class="kpi-label">Saldo Inicial</div><div class="kpi-num w" id="kSI">0,00</div><div class="kpi-sub">Base do período</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Entradas</div><div class="kpi-num g" id="kEnt">303.453,50</div><div class="kpi-sub">Receitas realizadas</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--red)"></div>
    <div class="kpi-label">Saídas</div><div class="kpi-num r" id="kSai">297.552,49</div><div class="kpi-sub">Custos + despesas</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Saldo Final</div><div class="kpi-num g" id="kSF">5.901,01</div><div class="kpi-sub">Posição atual</div></div>
  <div class="kpi"><div class="kpi-glow" style="background:var(--green)"></div>
    <div class="kpi-label">Balanço</div><div class="kpi-num g" id="kBal">5.901,01</div><div class="kpi-sub">Resultado líquido</div></div>
</div>

<div class="body">
  <div class="main-col">

    <!-- FILTER BAR -->
    <div class="filter-bar">
      <div class="search-wrap">
        <span class="search-icon">⌕</span>
        <input type="text" id="fSearch" placeholder="Buscar por favorecido, categoria ou obs..." oninput="applyFilters()">
      </div>
      <select class="fsel" id="fBanco" onchange="applyFilters()">
        <option value="">Todos os bancos</option>
        <option>Santander</option>
        <option>BTG</option>
      </select>
      <select class="fsel" id="fTipo" onchange="applyFilters()">
        <option value="">Tipo: todos</option>
        <option value="E">Entradas</option>
        <option value="S">Saídas</option>
      </select>
      <select class="fsel" id="fCateg" onchange="applyFilters()">
        <option value="">Todas as categorias</option>
        <option>(+) Mútuos</option>
        <option>Folha PJ</option>
        <option>Software / TI</option>
        <option>Outros Impostos e Taxas</option>
        <option>Descarga</option>
        <option>Despesas com Viagens</option>
        <option>Resgate Aplicação Automática</option>
        <option>Aplicação Automática</option>
        <option>E-mail</option>
        <option>Agregados</option>
        <option>Seguro Carga</option>
      </select>
      <select class="fsel" id="fConcil" onchange="applyFilters()">
        <option value="">Conciliação: todas</option>
        <option value="S">Conciliados</option>
        <option value="N">Pendentes</option>
      </select>
      <span class="filter-count" id="filterCount">— lançamentos</span>
      <button class="export-btn" onclick="sendPrompt('Como exportar o extrato para Excel?')">⬇ Exportar ↗</button>
    </div>

    <!-- SUMMARY ROW -->
    <div class="summary-row">
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(52,211,153,0.12)">↑</div>
        <div><div class="sum-label">Entradas filtradas</div><div class="sum-val g" id="sEnt" style="color:var(--green)">—</div></div>
      </div>
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(248,113,113,0.12)">↓</div>
        <div><div class="sum-label">Saídas filtradas</div><div class="sum-val r" id="sSai" style="color:var(--red)">—</div></div>
      </div>
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(56,189,248,0.12)">=</div>
        <div><div class="sum-label">Resultado filtrado</div><div class="sum-val" id="sRes" style="color:#fff">—</div></div>
      </div>
    </div>

    <!-- TABLE -->
    <div class="table-wrap" id="tableWrap">
      <table>
        <thead>
          <tr>
            <th onclick="sortTable('data')">Data <span class="sort-ico" id="s-data">↕</span></th>
            <th>Banco</th>
            <th onclick="sortTable('valor')">Valor <span class="sort-ico" id="s-valor">↕</span></th>
            <th onclick="sortTable('favorecido')">Favorecido <span class="sort-ico" id="s-favorecido">↕</span></th>
            <th onclick="sortTable('categoria')">Categoria <span class="sort-ico" id="s-categoria">↕</span></th>
            <th style="text-align:center">Status</th>
            <th class="obs">Obs</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>

    <div class="table-footer">
      <span id="footerLeft">Mostrando — de — lançamentos</span>
      <span class="tf-right" id="footerRight"></span>
    </div>
  </div>

  <!-- RIGHT PANEL -->
  <div class="right-panel">
    <div>
      <div class="panel-title">Saldo por banco</div>
    </div>

    <div class="bank-card">
      <div class="bank-name"><span class="bank-dot" style="background:var(--blue)"></span>01 · Santander</div>
      <div class="bank-saldo">51.032,24</div>
      <div class="bank-sub">Saldo do dia</div>
      <div class="bank-mini-bar"><div class="bank-mini-fill" style="width:0%;background:var(--blue)" id="barSant"></div></div>
    </div>

    <div class="bank-card">
      <div class="bank-name"><span class="bank-dot" style="background:var(--muted)"></span>02 · BTG</div>
      <div class="bank-saldo zero">0,00</div>
      <div class="bank-sub">Sem movimentação</div>
      <div class="bank-mini-bar"><div class="bank-mini-fill" style="width:0%;background:var(--muted)" id="barBTG"></div></div>
    </div>

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
const fmt = v => Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK = v => {const a=Math.abs(v);return (v<0?'−':'')+(a>=1000?(a/1000).toFixed(1)+'K':a.toFixed(2));};
const BANK_COLORS = {Santander:'#38BDF8', BTG:'#64748B'};

// ── DATASET ──────────────────────────────────────────────────────────────────
const RAW = [
  {data:'24/10/2025',banco:'Santander',valor:40,   favorecido:'Grupo Alt',          categoria:'(+) Mútuos',              tipo:'E',concil:'S',obs:''},
  {data:'24/10/2025',banco:'Santander',valor:42,   favorecido:'Grupo Alt',          categoria:'(+) Mútuos',              tipo:'E',concil:'S',obs:''},
  {data:'24/10/2025',banco:'Santander',valor:45,   favorecido:'Grupo Alt',          categoria:'(+) Mútuos',              tipo:'E',concil:'S',obs:''},
  {data:'24/10/2025',banco:'Santander',valor:127,  favorecido:'Santander',          categoria:'Aplicação Automática',    tipo:'S',concil:'S',obs:''},
  {data:'27/10/2025',banco:'Santander',valor:100,  favorecido:'Grupo Alt',          categoria:'(+) Mútuos',              tipo:'E',concil:'S',obs:''},
  {data:'27/10/2025',banco:'Santander',valor:127,  favorecido:'Santander',          categoria:'Resgate Aplicação Automática',tipo:'E',concil:'S',obs:''},
  {data:'27/10/2025',banco:'Santander',valor:204.6,favorecido:'Bsoft Internetworks',categoria:'Software / TI',           tipo:'S',concil:'S',obs:''},
  {data:'31/10/2025',banco:'Santander',valor:750,  favorecido:'Grupo Alt',          categoria:'(+) Mútuos',              tipo:'E',concil:'S',obs:''},
  {data:'31/10/2025',banco:'Santander',valor:750,  favorecido:'Weldes Martins',     categoria:'Outros Impostos e Taxas', tipo:'S',concil:'S',obs:''},
  {data:'05/11/2025',banco:'Santander',valor:750,  favorecido:'Grupo Alt',          categoria:'(+) Mútuos',              tipo:'E',concil:'S',obs:''},
  {data:'05/11/2025',banco:'Santander',valor:750,  favorecido:'João Vitor Reis',    categoria:'Folha PJ',                tipo:'S',concil:'S',obs:'PIX ENVIADO 63 267 742 JOAO VIT…'},
  {data:'07/11/2025',banco:'Santander',valor:749,  favorecido:'Omiexperience',      categoria:'Software / TI',           tipo:'S',concil:'S',obs:'PIX ENVIADO OMIEXPERIENCE LTDA'},
  {data:'07/11/2025',banco:'Santander',valor:750,  favorecido:'Grupo Alt',          categoria:'(+) Mútuos',              tipo:'E',concil:'S',obs:''},
  {data:'07/11/2025',banco:'Santander',valor:12000,favorecido:'Grupo Alt',          categoria:'(+) Mútuos',              tipo:'E',concil:'S',obs:''},
  {data:'07/11/2025',banco:'Santander',valor:12000,favorecido:'LHC Assessoria',     categoria:'Folha PJ',                tipo:'S',concil:'S',obs:'PIX ENVIADO LHC ASSESSORIA E L…'},
  {data:'10/11/2025',banco:'Santander',valor:2000, favorecido:'Flash App',          categoria:'Despesas com Viagens',    tipo:'S',concil:'S',obs:''},
  {data:'10/11/2025',banco:'Santander',valor:2000, favorecido:'Grupo Alt',          categoria:'(+) Mútuos',              tipo:'E',concil:'S',obs:''},
  {data:'24/11/2025',banco:'Santander',valor:214.23,favorecido:'SkySoftware',       categoria:'E-mail',                  tipo:'S',concil:'S',obs:'PAGAMENTO DE BOLETO OUTROS…'},
  {data:'24/11/2025',banco:'Santander',valor:1175, favorecido:'Cooper Charque',     categoria:'Descarga',                tipo:'S',concil:'S',obs:'PIX ENVIADO COOPERCHARQUE IN…'},
  {data:'24/11/2025',banco:'Santander',valor:1500, favorecido:'Flash App',          categoria:'Despesas com Viagens',    tipo:'S',concil:'S',obs:''},
  {data:'24/11/2025',banco:'Santander',valor:2000, favorecido:'Flash App',          categoria:'Despesas com Viagens',    tipo:'S',concil:'S',obs:''},
  {data:'24/11/2025',banco:'Santander',valor:2500, favorecido:'Grupo Alt',          categoria:'(+) Mútuos',              tipo:'E',concil:'S',obs:''},
  {data:'15/12/2025',banco:'Santander',valor:9263, favorecido:'Estado do Pará',     categoria:'ICMS',                    tipo:'S',concil:'S',obs:'DARF ICMS'},
  {data:'20/12/2025',banco:'Santander',valor:21750,favorecido:'LHC Assessoria',     categoria:'Folha PJ',                tipo:'S',concil:'S',obs:''},
  {data:'20/12/2025',banco:'Santander',valor:34978,favorecido:'Taipastur',          categoria:'Agregados',               tipo:'S',concil:'S',obs:''},
  {data:'22/12/2025',banco:'Santander',valor:45700,favorecido:'Ramax Itariri',      categoria:'Receita MI',              tipo:'E',concil:'S',obs:''},
  {data:'10/01/2026',banco:'Santander',valor:13287,favorecido:'Estado de SP',       categoria:'ICMS',                    tipo:'S',concil:'S',obs:'DARF ICMS'},
  {data:'15/01/2026',banco:'Santander',valor:48591,favorecido:'Taipastur',          categoria:'Agregados',               tipo:'S',concil:'S',obs:''},
  {data:'20/01/2026',banco:'Santander',valor:78108,favorecido:'Ramax Rondon',       categoria:'Receita MI',              tipo:'E',concil:'S',obs:''},
  {data:'25/01/2026',banco:'Santander',valor:18353,favorecido:'LHC Assessoria',     categoria:'Folha PJ',                tipo:'S',concil:'S',obs:''},
  {data:'10/02/2026',banco:'Santander',valor:8619, favorecido:'Receita Federal',    categoria:'ICMS',                    tipo:'S',concil:'N',obs:'DARF'},
  {data:'15/02/2026',banco:'Santander',valor:23117,favorecido:'Taipastur',          categoria:'Agregados',               tipo:'S',concil:'N',obs:''},
  {data:'20/02/2026',banco:'Santander',valor:86944,favorecido:'Ramax Itariri',      categoria:'Receita MI',              tipo:'E',concil:'N',obs:''},
  {data:'25/02/2026',banco:'Santander',valor:10573,favorecido:'LHC Assessoria',     categoria:'Folha PJ',                tipo:'S',concil:'N',obs:''},
  {data:'05/03/2026',banco:'Santander',valor:36990,favorecido:'Taipastur',          categoria:'Agregados',               tipo:'S',concil:'N',obs:''},
  {data:'10/03/2026',banco:'Santander',valor:36990,favorecido:'Ramax Cachoeira',    categoria:'Receita MI',              tipo:'E',concil:'N',obs:''},
  {data:'15/03/2026',banco:'Santander',valor:8141, favorecido:'LHC Assessoria',     categoria:'Folha PJ',                tipo:'S',concil:'N',obs:''},
];

let filtered = [...RAW];
let sortCol = 'data', sortDir = -1;

// parse date dd/mm/yyyy → sortable
const parseDate = s => { const [d,m,y] = s.split('/'); return \`\${y}\${m}\${d}\`; };

function applyFilters(){
  const q     = document.getElementById('fSearch').value.toLowerCase();
  const banco = document.getElementById('fBanco').value;
  const tipo  = document.getElementById('fTipo').value;
  const categ = document.getElementById('fCateg').value;
  const concil= document.getElementById('fConcil').value;

  filtered = RAW.filter(r => {
    if(q && ![r.favorecido,r.categoria,r.obs].some(f => f.toLowerCase().includes(q))) return false;
    if(banco && r.banco !== banco) return false;
    if(tipo  && r.tipo  !== tipo)  return false;
    if(categ && r.categoria !== categ) return false;
    if(concil && r.concil !== concil) return false;
    return true;
  });

  renderTable();
  updateSummary();
}

function sortTable(col) {
  if(sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = -1; }
  document.querySelectorAll('.sort-ico').forEach(e => e.textContent = '↕');
  const el = document.getElementById('s-'+col);
  if(el){ el.textContent = sortDir === -1 ? '↓' : '↑'; el.closest('th').classList.add('sorted'); }
  filtered.sort((a,b)=>{
    let va = col === 'data' ? parseDate(a.data) : col === 'valor' ? a.valor : a[col]?.toLowerCase();
    let vb = col === 'data' ? parseDate(b.data) : col === 'valor' ? b.valor : b[col]?.toLowerCase();
    return va < vb ? sortDir : va > vb ? -sortDir : 0;
  });
  renderTable();
}

function renderTable(){
  const show = filtered.slice(0, 200);
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = show.map(r => {
    const isE = r.tipo === 'E';
    const trCls = isE ? 'entrada-row' : 'saida-row';
    const valCls = isE ? 'val-g' : 'val-r';
    const sign = isE ? '+' : '−';
    const concilBadge = r.concil === 'S'
      ? '<span class="badge concil">✓ Conciliado</span>'
      : '<span class="badge pend">⏳ Pendente</span>';
    const bankColor = BANK_COLORS[r.banco] || '#64748b';
    return \`<tr class="\${trCls}">
      <td class="mono" style="color:var(--muted)">\${r.data}</td>
      <td><span style="display:inline-flex;align-items:center"><span class="bank-dot" style="background:\${bankColor}"></span><span style="font-size:10px;color:var(--muted)">\${r.banco}</span></span></td>
      <td class="\${valCls}">\${sign} \${fmt(r.valor)}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">\${r.favorecido}</td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font-size:10px">\${r.categoria}</td>
      <td style="text-align:center">\${concilBadge}</td>
      <td class="obs">\${r.obs || '—'}</td>
    </tr>\`;
  }).join('');

  const total = filtered.length;
  document.getElementById('footerLeft').textContent = \`Mostrando \${Math.min(show.length, total)} de \${total} lançamentos\`;
  document.getElementById('filterCount').textContent = \`\${total} lançamentos\`;

  const totEnt = filtered.filter(r=>r.tipo==='E').reduce((s,r)=>s+r.valor,0);
  const totSai = filtered.filter(r=>r.tipo==='S').reduce((s,r)=>s+r.valor,0);
  const res = totEnt - totSai;
  document.getElementById('footerRight').textContent = \`Resultado filtrado: \${res>=0?'+':''}\${fmtK(res)}\`;
}

function updateSummary(){
  const ent = filtered.filter(r=>r.tipo==='E').reduce((s,r)=>s+r.valor,0);
  const sai = filtered.filter(r=>r.tipo==='S').reduce((s,r)=>s+r.valor,0);
  const res = ent - sai;
  document.getElementById('sEnt').textContent = fmtK(ent);
  document.getElementById('sSai').textContent = fmtK(sai);
  const el = document.getElementById('sRes');
  el.textContent = fmtK(res);
  el.style.color = res >= 0 ? 'var(--green)' : 'var(--red)';

  // right panel stats
  const allEnt = RAW.filter(r=>r.tipo==='E').reduce((s,r)=>s+r.valor,0);
  const allSai = RAW.filter(r=>r.tipo==='S').reduce((s,r)=>s+r.valor,0);
  const concil = RAW.filter(r=>r.concil==='S').length;
  const pend   = RAW.filter(r=>r.concil==='N').length;
  const pct    = Math.round(concil/(concil+pend)*100);
  document.getElementById('pTotal').textContent  = RAW.length;
  document.getElementById('pConcil').textContent = concil;
  document.getElementById('pPend').textContent   = pend;
  document.getElementById('pPct').textContent    = pct + '%';

  // bank bars — Santander has all volume
  setTimeout(() => {
    document.getElementById('barSant').style.width = '100%';
    document.getElementById('barBTG').style.width  = '0%';
  }, 400);

  // top categories
  const catMap = {};
  RAW.forEach(r => { catMap[r.categoria] = (catMap[r.categoria]||0) + r.valor; });
  const topCats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxVal  = topCats[0]?.[1] || 1;
  document.getElementById('topCateg').innerHTML = topCats.map(([cat,val])=>\`
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

// ── INIT ─────────────────────────────────────────────────────────────────────
applyFilters();
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
