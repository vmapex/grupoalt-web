"use client"
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function ConciliacaoPage() {
  const ref = useRef<HTMLDivElement>(null)
  const { token, empresaAtiva } = useAuthStore()

  useEffect(() => {
    if (!ref.current) return

    const empresaId = empresaAtiva?.id || 1
    const apiUrl = window.location.origin + '/api/proxy'

    const html = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">

<style>
:root {
  --bg: #05091A;
  --surface: rgba(255,255,255,0.034);
  --surface2: #0d1424;
  --border: rgba(255,255,255,0.07);
  --blue: #38BDF8;
  --green: #34D399;
  --red: #F87171;
  --amber: #FBBF24;
  --text: #F1F5F9;
  --muted: #64748B;
  --purple: #C084FC;
  --grid: rgba(56,189,248,0.02);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg);
  font-family: 'Syne', sans-serif;
  color: var(--text);
  min-height: 100vh;
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 48px 48px;
}


/* KPI STRIP */
.kpis { display: grid; grid-template-columns: repeat(4,1fr); border-bottom: 1px solid var(--border); }
.kpi { padding: 14px 22px; border-right: 1px solid var(--border); cursor: default; transition: background 0.2s; }
.kpi:last-child { border-right: none; }
.kpi:hover { background: rgba(255,255,255,0.01); }
.kl { font-size: 9px; text-transform: uppercase; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 5px; font-family: 'DM Mono', monospace; }
.kn { font-family: 'DM Mono', monospace; font-size: 20px; font-weight: 500; }
.kn.g { color: var(--green); } .kn.r { color: var(--red); } .kn.b { color: var(--blue); } .kn.a { color: var(--amber); }
.ks { font-size: 9px; color: var(--muted); margin-top: 2px; }

/* MAIN LAYOUT */
.layout { display: grid; grid-template-columns: 1fr 400px; min-height: calc(100vh - 115px); }
.charts-col { border-right: 1px solid var(--border); padding: 20px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.agent-col { display: flex; flex-direction: column; background: rgba(5,9,26,0.6); }

/* MINI CARDS */
.mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.card {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 12px; padding: 16px; position: relative; overflow: hidden;
}
.card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  opacity: 0.5;
}
.card.blue::before { background: linear-gradient(90deg,transparent,var(--blue),transparent); }
.card.green::before { background: linear-gradient(90deg,transparent,var(--green),transparent); }
.card.red::before { background: linear-gradient(90deg,transparent,var(--red),transparent); }
.card.amber::before { background: linear-gradient(90deg,transparent,var(--amber),transparent); }
.card-title { font-size: 9px; text-transform: uppercase; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 10px; font-family: 'DM Mono', monospace; }
.card-val { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 500; margin-bottom: 3px; }
.card-sub { font-size: 9px; color: var(--muted); }

/* CHART PLACEHOLDER */
.chart-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
.chart-title { font-size: 9px; text-transform: uppercase; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 14px; font-family: 'DM Mono', monospace; }
.bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 80px; }
.bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.bar { width: 100%; border-radius: 3px 3px 0 0; transition: opacity 0.2s; }
.bar:hover { opacity: 0.8; }
.bar-label { font-size: 7px; color: var(--muted); font-family: 'DM Mono', monospace; }

/* TABLE */
.table-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.table-card table { width: 100%; border-collapse: collapse; font-size: 10px; }
.table-card th { padding: 8px 12px; text-align: left; font-size: 8px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid var(--border); font-family: 'DM Mono', monospace; background: rgba(0,0,0,0.2); }
.table-card td { padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); }
.table-card tr:last-child td { border-bottom: none; }
.badge { display: inline-flex; padding: 2px 7px; border-radius: 99px; font-size: 8px; font-weight: 600; border: 1px solid; }
.badge.g { background: rgba(52,211,153,0.1); color: var(--green); border-color: rgba(52,211,153,0.2); }
.badge.a { background: rgba(251,191,36,0.1); color: var(--amber); border-color: rgba(251,191,36,0.2); }
.badge.r { background: rgba(248,113,113,0.1); color: var(--red); border-color: rgba(248,113,113,0.2); }

/* SIDE PANEL */
.agent-col { background: rgba(5,9,26,0.6); }
.agent-header { display: flex; align-items: center; gap: 10px; }
</style>


<!-- KPIs -->
<div class="kpis">
  <div class="kpi"><div class="kl">Total Conciliados</div><div class="kn g" id="kConcil">—</div><div class="ks" id="kConcilSub">Carregando...</div></div>
  <div class="kpi"><div class="kl">Total Pendentes</div><div class="kn a" id="kPend">—</div><div class="ks" id="kPendSub">Carregando...</div></div>
  <div class="kpi"><div class="kl">% Conciliação</div><div class="kn b" id="kPct">—</div><div class="ks">Do período</div></div>
  <div class="kpi"><div class="kl">Saldo de Caixa</div><div class="kn a" id="kSaldo">—</div><div class="ks">Posição atual</div></div>
