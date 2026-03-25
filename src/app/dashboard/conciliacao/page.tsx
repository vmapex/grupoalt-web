"use client"
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function ConciliacaoPage() {
  const ref = useRef<HTMLDivElement>(null)
  const { token, empresaAtiva } = useAuthStore()

  useEffect(() => {
    if (!ref.current) return

    const empresaId = empresaAtiva?.id || 1
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://altmax-api-production.up.railway.app'

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

/* NAV */
.nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; border-bottom: 1px solid var(--border);
  background: rgba(5,9,26,0.95); position: sticky; top: 0; z-index: 20;
  backdrop-filter: blur(10px);
}
.logo { font-size: 15px; font-weight: 800; letter-spacing: 2px; color: var(--text); }
.logo span { color: var(--blue); font-size: 8px; vertical-align: super; letter-spacing: 3px; margin-left: 4px; }
.nav-right { display: flex; align-items: center; gap: 8px; }
.agent-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 8px;
  background: rgba(192,132,252,0.1); border: 1px solid rgba(192,132,252,0.3);
  font-size: 10px; color: var(--purple); font-weight: 600;
}
.agent-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--purple); animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }

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

/* ── AGENT PANEL ── */
.agent-header {
  padding: 14px 16px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
  background: rgba(192,132,252,0.04);
}
.agent-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(192,132,252,0.3), rgba(56,189,248,0.2));
  border: 1px solid rgba(192,132,252,0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}
.agent-name { font-size: 12px; font-weight: 700; color: var(--text); }
.agent-desc { font-size: 9px; color: var(--muted); margin-top: 1px; }
.agent-status { margin-left: auto; display: flex; align-items: center; gap: 5px; font-size: 9px; color: var(--purple); }

/* CHAT */
.chat-area { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.msg { display: flex; gap: 8px; animation: fadeUp 0.3s ease; }
@keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.msg.user { flex-direction: row-reverse; }
.msg-avatar { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; }
.msg.assistant .msg-avatar { background: linear-gradient(135deg,rgba(192,132,252,0.3),rgba(56,189,248,0.2)); border: 1px solid rgba(192,132,252,0.3); }
.msg.user .msg-avatar { background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.2); font-size: 11px; }
.msg-bubble { max-width: 85%; padding: 10px 13px; border-radius: 12px; font-size: 11px; line-height: 1.6; }
.msg.assistant .msg-bubble { background: rgba(255,255,255,0.04); border: 1px solid var(--border); color: var(--text); border-radius: 2px 12px 12px 12px; }
.msg.user .msg-bubble { background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.2); color: var(--text); border-radius: 12px 2px 12px 12px; }
.msg-bubble strong { color: var(--blue); font-weight: 600; }
.msg-bubble .highlight { color: var(--green); font-family: 'DM Mono', monospace; font-size: 12px; }
.msg-bubble .warn { color: var(--amber); }
.msg-bubble ul { margin: 6px 0 0 14px; }
.msg-bubble li { margin-bottom: 3px; }

/* TYPING */
.typing { display: flex; align-items: center; gap: 4px; padding: 10px 13px; }
.typing span { width: 5px; height: 5px; border-radius: 50%; background: var(--purple); animation: bounce 1.2s infinite; }
.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

/* SUGGESTIONS */
.suggestions { padding: 0 14px 10px; display: flex; flex-direction: column; gap: 5px; }
.sug-label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 4px; font-family: 'DM Mono', monospace; }
.sug-btn {
  padding: 7px 11px; border-radius: 7px; font-size: 10px;
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text); cursor: pointer; text-align: left;
  font-family: 'Syne', sans-serif; transition: all 0.2s;
  display: flex; align-items: center; gap: 7px;
}
.sug-btn:hover { border-color: rgba(192,132,252,0.4); background: rgba(192,132,252,0.06); color: var(--purple); }
.sug-icon { font-size: 12px; }