</div>

<!-- LAYOUT -->
<div class="layout">

  <!-- CHARTS -->
  <div class="charts-col">

    <div class="mini-grid">
      <div class="card green">
        <div class="card-title">Conciliados no Mês</div>
        <div class="card-val" style="color:var(--green)" id="cMesConcil">—</div>
        <div class="card-sub" id="cMesConcilSub">Carregando...</div>
      </div>
      <div class="card amber">
        <div class="card-title">Pendentes no Mês</div>
        <div class="card-val" style="color:var(--amber)" id="cMesPend">—</div>
        <div class="card-sub" id="cMesPendSub">Carregando...</div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-title">Heatmap de Conciliação — Últimos 5 meses</div>
      <div id="heatmapArea" style="min-height:200px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:11px">
        Carregando dados...
      </div>
    </div>

    <div class="table-card">
      <table>
        <thead><tr>
          <th>Mês</th><th>Conciliados</th><th>Pendentes</th><th>% Concil.</th><th>Status</th>
        </tr></thead>
        <tbody id="monthTable">
          <tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">Carregando...</td></tr>
        </tbody>
      </table>
    </div>

  </div>

  <!-- DETAILS PANEL -->
  <div class="agent-col" style="padding:16px;display:flex;flex-direction:column;gap:14px;overflow-y:auto">

    <div class="agent-header" style="padding:14px 16px;border-bottom:1px solid var(--border);margin:-16px -16px 0;border-radius:0">
      <div class="agent-avatar" style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,rgba(56,189,248,0.3),rgba(52,211,153,0.2));border:1px solid rgba(56,189,248,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">✓</div>
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--text)">Resumo de Conciliação</div>
        <div style="font-size:9px;color:var(--muted);margin-top:1px">Dados carregados da API Omie</div>
      </div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:10px;font-family:'DM Mono',monospace">Saldo por conta</div>
      <div id="bankCards" style="display:flex;flex-direction:column;gap:8px"><span style="color:var(--muted);font-size:10px">Carregando...</span></div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:10px;font-family:'DM Mono',monospace">Estatísticas gerais</div>
      <div id="statsPanel" style="display:flex;flex-direction:column;gap:6px"><span style="color:var(--muted);font-size:10px">Carregando...</span></div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:10px;font-family:'DM Mono',monospace">Legenda do heatmap</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:10px">
        <div style="display:flex;align-items:center;gap:8px"><div style="width:14px;height:14px;border-radius:2px;background:rgba(52,211,153,0.4);flex-shrink:0"></div><span style="color:var(--muted)">90%+ conciliado</span></div>
        <div style="display:flex;align-items:center;gap:8px"><div style="width:14px;height:14px;border-radius:2px;background:rgba(251,191,36,0.3);flex-shrink:0"></div><span style="color:var(--muted)">50-89% conciliado</span></div>
        <div style="display:flex;align-items:center;gap:8px"><div style="width:14px;height:14px;border-radius:2px;background:rgba(248,113,113,0.3);flex-shrink:0"></div><span style="color:var(--muted)">Menos de 50%</span></div>
        <div style="display:flex;align-items:center;gap:8px"><div style="width:14px;height:14px;border-radius:2px;background:rgba(255,255,255,0.03);flex-shrink:0"></div><span style="color:var(--muted)">Sem movimentação</span></div>
      </div>
    </div>

  </div>
</div>

<script>
const API = '${apiUrl}';
const EMPRESA = ${empresaId};
const TOKEN = '${token}';

const fmtK = v => { const a=Math.abs(v); return (v<0?'−':'')+(a>=1000?(a/1000).toFixed(1)+'K':a.toFixed(2)); };

async function loadConciliacao() {
  try {
    const headers = { Authorization: 'Bearer ' + TOKEN };
    // Busca extrato dos últimos 5 meses em blocos de 85 dias (limitação Omie)
    const fmtDMY = d => String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
    const dFim = new Date();
    const dIni = new Date(); dIni.setMonth(dIni.getMonth() - 5); dIni.setDate(1);
    const BLOCK = 85;

    const ranges = [];
    let cursor = new Date(dIni);
    while (cursor < dFim) {
      const blockEnd = new Date(cursor);
      blockEnd.setDate(blockEnd.getDate() + BLOCK);
      if (blockEnd > dFim) blockEnd.setTime(dFim.getTime());
      ranges.push({ ini: fmtDMY(cursor), fim: fmtDMY(blockEnd) });
      cursor = new Date(blockEnd);
      cursor.setDate(cursor.getDate() + 1);
    }

    const [saldosRes, ...extratoResults] = await Promise.all([
      fetch(API + '/empresas/' + EMPRESA + '/saldos', { headers }),
      ...ranges.map(r =>
        fetch(API + '/empresas/' + EMPRESA + '/extrato?data_inicio=' + r.ini + '&data_fim=' + r.fim, { headers })
          .then(res => res.ok ? res.json() : [])
          .then(data => Array.isArray(data) ? data : (data.dados || data.lancamentos || []))
          .catch(() => [])
      )
    ]);

    const saldosJson = await saldosRes.json().catch(() => []);
    const seen = new Set();
    const lancamentos = [];
    extratoResults.flat().forEach(r => {
      const key = r.id || (r.data_lancamento + r.valor + r.descricao);
      if (!seen.has(key)) { seen.add(key); lancamentos.push(r); }
    });
    const saldos = Array.isArray(saldosJson) ? saldosJson : (saldosJson.dados || saldosJson.contas || saldosJson.saldos || []);
    const saldoTotal = saldos.reduce((s, c) => s + (c.saldo || 0), 0);
    document.getElementById('kSaldo').textContent = fmtK(saldoTotal);

    // Agrupa lançamentos por mês
    const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const monthMap = {};
    lancamentos.forEach(r => {
      const dt = r.data_lancamento || '';
      if (!dt || dt === '—') return;
      const parts = dt.split('/');
      if (parts.length < 3) return;
      const mIdx = parseInt(parts[1]) - 1;
      const year = parts[2];
      const key = MONTH_NAMES[mIdx] + '/' + year.slice(2);
      if (!monthMap[key]) monthMap[key] = { concil: 0, pend: 0 };
      if (r.conciliado === true) monthMap[key].concil++;
      else monthMap[key].pend++;
    });

    const meses = Object.entries(monthMap).map(([mes, v]) => ({
      mes, conciliados: v.concil, pendentes: v.pend
    }));

    let totalConcil = 0, totalPend = 0;

    const tableRows = meses.map(m => {
      const concil = m.conciliados;
      const pend = m.pendentes;
      const total = concil + pend;
      const pct = total > 0 ? Math.round(concil / total * 100) : 0;
      totalConcil += concil;
      totalPend += pend;
      const badge = pct >= 90 ? '<span class="badge g">OK</span>' :
                    pct >= 70 ? '<span class="badge a">Atenção</span>' :
                    '<span class="badge r">Baixo</span>';
      return '<tr>' +
        '<td>' + m.mes + '</td>' +
        '<td style="font-family:DM Mono,monospace;color:var(--green)">' + concil + '</td>' +
        '<td style="font-family:DM Mono,monospace;color:var(--amber)">' + pend + '</td>' +
        '<td style="font-family:DM Mono,monospace;color:var(--blue)">' + pct + '%</td>' +
        '<td>' + badge + '</td></tr>';
    });
    document.getElementById('monthTable').innerHTML = tableRows.length ? tableRows.join('') : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">Nenhum dado encontrado</td></tr>';

    // KPIs
    const totalAll = totalConcil + totalPend;
    const pctGeral = totalAll > 0 ? Math.round(totalConcil / totalAll * 100) : 0;
    document.getElementById('kConcil').textContent = totalConcil;
    document.getElementById('kConcilSub').textContent = 'Lançamentos ok';
    document.getElementById('kPend').textContent = totalPend;
    document.getElementById('kPendSub').textContent = 'Precisam atenção';
    document.getElementById('kPct').textContent = pctGeral + '%';

    // Month cards (último mês)
    if (meses.length > 0) {
      const lastMonth = meses[meses.length - 1];
      document.getElementById('cMesConcil').textContent = lastMonth.conciliados;
      document.getElementById('cMesConcilSub').textContent = lastMonth.mes;
      document.getElementById('cMesPend').textContent = lastMonth.pendentes;
      document.getElementById('cMesPendSub').textContent = lastMonth.mes;
    }

    // Heatmap + side panel
    buildHeatmap(meses);
    updateSidePanel(saldos, totalConcil, totalPend);

  } catch(e) {
    console.error('Erro conciliação:', e);
    document.getElementById('heatmapArea').textContent = 'Erro ao carregar: ' + e.message;
  }
}