/* INPUT */
.chat-input-area { padding: 12px 14px; border-top: 1px solid var(--border); display: flex; gap: 8px; background: rgba(5,9,26,0.5); }
.chat-input {
  flex: 1; background: var(--surface2); border: 1px solid var(--border);
  color: var(--text); font-size: 11px; padding: 9px 13px;
  border-radius: 8px; font-family: 'Syne', sans-serif;
  resize: none; outline: none; transition: border-color 0.2s;
  height: 40px; line-height: 1.4;
}
.chat-input:focus { border-color: rgba(192,132,252,0.4); }
.chat-input::placeholder { color: var(--muted); }
.send-btn {
  width: 40px; height: 40px; border-radius: 8px; flex-shrink: 0;
  background: rgba(192,132,252,0.15); border: 1px solid rgba(192,132,252,0.3);
  color: var(--purple); cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.send-btn:hover { background: rgba(192,132,252,0.25); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* CONTEXT PILL */
.ctx-pill {
  margin: 0 14px 8px; padding: 6px 10px; border-radius: 7px;
  background: rgba(52,211,153,0.06); border: 1px solid rgba(52,211,153,0.15);
  font-size: 9px; color: rgba(52,211,153,0.7); font-family: 'DM Mono', monospace;
  display: flex; align-items: center; gap: 5px;
}
</style>

<!-- NAV -->
<div class="nav">
  <div class="logo">ALT MAX <span>LOG</span></div>
  <div class="nav-right">
    <div class="agent-badge">
      <div class="agent-dot"></div>
      Agente IA ativo
    </div>
  </div>
</div>

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

  <!-- AGENT PANEL -->
  <div class="agent-col">

    <div class="agent-header">
      <div class="agent-avatar">✦</div>
      <div>
        <div class="agent-name">Claude — Analista Financeiro</div>
        <div class="agent-desc">Analisa os dados do dashboard em tempo real</div>
      </div>
      <div class="agent-status">
        <div class="agent-dot"></div>
        Online
      </div>
    </div>

    <div class="chat-area" id="chatArea"></div>

    <div class="ctx-pill">
      ⬡ Contexto carregado: DRE Mar/26 · Caixa · CP/CR · 5 meses
    </div>

    <div class="suggestions" id="suggestions">
      <div class="sug-label">Perguntas sugeridas</div>
      <button class="sug-btn" onclick="sendSuggestion(this.dataset.q)" data-q="Por que a margem de contribuição está em apenas 12%? O que pode ser feito para melhorar?">
        <span class="sug-icon">📉</span>Por que a margem está em 12%?
      </button>
      <button class="sug-btn" onclick="sendSuggestion(this.dataset.q)" data-q="O custo fixo está em 42,9% da receita bruta. Isso é preocupante para uma empresa de logística?">
        <span class="sug-icon">⚠️</span>O custo fixo de 42,9% é alto demais?
      </button>
      <button class="sug-btn" onclick="sendSuggestion(this.dataset.q)" data-q="Crie um resumo executivo do resultado financeiro de março de 2026 para apresentar ao diretor em 3 bullet points.">
        <span class="sug-icon">📋</span>Resumo executivo para o diretor
      </button>
      <button class="sug-btn" onclick="sendSuggestion(this.dataset.q)" data-q="O RNOP representa 44% da receita bruta. O negócio depende muito de receitas não operacionais. Isso é um risco?">
        <span class="sug-icon">🔍</span>O negócio depende de RNOP — é um risco?
      </button>
    </div>

    <div class="chat-input-area">
      <textarea class="chat-input" id="chatInput" placeholder="Pergunte sobre os dados do dashboard..." rows="1"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage()}"></textarea>
      <button class="send-btn" id="sendBtn" onclick="sendMessage()">↑</button>
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
    const [concRes, saldosRes] = await Promise.all([
      fetch(API + '/empresas/' + EMPRESA + '/conciliacao/calendario', { headers: { Authorization: 'Bearer ' + TOKEN } }),
      fetch(API + '/empresas/' + EMPRESA + '/saldos', { headers: { Authorization: 'Bearer ' + TOKEN } })
    ]);
    const concData = await concRes.json();
    const saldosJson = await saldosRes.json();

    const saldos = Array.isArray(saldosJson) ? saldosJson : (saldosJson.contas || saldosJson.saldos || []);
    const saldoTotal = saldos.reduce((s, c) => s + (c.saldo || 0), 0);
    document.getElementById('kSaldo').textContent = fmtK(saldoTotal);

    // concData pode ser um objeto com meses ou array
    const meses = Array.isArray(concData) ? concData : (concData.meses || concData.calendario || concData.items || []);

    let totalConcil = 0, totalPend = 0;

    // Build month table
    const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const tableRows = meses.map(m => {
      const concil = m.conciliados || m.conciliado || 0;
      const pend = m.pendentes || m.pendente || 0;
      const total = concil + pend;
      const pct = total > 0 ? Math.round(concil / total * 100) : 0;
      totalConcil += concil;
      totalPend += pend;
      const mes = m.mes || m.month || m.periodo || '—';
      const badge = pct >= 90 ? '<span class="badge g">OK</span>' :
                    pct >= 70 ? '<span class="badge a">Atenção</span>' :
                    '<span class="badge r">Baixo</span>';
      return '<tr>' +
        '<td>' + mes + '</td>' +
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

    // Month cards
    if (meses.length > 0) {
      const lastMonth = meses[meses.length - 1];
      const lc = lastMonth.conciliados || lastMonth.conciliado || 0;
      const lp = lastMonth.pendentes || lastMonth.pendente || 0;
      document.getElementById('cMesConcil').textContent = lc;
      document.getElementById('cMesConcilSub').textContent = lastMonth.mes || 'Mês atual';
      document.getElementById('cMesPend').textContent = lp;
      document.getElementById('cMesPendSub').textContent = lastMonth.mes || 'Mês atual';
    }

    // Heatmap
    buildHeatmap(meses);

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

const FINANCIAL_CONTEXT = \`
Você é o Claude, analista financeiro integrado ao dashboard da ALT MAX LOG.
Responda SEMPRE em português brasileiro, de forma direta e profissional.
Use emojis com moderação para facilitar leitura.
Analise os dados de conciliação bancária e saldos exibidos no dashboard.
Seja conciso, prático e focado em ação.
Máximo 200 palavras por resposta, use listas quando ajudar.
\`;

const chatArea = document.getElementById('chatArea');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const suggestions = document.getElementById('suggestions');
let isLoading = false;
let history = [];

// Init
window.onload = () => {
  loadConciliacao();
  addMessage('assistant', \`Olá! Estou carregando os dados de conciliação da **ALT MAX LOG**.\\n\\nPosso analisar status de conciliação, identificar pendências e gerar resumos. O que você gostaria de saber?\`);
};

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = \`msg \${role}\`;
  const avatar = role === 'assistant' ? '✦' : '👤';
  div.innerHTML = \`
    <div class="msg-avatar">\${avatar}</div>
    <div class="msg-bubble">\${formatMessage(content)}</div>\`;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function formatMessage(text) {
  return text
    .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
    .replace(/\\n\\n/g, '<br><br>')
    .replace(/\\n- /g, '<br>• ')
    .replace(/\\n(\\d+)\\. /g, '<br>$1. ');
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'msg assistant';
  div.id = 'typing';
  div.innerHTML = \`
    <div class="msg-avatar">✦</div>
    <div class="msg-bubble">
      <div class="typing"><span></span><span></span><span></span></div>
    </div>\`;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || isLoading) return;

  // Remove sugestões após primeira mensagem
  suggestions.style.display = 'none';

  chatInput.value = '';
  isLoading = true;
  sendBtn.disabled = true;

  addMessage('user', text);
  history.push({ role: 'user', content: text });
  showTyping();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: FINANCIAL_CONTEXT,
        messages: history,
      }),
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Não consegui processar a resposta.';

    removeTyping();
    addMessage('assistant', reply);
    history.push({ role: 'assistant', content: reply });

  } catch (err) {
    removeTyping();
    addMessage('assistant', \`Erro ao conectar com a API. Verifique sua conexão e tente novamente.\\n\\n_Detalhe: \${err.message}_\`);
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

function sendSuggestion(q) {
  chatInput.value = q;
  sendMessage();
}
</script>
`
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'width:100%;height:calc(100vh - 48px);border:none;display:block'
    iframe.srcdoc = html
    ref.current.innerHTML = ''
    ref.current.appendChild(iframe)
  }, [empresaAtiva, token])

  return <div ref={ref} style={{ width:'100%', height:'calc(100vh - 48px)' }} />
}