function buildHeatmap(meses) {
  if (!meses.length) {
    document.getElementById('heatmapArea').textContent = 'Sem dados para heatmap';
    return;
  }

  // Build heatmap grid from dias data if available, otherwise from monthly totals
  let html = '<div style="display:flex;flex-direction:column;gap:8px;width:100%;padding:10px 0">';

  meses.forEach(m => {
    const concil = m.conciliados || m.conciliado || 0;
    const pend = m.pendentes || m.pendente || 0;
    const total = concil + pend;
    const pct = total > 0 ? Math.round(concil / total * 100) : 0;
    const mes = m.mes || m.month || m.periodo || '—';

    // Color based on percentage
    const color = pct >= 90 ? 'rgba(52,211,153,0.3)' :
                  pct >= 70 ? 'rgba(251,191,36,0.3)' :
                  pct >= 50 ? 'rgba(251,191,36,0.2)' :
                  'rgba(248,113,113,0.3)';
    const borderColor = pct >= 90 ? 'rgba(52,211,153,0.5)' :
                        pct >= 70 ? 'rgba(251,191,36,0.5)' :
                        'rgba(248,113,113,0.5)';

    // If month has daily data
    if (m.dias && Array.isArray(m.dias)) {
      html += '<div style="margin-bottom:4px"><div style="font-size:9px;color:var(--muted);margin-bottom:4px;font-family:DM Mono,monospace">' + mes + '</div>';
      html += '<div style="display:flex;gap:2px;flex-wrap:wrap">';
      m.dias.forEach(d => {
        const dc = d.conciliados || d.conciliado || 0;
        const dp = d.pendentes || d.pendente || 0;
        const dt = dc + dp;
        const dpct = dt > 0 ? Math.round(dc / dt * 100) : -1;
        let bg = 'rgba(255,255,255,0.03)';
        if (dpct >= 0) bg = dpct >= 90 ? 'rgba(52,211,153,0.4)' : dpct >= 50 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)';
        const dia = d.dia || d.day || '';
        html += '<div title="' + dia + ': ' + dc + ' concil / ' + dp + ' pend" style="width:14px;height:14px;border-radius:2px;background:' + bg + ';cursor:default"></div>';
      });
      html += '</div></div>';
    } else {
      // Monthly bar
      html += '<div style="display:flex;align-items:center;gap:10px;padding:4px 0">';
      html += '<div style="font-size:9px;color:var(--muted);font-family:DM Mono,monospace;width:60px">' + mes + '</div>';
      html += '<div style="flex:1;height:20px;background:rgba(255,255,255,0.03);border-radius:4px;overflow:hidden;position:relative;border:1px solid ' + borderColor + '">';
      html += '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:3px;transition:width 0.5s ease"></div>';
      html += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:9px;font-family:DM Mono,monospace;color:var(--text)">' + pct + '% (' + concil + '/' + total + ')</div>';
      html += '</div></div>';
    }
  });

  html += '</div>';
  document.getElementById('heatmapArea').innerHTML = html;
}

function updateSidePanel(saldos, totalConcil, totalPend) {
  const fmt = v => Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const colors = ['#38BDF8','#34D399','#FBBF24','#C084FC','#FB923C'];

  // Bank cards
  if (saldos.length) {
    document.getElementById('bankCards').innerHTML = saldos.map((c, i) => {
      const saldo = c.saldo || 0;
      const nome = c.descricao || c.nome || 'Conta ' + (i+1);
      const color = colors[i % colors.length];
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)">' +
        '<div style="display:flex;align-items:center;gap:6px"><div style="width:6px;height:6px;border-radius:50%;background:' + color + '"></div><span style="font-size:10px;color:var(--muted)">' + nome + '</span></div>' +
        '<span style="font-family:DM Mono,monospace;font-size:11px;color:' + (saldo >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(saldo) + '</span></div>';
    }).join('');
  } else {
    document.getElementById('bankCards').innerHTML = '<span style="color:var(--muted);font-size:10px">Nenhuma conta encontrada</span>';
  }

  // Stats
  const totalAll = totalConcil + totalPend;
  const pctGeral = totalAll > 0 ? Math.round(totalConcil / totalAll * 100) : 0;
  document.getElementById('statsPanel').innerHTML = [
    {label:'Total de lançamentos', val: totalAll, color:'var(--text)'},
    {label:'Conciliados', val: totalConcil, color:'var(--green)'},
    {label:'Pendentes', val: totalPend, color:'var(--amber)'},
    {label:'Taxa de conciliação', val: pctGeral + '%', color:'var(--blue)'},
  ].map(s => '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)">' +
    '<span style="font-size:10px;color:var(--muted)">' + s.label + '</span>' +
    '<span style="font-family:DM Mono,monospace;font-size:11px;color:' + s.color + '">' + s.val + '</span></div>').join('');
}

loadConciliacao();
</script>
`
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'width:100%;height:calc(100vh - 48px);border:none;display:block'
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts')
    iframe.srcdoc = html
    ref.current.innerHTML = ''
    ref.current.appendChild(iframe)
  }, [empresaAtiva, token])

  return <div ref={ref} style={{ width:'100%', height:'calc(100vh - 48px)' }} />
}
