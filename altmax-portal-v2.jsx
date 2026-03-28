import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import {
  BarChart, Bar, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart,
  ReferenceLine, LabelList
} from "recharts";
import {
  LayoutDashboard, FileText, CreditCard, TrendingUp, BarChart3,
  ChevronDown, Building2, Search, Calendar,
  CheckCircle2, CheckSquare, XCircle,
  Send, X, Sparkles, Bot, User, Sun, Moon,
  Settings, Upload, Trash2, Pencil, Plus, Orbit
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════════════════ */

const DARK = {
  bg: "#05091A",
  surface: "rgba(255,255,255,0.034)",
  surfaceHover: "rgba(255,255,255,0.055)",
  surfaceElevated: "rgba(8,14,38,0.95)",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.12)",
  blue: "#38BDF8", blueDim: "rgba(56,189,248,0.12)",
  green: "#34D399", greenDim: "rgba(52,211,153,0.12)",
  red: "#F87171", redDim: "rgba(248,113,113,0.12)",
  amber: "#FBBF24", amberDim: "rgba(251,191,36,0.12)",
  purple: "#C084FC", purpleDim: "rgba(192,132,252,0.12)",
  orange: "#FB923C", orangeDim: "rgba(251,146,60,0.12)",
  text: "#F1F5F9", textSec: "#94A3B8", muted: "#64748B", mutedDim: "#475569",
  gridLine: "rgba(56,189,248,0.018)",
  scrollTrack: "rgba(255,255,255,0.02)", scrollThumb: "rgba(255,255,255,0.12)", scrollHover: "rgba(255,255,255,0.22)",
  tooltipShadow: "0 8px 32px rgba(0,0,0,0.5)",
  isDark: true,
};

const LIGHT = {
  bg: "#F4F6F8",
  surface: "rgba(0,0,0,0.028)",
  surfaceHover: "rgba(0,0,0,0.05)",
  surfaceElevated: "rgba(255,255,255,0.97)",
  border: "rgba(0,0,0,0.09)",
  borderHover: "rgba(0,0,0,0.16)",
  blue: "#0284C7", blueDim: "rgba(2,132,199,0.09)",
  green: "#059669", greenDim: "rgba(5,150,105,0.09)",
  red: "#DC2626", redDim: "rgba(220,38,38,0.09)",
  amber: "#D97706", amberDim: "rgba(217,119,6,0.09)",
  purple: "#9333EA", purpleDim: "rgba(147,51,234,0.09)",
  orange: "#EA580C", orangeDim: "rgba(234,88,12,0.09)",
  text: "#0F172A", textSec: "#475569", muted: "#64748B", mutedDim: "#94A3B8",
  gridLine: "rgba(0,0,0,0.035)",
  scrollTrack: "rgba(0,0,0,0.03)", scrollThumb: "rgba(0,0,0,0.12)", scrollHover: "rgba(0,0,0,0.24)",
  tooltipShadow: "0 8px 24px rgba(0,0,0,0.12)",
  isDark: false,
};

// T = DARK for backward-compat with module-level mock data
const T = DARK;
const ThemeCtx = createContext(DARK);
const useT = () => useContext(ThemeCtx);

/* ═══════════════════════════════════════════════════════════════════════════
   FORMATTERS
   ═══════════════════════════════════════════════════════════════════════════ */
const fmtBRL = (v) => Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (v) => {
  if (!v || v === 0) return "0";
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace(".", ",") + "M";
  if (a >= 1e3) return s + (a / 1e3).toFixed(1).replace(".", ",") + "K";
  return s + a.toFixed(0);
};
const fmtPct = (v) => (v >= 0 ? "" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + "%";

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA — CAIXA (faithful to the inspiration file)
   ═══════════════════════════════════════════════════════════════════════════ */
const CAIXA_DATA = {
  quarterly: {
    labels: ["Q4/25", "Q1/26"],
    RB: [45700, 202042], TD: [9263, 21906], CV: [45653, 108698],
    CF: [53413, 37067], RN: [73600, 19100], DN: [6244, 15309],
  },
  monthly: {
    labels: ["Out/25","Nov/25","Dez/25","Jan/26","Fev/26","Mar/26"],
    RB: [0, 0, 45700, 78108, 86944, 36990],
    TD: [0, 0, 9263, 13287, 8619, 0],
    CV: [0, 10675, 34978, 48591, 23117, 36990],
    CF: [205, 22213, 30995, 18353, 10573, 8141],
    RN: [1100, 34000, 38500, 15000, 4100, 0],
    DN: [877, 0, 5367, 15035, 274, 0],
  },
};
const WEEKLY = {
  "Out/25": { labels:["S1·Out","S2·Out","S3·Out","S4·Out"], RB:[0,0,0,0], TD:[0,0,0,0], CV:[0,0,0,0], CF:[205,0,0,0], RN:[1100,0,0,0], DN:[877,0,0,0] },
  "Nov/25": { labels:["S1·Nov","S2·Nov","S3·Nov","S4·Nov"], RB:[0,0,0,0], TD:[0,0,0,0], CV:[0,4500,3200,2975], CF:[5200,6400,5313,5300], RN:[0,34000,0,0], DN:[0,0,0,0] },
  "Dez/25": { labels:["S1·Dez","S2·Dez","S3·Dez","S4·Dez"], RB:[0,8200,16300,21200], TD:[0,1800,3500,3963], CV:[7800,9200,10200,7778], CF:[7500,8200,7800,7495], RN:[0,0,38500,0], DN:[0,2367,3000,0] },
  "Jan/26": { labels:["S1·Jan","S2·Jan","S3·Jan","S4·Jan"], RB:[12400,18900,22500,24308], TD:[2100,3200,4000,3987], CV:[9800,13200,14500,11091], CF:[4200,5100,4800,4253], RN:[0,0,15000,0], DN:[15035,0,0,0] },
  "Fev/26": { labels:["S1·Fev","S2·Fev","S3·Fev","S4·Fev"], RB:[14200,21500,28000,23244], TD:[1400,2100,2800,2319], CV:[3800,5900,7200,6217], CF:[2700,3100,2600,2173], RN:[4100,0,0,0], DN:[274,0,0,0] },
  "Mar/26": { labels:["S1·Mar","S2·Mar","S3·Mar","S4·Mar"], RB:[8200,12300,9800,6690], TD:[0,0,0,0], CV:[8200,12300,9800,6690], CF:[2100,2300,2000,1741], RN:[0,0,0,0], DN:[0,0,0,0] },
};

const DRE_ROWS = [
  { name: "RoB", val: 210752, pct: 100.0, c: T.blue },
  { name: "T.D.C.F.", val: 31169, pct: 14.79, c: T.amber },
  { name: "Rec. Líq.", val: 179583, pct: 85.2, c: T.blue },
  { name: "Cust. Var.", val: 154351, pct: 73.2, c: T.red },
  { name: "Marg. Cont.", val: 25232, pct: 12.0, c: T.orange },
  { name: "Cust. Fixo", val: 90480, pct: 42.9, c: T.orange },
  { name: "EBT1", val: -65248, pct: -31.0, c: T.red },
  { name: "RNOP", val: 92702, pct: 44.0, c: T.green },
  { name: "DNOP", val: 21553, pct: 10.2, c: T.purple },
  { name: "EBT2", val: 5901, pct: 2.8, c: T.green },
];

/* ── Category descriptions (from planoContas.ts) ── */
const CAT_DESC = {
  "1.01.01": "Receita MI", "1.01.02": "Receita ME",
  "1.02.01": "Mútuos", "1.02.96": "Resgate Aplicação", "1.02.97": "Venda de Ativos", "1.02.98": "Rendimento Aplicação", "1.02.99": "Estorno",
  "2.01.01": "PIS", "2.01.02": "COFINS", "2.01.03": "ICMS", "2.01.04": "ISS",
  "2.02.01": "Juros s/ Desc. Duplicatas",
  "2.03.01": "Agregados", "2.03.02": "Agregados - Adiantamento", "2.03.03": "Pedágios e Taxas", "2.03.04": "Postos (Diesel)", "2.03.05": "Gerenc. de Risco", "2.03.06": "Seguro Carga", "2.03.07": "Descarga", "2.03.08": "Diárias",
  "2.04.01": "Brindes", "2.04.02": "Publicidade e Marketing", "2.04.03": "Comissões",
  "2.05.01": "Uniformes", "2.05.02": "Acordo Trabalhista", "2.05.03": "13º Salário", "2.05.04": "Alimentação",
  "2.05.90": "FGTS", "2.05.91": "IRPF", "2.05.92": "INSS", "2.05.93": "Salário", "2.05.94": "Folha PJ", "2.05.95": "Rescisões", "2.05.96": "Confraternizações", "2.05.97": "Pró-Labore", "2.05.98": "Férias", "2.05.99": "EPI",
  "2.06.01": "Aluguel", "2.06.02": "IPTU", "2.06.03": "Condomínio",
  "2.07.01": "Água e Esgoto", "2.07.02": "Energia Elétrica",
  "2.08.01": "Internet / Telefone", "2.08.02": "E-mail",
  "2.09.01": "Locação de Veículos", "2.09.02": "Conserto de Veículos", "2.09.05": "Combustível",
  "2.10.95": "Serv. de Terceiros", "2.10.96": "Serv. Advocatícios", "2.10.97": "Contabilidade", "2.10.98": "Consultoria", "2.10.99": "Auditoria",
  "2.11.94": "Tarifas Bancárias", "2.11.95": "Software / TI", "2.11.96": "Cartório", "2.11.97": "Correios", "2.11.98": "Bens Pequeno Valor", "2.11.99": "Desp. com Viagens",
  "2.12.98": "Manutenção TI", "2.12.99": "Manutenção Predial",
  "2.13.96": "Mat. Expediente", "2.13.97": "Mat. Limpeza", "2.13.98": "Mat. Escritório", "2.13.99": "Mat. TI",
  "2.14.91": "Aplicação Automática", "2.14.94": "Dividendos", "2.14.95": "Investimentos", "2.14.96": "Empréstimo", "2.14.97": "Juros Diversos", "2.14.98": "Mútuos", "2.14.99": "Estorno",
  "2.15.99": "IRPJ", "2.16.99": "CSLL",
};
const getCatDesc = (code) => CAT_DESC[code] || code;

/* ── Other page mocks ── */
const mockExtrato = Array.from({ length: 20 }, (_, i) => ({
  data: `${String(25 - i).padStart(2, "0")}/11/2025`,
  descricao: ["PIX RECEBIDO - FRETE BEAUVALLET","PAGTO DIESEL POSTO IPIRANGA","PIX RECEBIDO - JHS ALIMENTOS","FOLHA PAGTO MOTORISTAS NOV/25","PEDÁGIO AUTOPISTA LITORAL","PIX RECEBIDO - CARGILL SA","MANUTENÇÃO VHN-4J22","SEGURO CARGA APÓLICE","PIX ENVIADO - ADTO MOTORISTA","PAGTO ALUGUEL GALPÃO INHUMAS","RECEBIMENTO CT-E 45891","TARIFA BANCÁRIA"][i % 12],
  valor: [12500,-8340,18900,-45200,-1280,32100,-4560,-2100,-3500,-6800,15600,-89][i % 12],
  catCod: ["1.01.01","2.03.04","1.01.01","2.05.93","2.03.03","1.01.01","2.09.02","2.03.06","2.03.02","2.06.01","1.01.01","2.11.94"][i % 12],
  conciliado: i % 3 !== 0,
  banco: ["Itaú","Banco do Brasil","Itaú","Banco do Brasil","Bradesco"][i % 5],
}));
const mockContas = [
  { nome: "Itaú AG 0134 CC 4521-8", saldo: 45230.50, cor: T.blue },
  { nome: "Banco do Brasil CC 8834-2", saldo: 18940.20, cor: T.green },
  { nome: "Bradesco CC 1247-5", saldo: 7812.80, cor: T.amber },
  { nome: "Caixa CC 0091-3", saldo: 2340.10, cor: T.purple },
];
const mockFluxo = [
  { mes: "Dez/25", ent: 358700, sai: 193100 },
  { mes: "Jan/26", ent: 285400, sai: 201800 },
  { mes: "Fev/26", ent: 312600, sai: 188400 },
  { mes: "Mar/26", ent: 298100, sai: 195600 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

const GlowLine = ({ color }) => (
  <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${color},transparent)`,opacity:0.5 }}/>
);

/* Custom bar label — explicit SVG attrs to avoid bold rendering */
const BarLabel = ({ x, y, width, value, fill }) => {
  if (!value || value === 0) return null;
  return (
    <text x={x + width / 2} y={y - 5} textAnchor="middle" fill={fill} fontSize={8} fontFamily="DM Mono, monospace" fontWeight="normal" opacity={0.75}>
      {fmtK(value)}
    </text>
  );
};

/* Bar label with MoM variation % arrow */
const BarLabelVar = ({ x, y, width, value, fill, index, data, dataKey }) => {
  if (!value || value === 0) return null;
  const prev = index > 0 ? data[index - 1]?.[dataKey || "value"] : null;
  const varPct = prev && prev > 0 ? ((value - prev) / prev * 100) : null;
  const hasVar = varPct !== null && index > 0;
  return (
    <g>
      {hasVar && (
        <text x={x + width / 2} y={y - 22} textAnchor="middle" fontSize={10} fontFamily="DM Mono, monospace" fontWeight="normal"
          fill={varPct >= 0 ? "#34D399" : "#F87171"}>
          {varPct >= 0 ? "▲" : "▼"} {Math.abs(varPct).toFixed(1)}%
        </text>
      )}
      <text x={x + width / 2} y={y - 6} textAnchor="middle" fill={fill} fontSize={11} fontFamily="DM Mono, monospace" fontWeight="normal" opacity={0.85}>
        {fmtK(value)}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  const t = useT();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:t.surfaceElevated,border:`1px solid ${t.borderHover}`,borderRadius:10,padding:"10px 14px",boxShadow:t.tooltipShadow }}>
      <div style={{ fontSize:10,color:t.muted,marginBottom:6,fontFamily:"'DM Mono',monospace" }}>{label}</div>
      {payload.filter(p => p.value > 0).map((p, i) => (
        <div key={i} style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,marginBottom:2 }}>
          <div style={{ width:6,height:6,borderRadius:2,background:p.color||p.stroke }} />
          <span style={{ color:t.textSec }}>{p.name}:</span>
          <span style={{ fontFamily:"'DM Mono',monospace",color:t.text,fontWeight:500 }}>{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const Badge = ({ status }) => {
  const t = useT();
  const map = {
    "A VENCER": { bg:t.greenDim, color:t.green, label:"A Vencer" },
    "ATRASADO": { bg:t.redDim, color:t.red, label:"Atrasado" },
    "PAGO": { bg:`${t.muted}15`, color:t.muted, label:"Pago" },
    "A RECEBER": { bg:t.blueDim, color:t.blue, label:"A Receber" },
  };
  const s = map[status] || map["A VENCER"];
  return <span style={{ display:"inline-flex",padding:"3px 10px",borderRadius:99,fontSize:9,fontWeight:600,background:s.bg,color:s.color,border:`1px solid ${s.color}33` }}>{s.label}</span>;
};

const ConcilBadge = ({ ok }) => {
  const t = useT();
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:99,fontSize:9,fontWeight:600,background:ok?t.greenDim:t.amberDim,color:ok?t.green:t.amber,border:`1px solid ${ok?t.green:t.amber}33` }}>
      {ok?"✓ Conciliado":"⏳ Pendente"}
    </span>
  );
};

/* Sort utilities for all tables */
const SortHeader = ({ label, field, sort, onSort, align }) => {
  const t = useT();
  const active = sort.field === field;
  const arrow = active ? (sort.dir === "asc" ? " ▲" : " ▼") : "";
  return (
    <th onClick={() => onSort(field)} style={{
      padding:"10px 14px", textAlign:align||"left", fontSize:9, fontWeight:600,
      color:active?t.blue:t.muted, textTransform:"uppercase", letterSpacing:0.8,
      borderBottom:`1px solid ${active?`${t.blue}44`:t.border}`,
      fontFamily:"'DM Mono',monospace", cursor:"pointer", userSelect:"none",
      transition:"color 0.15s, border-color 0.15s", whiteSpace:"nowrap",
    }}>
      {label}{arrow && <span style={{ fontSize:7,marginLeft:2,opacity:0.8 }}>{arrow}</span>}
    </th>
  );
};

const toggleSort = (prev, field) => {
  if (prev.field === field) return { field, dir: prev.dir === "asc" ? "desc" : "asc" };
  return { field, dir: "asc" };
};

const sortRows = (rows, sort, getVal) => {
  if (!sort.field) return rows;
  return [...rows].sort((a, b) => {
    const va = getVal(a, sort.field), vb = getVal(b, sort.field);
    if (va === vb) return 0;
    const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
    return sort.dir === "asc" ? cmp : -cmp;
  });
};

/* Parse dd/mm/yyyy to Date for sorting */
const parseDMY = (s) => { const [d, m, y] = s.split("/"); return new Date(y, m - 1, d); };

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE: CAIXA REALIZADO — faithful to inspiration
   ═══════════════════════════════════════════════════════════════════════════ */

const CHART_DEFS = [
  { key:"TD", title:"T.D.C.F.", color:T.amber, pctLabel:"14,79% RoB" },
  { key:"CV", title:"Custo Variável", color:T.red, pctLabel:"73,2% RoB" },
  { key:"CF", title:"Custo Fixo", color:T.orange, pctLabel:"42,9% RoB" },
  { key:"SNOP", title:"Saldo NOP", color:T.purple, pctLabel:"33,8% RoB", isNop:true },
];

const LEVELS = ["quarterly","monthly","weekly"];
const LEVEL_LABELS = { quarterly:"Trimestral", monthly:"Mensal", weekly:"Semanal" };

const PageCaixa = () => {
  const t = useT();
  const [level, setLevel] = useState("monthly");
  const [selMonth, setSelMonth] = useState(null);
  const [caixaView, setCaixaView] = useState("dashboard"); // dashboard | analise
  const [detailView, setDetailView] = useState(null); // null | "receita" | "tdcf" | "cv" | "cf" | "saldoNop"

  const getLevelData = useCallback(() => {
    if (level === "quarterly") return CAIXA_DATA.quarterly;
    if (level === "monthly") return CAIXA_DATA.monthly;
    if (level === "weekly" && selMonth && WEEKLY[selMonth]) return WEEKLY[selMonth];
    return CAIXA_DATA.monthly;
  }, [level, selMonth]);

  const d = getLevelData();
  const sum = (arr) => arr.reduce((s, v) => s + (v || 0), 0);

  const drillUp = () => {
    if (level === "weekly") { setLevel("monthly"); setSelMonth(null); }
    else if (level === "monthly") { setLevel("quarterly"); setSelMonth(null); }
  };
  const drillDown = () => {
    if (level === "quarterly") { setLevel("monthly"); setSelMonth(null); }
    else if (level === "monthly") { setSelMonth("Dez/25"); setLevel("weekly"); }
  };
  const drillIntoMonth = (monthLabel) => {
    if (WEEKLY[monthLabel]) { setSelMonth(monthLabel); setLevel("weekly"); }
  };
  const jumpTo = (lv) => { setLevel(lv); if (lv !== "weekly") setSelMonth(null); };

  const LEVEL_COLORS = { quarterly:{ border:`${t.amber}66`,color:t.amber,bg:`${t.amber}0F` }, monthly:{ border:`${t.blue}66`,color:t.blue,bg:`${t.blue}0F` }, weekly:{ border:`${t.green}66`,color:t.green,bg:`${t.green}0F` } };
  const lc = LEVEL_COLORS[level];

  // ── Detail view configs ───────────────────────────────────────────────
  const DETAIL_DEFS = {
    receita: {
      title: "Receita Bruta", key: "RB", color: t.blue,
      kpis: [
        { l:"Total Período", v:fmtK(sum(d.RB)), c:t.blue },
        { l:"Média Mensal", v:fmtK(sum(d.RB)/Math.max(d.labels.length,1)), c:t.text },
        { l:"Melhor Mês", v:fmtK(Math.max(...d.RB)), c:t.green },
        { l:"Pior Mês", v:fmtK(Math.min(...d.RB.filter(v=>v>0))||0), c:t.amber },
      ],
      breakdown: [
        { item:"Frete Rodoviário", valor:128400, pct:60.9 },
        { item:"Frete Frigorífico", valor:52300, pct:24.8 },
        { item:"Serviço de Entrega", valor:18200, pct:8.6 },
        { item:"Locação de Veículos", valor:8500, pct:4.0 },
        { item:"Outros", valor:3352, pct:1.6 },
      ],
      clientes: [
        { nome:"CARGILL SA", valor:128900 },
        { nome:"BEAUVALLET IND", valor:85200 },
        { nome:"BRF SA", valor:67800 },
        { nome:"MARFRIG GLOBAL", valor:56400 },
        { nome:"JHS ALIMENTOS", valor:42300 },
        { nome:"MINERVA FOODS", valor:41200 },
        { nome:"FRIBAL FRIGORÍFICO", valor:34500 },
        { nome:"Outros clientes", valor:18700 },
      ],
    },
    tdcf: {
      title: "T.D.C.F. (Deduções)", key: "TD", color: t.amber,
      kpis: [
        { l:"Total Deduções", v:fmtK(sum(d.TD)), c:t.amber },
        { l:"% sobre RoB", v:"14,8%", c:t.text },
        { l:"PIS/COFINS", v:fmtK(sum(d.TD)*0.72), c:t.amber },
        { l:"ISS/ICMS", v:fmtK(sum(d.TD)*0.28), c:t.amber },
      ],
      breakdown: [
        { item:"PIS (1,65%)", valor:3478, pct:11.2 },
        { item:"COFINS (7,6%)", valor:16017, pct:51.4 },
        { item:"ICMS", valor:8400, pct:27.0 },
        { item:"ISS", valor:2100, pct:6.7 },
        { item:"Outras deduções", valor:1174, pct:3.8 },
      ],
      clientes: [
        { nome:"COFINS (Federal)", valor:16017 },
        { nome:"ICMS (Estadual)", valor:8400 },
        { nome:"PIS (Federal)", valor:3478 },
        { nome:"ISS (Municipal)", valor:2100 },
        { nome:"Outras deduções", valor:1174 },
      ],
    },
    cv: {
      title: "Custo Variável", key: "CV", color: t.red,
      kpis: [
        { l:"Total CV", v:fmtK(sum(d.CV)), c:t.red },
        { l:"% sobre RoB", v:"73,2%", c:t.text },
        { l:"Diesel", v:fmtK(sum(d.CV)*0.45), c:t.red },
        { l:"Pedágios", v:fmtK(sum(d.CV)*0.12), c:t.amber },
      ],
      breakdown: [
        { item:"Diesel / Combustível", valor:69458, pct:45.0 },
        { item:"Agregados (Frete)", valor:38588, pct:25.0 },
        { item:"Pedágios", valor:18522, pct:12.0 },
        { item:"Pneus / Manutenção", valor:15435, pct:10.0 },
        { item:"Seguro Carga", valor:7716, pct:5.0 },
        { item:"Outros CV", valor:4632, pct:3.0 },
      ],
      clientes: [
        { nome:"Posto Ipiranga (Diesel)", valor:38200 },
        { nome:"Posto Shell (Diesel)", valor:31258 },
        { nome:"Agregados Diversos", valor:38588 },
        { nome:"Autopista Litoral (Pedágio)", valor:10800 },
        { nome:"CCR Via Lagos (Pedágio)", valor:7722 },
        { nome:"Bridgestone (Pneus)", valor:9200 },
        { nome:"Oficina Central (Manutenção)", valor:6235 },
        { nome:"Porto Seguro (Seguro)", valor:7716 },
        { nome:"Outros fornecedores", valor:4632 },
      ],
    },
    cf: {
      title: "Custo Fixo", key: "CF", color: t.orange,
      kpis: [
        { l:"Total CF", v:fmtK(sum(d.CF)), c:t.orange },
        { l:"% sobre RoB", v:"42,9%", c:t.text },
        { l:"Folha", v:fmtK(sum(d.CF)*0.52), c:t.orange },
        { l:"Aluguel/Infra", v:fmtK(sum(d.CF)*0.18), c:t.amber },
      ],
      breakdown: [
        { item:"Folha de Pagamento", valor:47050, pct:52.0 },
        { item:"Encargos (INSS/FGTS)", valor:14496, pct:16.0 },
        { item:"Aluguel / Infraestrutura", valor:16286, pct:18.0 },
        { item:"Seguros (Frota/Patrimonial)", valor:6334, pct:7.0 },
        { item:"TI / Sistemas", valor:2714, pct:3.0 },
        { item:"Outros CF", valor:3600, pct:4.0 },
      ],
      clientes: [
        { nome:"Folha Motoristas", valor:28500 },
        { nome:"Folha Administrativo", valor:18550 },
        { nome:"INSS Patronal", valor:8900 },
        { nome:"FGTS", valor:5596 },
        { nome:"Aluguel Galpão Inhumas", valor:8200 },
        { nome:"Aluguel Escritório SP", valor:8086 },
        { nome:"Porto Seguro (Seguros)", valor:6334 },
        { nome:"Omie / TI", valor:2714 },
        { nome:"Outros", valor:3600 },
      ],
    },
    saldoNop: {
      title: "Saldo NOP", key: null, color: t.purple,
      kpis: [
        { l:"Saldo NOP", v:fmtK(sum(d.RN)-sum(d.DN)), c:sum(d.RN)-sum(d.DN)>=0?t.green:t.red },
        { l:"Receita NOP", v:fmtK(sum(d.RN)), c:t.green },
        { l:"Despesa NOP", v:fmtK(sum(d.DN)), c:t.red },
        { l:"% sobre RoB", v:((sum(d.RN)-sum(d.DN))/sum(d.RB)*100).toFixed(1)+"%", c:t.text },
      ],
      breakdown: [
        { item:"Rendimentos Financeiros", valor:52400, pct:56.5 },
        { item:"Recuperação de Despesas", valor:24800, pct:26.8 },
        { item:"Venda de Ativos", valor:15502, pct:16.7 },
      ],
      breakdownDN: [
        { item:"Juros / IOF", valor:9800, pct:45.5 },
        { item:"Multas e Penalidades", valor:4200, pct:19.5 },
        { item:"Depreciação Acelerada", valor:3800, pct:17.6 },
        { item:"Perdas Financeiras", valor:2100, pct:9.7 },
        { item:"Outras DNOP", valor:1653, pct:7.7 },
      ],
      clientes: [
        { nome:"Itaú (Rendimentos)", valor:32400 },
        { nome:"Banco do Brasil (Rend.)", valor:20000 },
        { nome:"Venda Caminhão VHN-4J22", valor:15502 },
        { nome:"Recuperação sinistro", valor:14800 },
        { nome:"Ressarcimento clientes", valor:10000 },
      ],
    },
  };

  const DetailBtn = ({ onClick, color }) => (
    <button onClick={onClick} style={{
      display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:6,fontSize:8,
      background:`${color}10`,border:`1px solid ${color}30`,color:color,
      cursor:"pointer",fontFamily:"'DM Mono',monospace",letterSpacing:0.3,
      transition:"all 0.15s",marginTop:6,
    }}
      onMouseEnter={e=>{e.currentTarget.style.background=`${color}22`;e.currentTarget.style.borderColor=`${color}55`;}}
      onMouseLeave={e=>{e.currentTarget.style.background=`${color}10`;e.currentTarget.style.borderColor=`${color}30`;}}>
      Detalhar →
    </button>
  );

  const DetailPanel = ({ defKey }) => {
    const def = DETAIL_DEFS[defKey];
    if (!def) return null;
    const isNop = defKey === "saldoNop";
    const chartData = isNop
      ? d.labels.map((l, i) => ({ name:l, rnop:d.RN[i]||0, dnop:d.DN[i]||0, saldo:(d.RN[i]||0)-(d.DN[i]||0) }))
      : d.labels.map((l, i) => ({ name:l, value:d[def.key][i]||0 }));
    const totalBreak = def.breakdown.reduce((s,r)=>s+r.valor,0);

    return (
      <div style={{ padding:20,display:"flex",flexDirection:"column",gap:16 }}>
        {/* Breadcrumb */}
        <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:10 }}>
          <span onClick={()=>setDetailView(null)} style={{ color:t.muted,cursor:"pointer",transition:"color 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.color=t.blue}
            onMouseLeave={e=>e.currentTarget.style.color=t.muted}>
            Dashboard
          </span>
          <span style={{ color:t.mutedDim }}>›</span>
          <span style={{ color:def.color,fontWeight:600 }}>{def.title}</span>
        </div>

        {/* KPIs */}
        <div style={{ display:"grid",gridTemplateColumns:`repeat(${def.kpis.length},1fr)`,gap:10 }}>
          {def.kpis.map((k,i)=>(
            <div key={i} style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:"12px 16px",position:"relative",overflow:"hidden" }}>
              <GlowLine color={i===0?def.color:t.border}/>
              <div style={{ fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.muted,marginBottom:5 }}>{k.l}</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:18,color:k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16,position:"relative",overflow:"hidden" }}>
          <GlowLine color={def.color}/>
          <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:14 }}>
            {isNop ? "Receita NOP × Despesa NOP" : `${def.title} — Evolução Mensal`}
          </div>
          <ResponsiveContainer width="100%" height={340}>
            {isNop ? (
              <ComposedChart data={chartData} barSize={42} margin={{ top:32,right:10,left:10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${t.text}06`}/>
                <XAxis dataKey="name" tick={{ fill:t.muted,fontSize:12,fontFamily:"DM Mono" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:t.muted,fontSize:10,fontFamily:"DM Mono" }} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                <Tooltip content={<CustomTooltip/>} cursor={false}/>
                <Bar dataKey="rnop" name="Receita NOP" fill={`${t.green}20`} stroke={t.green} strokeWidth={1.5} radius={[5,5,0,0]}
                  activeBar={{ fill:`${t.green}35`,stroke:t.green,strokeWidth:2,radius:[5,5,0,0] }}>
                  <LabelList dataKey="rnop" content={props => <BarLabel {...props} fill={t.green} />} />
                </Bar>
                <Bar dataKey="dnop" name="Despesa NOP" fill={`${t.red}20`} stroke={t.red} strokeWidth={1.5} radius={[5,5,0,0]}
                  activeBar={{ fill:`${t.red}35`,stroke:t.red,strokeWidth:2,radius:[5,5,0,0] }}>
                  <LabelList dataKey="dnop" content={props => <BarLabel {...props} fill={t.red} />} />
                </Bar>
                <Line type="monotone" dataKey="saldo" name="Saldo NOP" stroke={t.purple} strokeWidth={2} dot={{ fill:t.purple,r:5 }}/>
              </ComposedChart>
            ) : (
              <BarChart data={chartData} barSize={48} margin={{ top:36,right:10,left:10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${t.text}06`}/>
                <XAxis dataKey="name" tick={{ fill:t.muted,fontSize:12,fontFamily:"DM Mono" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:t.muted,fontSize:10,fontFamily:"DM Mono" }} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                <Tooltip content={<CustomTooltip/>} cursor={false}/>
                <Bar dataKey="value" name={def.title} fill={`${def.color}20`} stroke={def.color} strokeWidth={1.5} radius={[5,5,0,0]}
                  activeBar={{ fill:`${def.color}35`,stroke:def.color,strokeWidth:2,radius:[5,5,0,0] }}>
                  <LabelList dataKey="value" content={props => <BarLabelVar {...props} fill={def.color} data={chartData} dataKey="value" />} />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Client / Supplier ranking */}
        {def.clientes && def.clientes.length > 0 && (() => {
          const sorted = [...def.clientes].sort((a,b) => b.valor - a.valor);
          const totalCli = sorted.reduce((s,c) => s + c.valor, 0);
          const maxCli = sorted[0]?.valor || 1;
          return (
            <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16,position:"relative",overflow:"hidden" }}>
              <GlowLine color={def.color}/>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted }}>
                  {defKey === "receita" ? "Ranking por Cliente" : defKey === "tdcf" ? "Composição por Tributo" : "Ranking por Fornecedor"}
                </div>
                <span style={{ fontSize:9,fontFamily:"'DM Mono',monospace",color:t.mutedDim }}>{sorted.length} itens · {fmtK(totalCli)} total</span>
              </div>
              {sorted.map((c, i) => {
                const pctCli = (c.valor / totalCli * 100);
                return (
                  <div key={i} style={{ marginBottom:i < sorted.length - 1 ? 10 : 0 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:10,marginBottom:4 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:t.mutedDim,minWidth:16 }}>{i+1}.</span>
                        <span style={{ color:t.text }}>{c.nome}</span>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <span style={{ fontFamily:"'DM Mono',monospace",color:t.text }}>{fmtK(c.valor)}</span>
                        <span style={{ fontFamily:"'DM Mono',monospace",color:def.color,minWidth:40,textAlign:"right",fontSize:10 }}>{pctCli.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                      <div style={{ flex:1,height:6,background:`${t.text}08`,borderRadius:3,overflow:"hidden" }}>
                        <div style={{ width:`${(c.valor / maxCli) * 100}%`,height:"100%",background:def.color,opacity:0.5,borderRadius:3,transition:"width 0.5s" }}/>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Pareto */}
              <div style={{ marginTop:16,paddingTop:12,borderTop:`1px solid ${t.border}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <span style={{ fontSize:10,textTransform:"uppercase",letterSpacing:1,color:t.muted }}>Concentração (Pareto)</span>
                  <span style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:t.textSec }}>
                    Top 3 = {((sorted.slice(0,3).reduce((s,c)=>s+c.valor,0))/totalCli*100).toFixed(0)}% · Top 5 = {((sorted.slice(0,Math.min(5,sorted.length)).reduce((s,c)=>s+c.valor,0))/totalCli*100).toFixed(0)}%
                  </span>
                </div>
                {/* Stacked bar with labels */}
                <div style={{ position:"relative" }}>
                  <div style={{ display:"flex",gap:1,height:28,borderRadius:6,overflow:"hidden" }}>
                    {sorted.map((c, i) => {
                      const pctW = (c.valor / totalCli) * 100;
                      return (
                        <div key={i} style={{
                          width:`${pctW}%`,height:"100%",
                          background:def.color,
                          opacity:0.85 - (i * 0.08),
                          display:"flex",alignItems:"center",justifyContent:"center",
                          borderRight:i < sorted.length - 1 ? `1px solid ${t.bg}` : "none",
                          position:"relative",overflow:"hidden",
                        }}>
                          {pctW > 6 && (
                            <span style={{ fontSize:9,fontFamily:"'DM Mono',monospace",color:"#fff",fontWeight:500,whiteSpace:"nowrap" }}>
                              {pctW.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Name labels below */}
                  <div style={{ display:"flex",gap:1,marginTop:4 }}>
                    {sorted.map((c, i) => {
                      const pctW = (c.valor / totalCli) * 100;
                      return (
                        <div key={i} style={{ width:`${pctW}%`,overflow:"hidden" }}>
                          {pctW > 8 && (
                            <span style={{ fontSize:8,color:t.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block" }}>
                              {c.nome.length > 12 ? c.nome.slice(0,11)+"…" : c.nome}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Breakdown tables */}
        <div style={{ display:"grid",gridTemplateColumns:isNop?"1fr 1fr":"1fr",gap:12 }}>
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16 }}>
            <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:12 }}>
              {isNop ? "Composição — Receita NOP" : `Composição — ${def.title}`}
            </div>
            {def.breakdown.map((r,i)=>(
              <div key={i} style={{ marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3 }}>
                  <span style={{ color:t.text }}>{r.item}</span>
                  <div style={{ display:"flex",gap:10 }}>
                    <span style={{ fontFamily:"'DM Mono',monospace",color:t.textSec }}>{fmtK(r.valor)}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",color:def.color,minWidth:36,textAlign:"right" }}>{r.pct}%</span>
                  </div>
                </div>
                <div style={{ height:4,background:`${t.text}08`,borderRadius:2,overflow:"hidden" }}>
                  <div style={{ width:`${r.pct}%`,height:"100%",background:isNop?t.green:def.color,opacity:0.6,borderRadius:2,transition:"width 0.5s" }}/>
                </div>
              </div>
            ))}
          </div>
          {isNop && def.breakdownDN && (
            <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16 }}>
              <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:12 }}>Composição — Despesa NOP</div>
              {def.breakdownDN.map((r,i)=>(
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3 }}>
                    <span style={{ color:t.text }}>{r.item}</span>
                    <div style={{ display:"flex",gap:10 }}>
                      <span style={{ fontFamily:"'DM Mono',monospace",color:t.textSec }}>{fmtK(r.valor)}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace",color:t.red,minWidth:36,textAlign:"right" }}>{r.pct}%</span>
                    </div>
                  </div>
                  <div style={{ height:4,background:`${t.text}08`,borderRadius:2,overflow:"hidden" }}>
                    <div style={{ width:`${r.pct}%`,height:"100%",background:t.red,opacity:0.6,borderRadius:2,transition:"width 0.5s" }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const MiniChart = ({ dataKey, color, height = 108 }) => {
    const chartData = d.labels.map((l, i) => ({ name: l, value: d[dataKey][i] || 0 }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} barSize={level === "weekly" ? 20 : 24} margin={{ top:16, right:4, left:4, bottom:0 }}>
          <XAxis dataKey="name" tick={{ fill:t.mutedDim,fontSize:9,fontFamily:"DM Mono" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar dataKey="value" name={dataKey} radius={[4,4,0,0]}
            activeBar={{ fill:`${color}30`, stroke:color, strokeWidth:2, radius:[4,4,0,0] }}
            onClick={(data, idx) => { if (level === "monthly") drillIntoMonth(CAIXA_DATA.monthly.labels[idx]); }}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.value > 0 ? `${color}18` : "transparent"} stroke={entry.value > 0 ? color : "transparent"} strokeWidth={1.5} cursor={level === "monthly" ? "pointer" : "default"} />
            ))}
            <LabelList dataKey="value" content={props => <BarLabel {...props} fill={color} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const MainChart = () => {
    const chartData = d.labels.map((l, i) => ({ name: l, value: d.RB[i] || 0 }));
    return (
      <ResponsiveContainer width="100%" height={150}>
        <ComposedChart data={chartData} barSize={level === "weekly" ? 24 : 30} margin={{ top:18, right:4, left:4, bottom:0 }}>
          <XAxis dataKey="name" tick={{ fill:t.mutedDim,fontSize:9,fontFamily:"DM Mono" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar dataKey="value" name="Receita Bruta" radius={[5,5,0,0]}
            activeBar={{ fill:`${t.blue}30`, stroke:t.blue, strokeWidth:2, radius:[5,5,0,0] }}
            onClick={(data, idx) => { if (level === "monthly") drillIntoMonth(CAIXA_DATA.monthly.labels[idx]); }}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.value > 0 ? `${t.blue}18` : "transparent"} stroke={entry.value > 0 ? t.blue : "transparent"} strokeWidth={1.5} cursor={level === "monthly" ? "pointer" : "default"} />
            ))}
            <LabelList dataKey="value" content={props => <BarLabel {...props} fill={t.blue} />} />
          </Bar>
          {level === "monthly" && (
            <Line type="monotone" dataKey="value" stroke={`${t.blue}45`} strokeWidth={1.5} strokeDasharray="4 4" dot={{ fill: t.blue, r: 3 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // ── Análise IA state ─────────────────────────────────────────────────────
  const [iaMessages, setIaMessages] = useState([
    { role: "assistant", content: "Olá! Já carreguei os dados financeiros da **ALT MAX LOG** referentes ao período.\n\nPosso analisar resultados, identificar riscos, comparar indicadores e gerar resumos executivos. O que você gostaria de saber?" },
  ]);
  const [iaInput, setIaInput] = useState("");
  const [iaTyping, setIaTyping] = useState(false);
  const [iaSugsVisible, setIaSugsVisible] = useState(true);
  const iaChatRef = useRef(null);
  const iaInputRef = useRef(null);

  useEffect(() => {
    if (iaChatRef.current) iaChatRef.current.scrollTop = iaChatRef.current.scrollHeight;
  }, [iaMessages, iaTyping]);

  const FINANCIAL_CONTEXT = `Você é o Claude, analista financeiro integrado ao dashboard da ALT MAX LOG.
Responda SEMPRE em português brasileiro, de forma direta e profissional.
DADOS FINANCEIROS:
- Receita Bruta (RoB): R$ 210.752 (100%)
- TDCF: R$ 31.169 (14,8%) | Receita Líquida: R$ 179.583 (85,2%)
- Custos Variáveis: R$ 154.351 (73,2%) | Margem Contribuição: R$ 25.232 (12,0%)
- Custo Fixo: R$ 90.480 (42,9%) | EBT1: -R$ 65.248 (-31,0%)
- RNOP: R$ 92.702 (44,0%) | DNOP: R$ 21.553 (10,2%)
- Resultado Final (EBT2): R$ 5.901 (2,8%)
Empresa de logística/transporte. Seja conciso, prático e focado em ação. Máximo 200 palavras.`;

  const iaSuggestions = [
    { icon: "📉", short: "Por que a margem está em 12%?", full: "Por que a margem de contribuição está em apenas 12%? O que pode ser feito para melhorar?" },
    { icon: "⚠️", short: "O custo fixo de 42,9% é alto?", full: "O custo fixo está em 42,9% da receita bruta. Isso é preocupante para uma empresa de logística?" },
    { icon: "📋", short: "Resumo executivo para o diretor", full: "Crie um resumo executivo do resultado financeiro para apresentar ao diretor em 3 bullet points." },
    { icon: "🔍", short: "RNOP alto — é um risco?", full: "O RNOP representa 44% da receita bruta. O negócio depende de receitas não operacionais. Isso é um risco?" },
  ];

  const iaSend = (text) => {
    const msg = text || iaInput.trim();
    if (!msg) return;
    setIaMessages(prev => [...prev, { role: "user", content: msg }]);
    setIaInput("");
    setIaTyping(true);
    setIaSugsVisible(false);

    (async () => {
      try {
        const history = [...iaMessages, { role: "user", content: msg }].filter(m => m.role !== "system");
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: FINANCIAL_CONTEXT,
            messages: history.map(m => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await response.json();
        const reply = data.content?.[0]?.text || "Não consegui processar a resposta.";
        setIaTyping(false);
        setIaMessages(prev => [...prev, { role: "assistant", content: reply }]);
      } catch (err) {
        setIaTyping(false);
        setIaMessages(prev => [...prev, { role: "assistant", content: `Erro ao conectar com a API: ${err.message}` }]);
      }
    })();
  };

  const formatIaMsg = (text) => text
    .replace(/\*\*(.*?)\*\*/g, `<strong style="color:${t.blue}">$1</strong>`)
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n- /g, "<br/>• ")
    .replace(/\n(\d+)\. /g, "<br/>$1. ");

  const dreTable = [
    { ind: "Receita Bruta (RoB)", val: "210.752", pct: "100%", pcColor: t.blue, status: "Base", stColor: t.blue },
    { ind: "T.D.C.F.", val: "31.169", pct: "14,8%", pcColor: t.amber, status: "Normal", stColor: t.green },
    { ind: "Receita Líquida", val: "179.583", pct: "85,2%", pcColor: t.blue, status: "OK", stColor: t.green },
    { ind: "Custo Variável (CV)", val: "154.351", pct: "73,2%", pcColor: t.red, status: "Alto", stColor: t.red },
    { ind: "Margem de Contribuição", val: "25.232", pct: "12,0%", pcColor: t.amber, status: "Atenção", stColor: t.amber },
    { ind: "Custo Fixo (CF)", val: "90.480", pct: "42,9%", pcColor: t.red, status: "Alto", stColor: t.red },
    { ind: "EBT1 (Resultado Operacional)", val: "−65.248", pct: "−31,0%", pcColor: t.red, status: "Negativo", stColor: t.red },
    { ind: "Receita NOP (RNOP)", val: "92.702", pct: "44,0%", pcColor: t.green, status: "OK", stColor: t.green },
    { ind: "Despesa NOP (DNOP)", val: "21.553", pct: "10,2%", pcColor: t.purple, status: "Monitorar", stColor: t.amber },
    { ind: "Resultado Final (EBT2)", val: "5.901", pct: "2,8%", pcColor: t.green, status: "Positivo", stColor: t.green },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",minHeight:"100%" }}>

      {/* VIEW TOGGLE BAR */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",height:38,borderBottom:`1px solid ${t.border}`,background:`${t.bg}CC`,flexShrink:0 }}>
        <div style={{ display:"flex",gap:2,background:`${t.text}06`,borderRadius:7,padding:2 }}>
          {[
            { id:"dashboard", label:"Dashboard", ic: BarChart3, accent:t.blue, dim:t.blueDim },
            { id:"analise", label:"Análise IA", ic: Sparkles, accent:t.purple, dim:t.purpleDim },
          ].map(v => (
            <button key={v.id} onClick={()=>{setCaixaView(v.id);setDetailView(null);}} style={{
              display:"flex",alignItems:"center",gap:5,padding:"4px 14px",borderRadius:5,fontSize:10,
              color:caixaView===v.id?v.accent:t.muted,background:caixaView===v.id?v.dim:"transparent",
              fontWeight:caixaView===v.id?600:400,border:"none",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
            }}>
              <v.ic size={11} strokeWidth={caixaView===v.id?2:1.5}/> {v.label}
            </button>
          ))}
        </div>
        {caixaView === "analise" && (
          <div style={{ display:"flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:8,background:`${t.purple}0A`,border:`1px solid ${t.purple}22` }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:t.purple,animation:"pulse 2s infinite" }}/>
            <span style={{ fontSize:9,color:t.purple,fontWeight:600 }}>Agente IA ativo</span>
          </div>
        )}
      </div>

      {/* ═══ VIEW: DASHBOARD ═══ */}
      {caixaView === "dashboard" && detailView && (
        <DetailPanel defKey={detailView} />
      )}
      {caixaView === "dashboard" && !detailView && (<>
      {/* KPI Strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",borderBottom:`1px solid ${t.border}`,flexShrink:0 }}>
        {[
          { l:"Saldo Inicial", v:"0,00", c:t.text, accent:t.blue, sub:"Base do período" },
          { l:"Entradas", v:"303.453,50", c:t.green, accent:t.green, sub:"Receitas realizadas" },
          { l:"Saídas", v:"297.552,49", c:t.red, accent:t.red, sub:"Custos + despesas" },
          { l:"Saldo Final", v:"5.901,01", c:t.green, accent:t.green, sub:"Posição atual" },
          { l:"Balanço", v:"5.901,01", c:t.green, accent:t.green, sub:"2,8% sobre RoB" },
        ].map((k, i) => (
          <div key={i} style={{ padding:"14px 22px",borderRight:i<4?`1px solid ${t.border}`:"none",position:"relative",overflow:"hidden",cursor:"default",transition:"background 0.2s",animation:`fadeUp 0.35s ease ${i*0.04}s both` }}
            onMouseEnter={e => { e.currentTarget.style.background=t.surfaceHover; e.currentTarget.querySelector('.glow').style.opacity='1'; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.querySelector('.glow').style.opacity='0'; }}>
            <div className="glow" style={{ position:"absolute",bottom:0,left:0,right:0,height:1.5,background:k.accent,opacity:0,transition:"opacity 0.3s" }}/>
            <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:6 }}>{k.l}</div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:20,color:k.c }}>{k.v}</div>
            <div style={{ fontSize:9,color:t.muted,marginTop:2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Body: Charts + DRE */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 252px",minHeight:550 }}>
        {/* LEFT: Charts */}
        <div style={{ padding:"18px 22px",borderRight:`1px solid ${t.border}`,overflowY:"auto" }}>
          {/* Drill Bar */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <span style={{ fontSize:11,fontWeight:600,color:t.text }}>Granularidade</span>
              <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:10,color:t.muted,fontFamily:"'DM Mono',monospace" }}>
                <span onClick={()=>jumpTo("quarterly")} style={{ cursor:"pointer",color:level==="quarterly"?t.blue:t.muted,transition:"color 0.15s" }}>Trimestral</span>
                {level !== "quarterly" && <>
                  <span style={{ opacity:0.4 }}>›</span>
                  <span onClick={()=>jumpTo("monthly")} style={{ cursor:"pointer",color:level==="monthly"?t.blue:t.muted }}>Mensal</span>
                </>}
                {level === "weekly" && <>
                  <span style={{ opacity:0.4 }}>›</span>
                  <span style={{ color:t.blue }}>{selMonth}</span>
                </>}
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ padding:"4px 10px",borderRadius:6,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:0.5,border:`1px solid ${lc.border}`,color:lc.color,background:lc.bg }}>
                {LEVEL_LABELS[level]}{selMonth ? ` · ${selMonth}` : ""}
              </span>
              <button onClick={drillUp} disabled={level==="quarterly"} style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:7,fontSize:10,border:`1px solid ${t.border}`,background:t.surface,color:t.muted,cursor:level==="quarterly"?"not-allowed":"pointer",fontFamily:"inherit",opacity:level==="quarterly"?0.25:1,transition:"all 0.2s" }}>▲ Drill Up</button>
              <button onClick={drillDown} disabled={level==="weekly"} style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:7,fontSize:10,border:`1px solid ${t.border}`,background:t.surface,color:t.muted,cursor:level==="weekly"?"not-allowed":"pointer",fontFamily:"inherit",opacity:level==="weekly"?0.25:1,transition:"all 0.2s" }}>▼ Drill Down</button>
            </div>
          </div>

          {/* TOP ROW: RoB (2fr) + Conciliação (1fr) */}
          <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:10 }}>
            {/* Receita Bruta — main chart */}
            <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden",transition:"border-color 0.2s" }}>
              <GlowLine color={t.blue}/>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
                <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.blue }}>Receita Bruta</div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:16,color:t.text }}>{fmtK(sum(d.RB))}</div>
                  <div style={{ fontSize:9,color:t.muted }}>Total período</div>
                </div>
              </div>
              <MainChart />
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4 }}>
                {level === "monthly" && <div style={{ fontSize:8,color:`${t.muted}77` }}>clique em uma barra para detalhar ▼</div>}
                {!level || true ? <div style={{ marginLeft:"auto" }}><DetailBtn onClick={()=>setDetailView("receita")} color={t.blue}/></div> : null}
              </div>
            </div>

            {/* Conciliação card */}
            <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden" }}>
              <GlowLine color={t.green}/>
              <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.green,marginBottom:4 }}>Conciliação</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:28,color:t.text,lineHeight:1,margin:"5px 0 2px" }}>87%</div>
              <div style={{ fontSize:9,color:t.muted,marginBottom:10 }}>dos lançamentos conciliados</div>
              {/* Progress bar */}
              <div style={{ height:3,background:`${t.text}0A`,borderRadius:99,overflow:"hidden",marginBottom:12 }}>
                <div style={{ width:"87%",height:"100%",borderRadius:99,background:t.green,transition:"width 1s cubic-bezier(.4,0,.2,1)" }}/>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {[
                  { label:"Conciliados", val:"342", dot:t.green, c:t.text },
                  { label:"Pendentes", val:"51", dot:t.amber, c:t.amber },
                ].map((r, i) => (
                  <div key={i} style={{ display:"flex",justifyContent:"space-between",fontSize:10 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:5,color:t.muted }}>
                      <div style={{ width:5,height:5,borderRadius:"50%",background:r.dot }}/>
                      {r.label}
                    </div>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:r.c }}>{r.val}</span>
                  </div>
                ))}
                <div style={{ borderTop:`1px solid ${t.border}`,paddingTop:6,marginTop:2,display:"flex",justifyContent:"space-between",fontSize:10 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:5,color:t.muted }}>
                    <div style={{ width:5,height:5,borderRadius:"50%",background:t.muted }}/> Total
                  </div>
                  <span style={{ fontFamily:"'DM Mono',monospace",color:t.text }}>393</span>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 1: TDCF, CV, CF — 3 columns */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
            {CHART_DEFS.filter(cd => !cd.isNop).map((cd, ci) => {
              const detailKey = { TD:"tdcf", CV:"cv", CF:"cf" }[cd.key];
              return (
              <div key={ci} style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden",transition:"border-color 0.2s" }}>
                <GlowLine color={cd.color}/>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                  <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:cd.color }}>{cd.title}</div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:14,color:cd.color }}>{fmtK(sum(d[cd.key]))}</div>
                    <div style={{ fontSize:9,color:t.muted }}>{cd.pctLabel}</div>
                  </div>
                </div>
                <MiniChart dataKey={cd.key} color={cd.color} />
                <div style={{ display:"flex",justifyContent:"flex-end" }}>
                  <DetailBtn onClick={()=>setDetailView(detailKey)} color={cd.color}/>
                </div>
              </div>
              );
            })}

            {/* Saldo NOP — spans 2 columns */}
            {(() => {
              const cardVal = sum(d.RN) - sum(d.DN);
              const snopData = d.labels.map((l, i) => ({ name:l, saldo:(d.RN[i]||0)-(d.DN[i]||0) }));
              return (
              <div style={{ gridColumn:"span 2",background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden" }}>
                <GlowLine color={t.purple}/>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.purple }}>Saldo NOP</div>
                    <div style={{ display:"flex",gap:8,marginTop:3,fontSize:8,fontFamily:"'DM Mono',monospace" }}>
                      <span style={{ color:t.green }}>R: {fmtK(sum(d.RN))}</span>
                      <span style={{ color:t.red }}>D: {fmtK(sum(d.DN))}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:14,color:cardVal>=0?t.green:t.red }}>{cardVal>=0?"+":""}{fmtK(cardVal)}</div>
                    <div style={{ fontSize:9,color:t.muted }}>33,8% RoB</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={108}>
                  <ComposedChart data={snopData} barSize={level === "weekly" ? 20 : 28} margin={{ top:16,right:4,left:4,bottom:0 }}>
                    <XAxis dataKey="name" tick={{ fill:t.mutedDim,fontSize:9,fontFamily:"DM Mono" }} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip content={<CustomTooltip/>} cursor={false}/>
                    <Bar dataKey="saldo" name="Saldo NOP" radius={[4,4,0,0]}
                      activeBar={{ fill:`${t.purple}35`,stroke:t.purple,strokeWidth:2,radius:[4,4,0,0] }}>
                      {snopData.map((entry, i) => (
                        <Cell key={i} fill={entry.saldo >= 0 ? `${t.green}20` : `${t.red}20`} stroke={entry.saldo >= 0 ? t.green : t.red} strokeWidth={1.5}/>
                      ))}
                      <LabelList dataKey="saldo" content={props => <BarLabel {...props} fill={props.value >= 0 ? t.green : t.red} />} />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
                <div style={{ display:"flex",justifyContent:"flex-end" }}>
                  <DetailBtn onClick={()=>setDetailView("saldoNop")} color={t.purple}/>
                </div>
              </div>
              );
            })()}

            {/* RESULTADO FINAL card */}
            <div style={{ background:`linear-gradient(135deg,rgba(52,211,153,0.07),rgba(56,189,248,0.04))`,border:`1px solid rgba(52,211,153,0.18)`,borderRadius:12,padding:14 }}>
              <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:`${t.green}BB` }}>Resultado Final</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:24,color:t.green,lineHeight:1,margin:"6px 0 2px" }}>5.901</div>
              <div style={{ fontSize:9,color:`${t.green}99`,marginBottom:12 }}>EBT2 — 2,8% sobre RoB</div>
              {[
                { n:"EBT1", v:-65248, c:t.red, prefix:"" },
                { n:"+ RNOP", v:92702, c:t.green, prefix:"+" },
                { n:"− DNOP", v:-21553, c:t.purple, prefix:"−" },
              ].map((r, i) => (
                <div key={i} style={{ display:"flex",justifyContent:"space-between",fontSize:10,padding:"4px 0",borderBottom:`1px solid ${t.text}06` }}>
                  <span style={{ color:t.muted }}>{r.n}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",color:r.c }}>{r.v>=0?"+":""}{fmtK(r.v)}</span>
                </div>
              ))}
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,paddingTop:5,borderTop:`1px solid ${t.green}33`,marginTop:2 }}>
                <span style={{ color:t.text,fontWeight:600 }}>= EBT2</span>
                <span style={{ fontFamily:"'DM Mono',monospace",color:t.green,fontWeight:700 }}>+5.901</span>
              </div>
              <div style={{ display:"flex",justifyContent:"flex-end" }}>
                <DetailBtn onClick={()=>setDetailView("saldoNop")} color={t.purple}/>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: DRE Sidebar */}
        <div style={{ padding:"18px 16px",overflowY:"auto" }}>
          <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:t.muted,marginBottom:14 }}>DRE Realizado</div>
          {DRE_ROWS.map((row, i) => (
            <div key={i}>
              <div style={{ display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${t.border}`,cursor:"pointer",transition:"padding-left 0.15s",animation:`fadeUp 0.3s ${i*0.035}s both ease` }}
                onMouseEnter={e => { e.currentTarget.style.paddingLeft="4px"; e.currentTarget.querySelector('.dn').style.color=t.text; }}
                onMouseLeave={e => { e.currentTarget.style.paddingLeft="0"; e.currentTarget.querySelector('.dn').style.color=t.muted; }}>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <div style={{ width:4,height:4,borderRadius:"50%",background:row.c }}/>
                  <span className="dn" style={{ fontSize:10,color:t.muted,transition:"color 0.15s" }}>{row.name}</span>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:row.val<0?t.red:t.text }}>{fmtK(row.val)}</div>
                  <div style={{ fontSize:9,color:row.pct<0?`${t.red}88`:t.muted }}>{row.pct.toFixed(1)}%</div>
                </div>
              </div>
              <div style={{ height:1.5,background:`${t.text}08`,borderRadius:1,marginTop:4,marginBottom:2,overflow:"hidden" }}>
                <div style={{ width:`${Math.min(Math.abs(row.pct),100)}%`,height:"100%",background:row.c,opacity:0.55,borderRadius:1,transition:"width 0.7s ease" }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER STRIP */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",borderTop:`1px solid ${t.border}`,flexShrink:0 }}>
        {[
          { l:"Resultado Líquido", v:"+5.901,01", c:t.green, sub:"EBT2 = 2,8% RoB" },
          { l:"Margem de Contribuição", v:"25.232", c:t.blue, sub:"12,0% sobre RoB" },
          { l:"Cobertura CF", v:"−65.248", c:t.red, sub:"EBT1 = −31,0%" },
          { l:"Receitas NOP", v:"+71.149", c:t.green, sub:"Salvou o resultado" },
          { l:"Taxa TDCF", v:"14,79%", c:t.amber, sub:"Sobre receita bruta" },
        ].map((f, i) => (
          <div key={i} style={{ padding:"12px 20px",borderRight:i<4?`1px solid ${t.border}`:"none" }}>
            <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1,color:t.muted,marginBottom:4 }}>{f.l}</div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:14,color:f.c }}>{f.v}</div>
            <div style={{ fontSize:9,color:t.muted,marginTop:1 }}>{f.sub}</div>
          </div>
        ))}
      </div>

      </>)}

      {/* ═══ VIEW: ANÁLISE IA ═══ */}
      {caixaView === "analise" && (
        <>
        {/* KPI Strip — IA context */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:`1px solid ${t.border}`,flexShrink:0 }}>
          {[
            { l:"Receita Bruta", v:"210,7K", c:t.blue, sub:"Mar/26" },
            { l:"Custos Variáveis", v:"154,3K", c:t.red, sub:"73,2% da RoB" },
            { l:"Margem de Contribuição", v:"25,2K", c:t.green, sub:"12,0%" },
            { l:"Saldo de Caixa", v:"5,9K", c:t.amber, sub:"Posição atual" },
          ].map((k, i) => (
            <div key={i} style={{ padding:"14px 22px",borderRight:i<3?`1px solid ${t.border}`:"none" }}>
              <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:5,fontFamily:"'DM Mono',monospace" }}>{k.l}</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:500,color:k.c }}>{k.v}</div>
              <div style={{ fontSize:9,color:t.muted,marginTop:2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Layout: Charts left + Agent right */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 400px",minHeight:900 }}>
          {/* LEFT: Summary cards + DRE waterfall + Table — scrollable */}
          <div style={{ borderRight:`1px solid ${t.border}`,padding:20,display:"flex",flexDirection:"column",gap:14 }}>
            {/* Mini cards */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16,position:"relative",overflow:"hidden" }}>
                <GlowLine color={t.green}/>
                <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:10,fontFamily:"'DM Mono',monospace" }}>EBT2 (Resultado Final)</div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:500,color:t.green,marginBottom:3 }}>+5,9K</div>
                <div style={{ fontSize:9,color:t.muted }}>+2,8% sobre RoB</div>
              </div>
              <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16,position:"relative",overflow:"hidden" }}>
                <GlowLine color={t.amber}/>
                <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:10,fontFamily:"'DM Mono',monospace" }}>TDCF (Deduções)</div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:500,color:t.amber,marginBottom:3 }}>31,1K</div>
                <div style={{ fontSize:9,color:t.muted }}>14,8% da RoB</div>
              </div>
            </div>

            {/* DRE Waterfall */}
            <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:"18px 20px" }}>
              <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:18,fontFamily:"'DM Mono',monospace" }}>DRE — Cascata de Resultado</div>
              <div style={{ display:"flex",alignItems:"flex-end",gap:4,height:140,paddingTop:22 }}>
                {[
                  { h:130, c:t.blue, l:"RoB", v:"210,7K", pct:"100%" },
                  { h:20, c:t.amber, l:"TDCF", v:"31,2K", pct:"14,8%" },
                  { h:111, c:t.green, l:"RL", v:"179,6K", pct:"85,2%" },
                  { h:95, c:t.red, l:"CV", v:"154,4K", pct:"73,2%" },
                  { h:16, c:t.green, l:"MC", v:"25,2K", pct:"12,0%" },
                  { h:56, c:t.amber, l:"CF", v:"90,5K", pct:"42,9%" },
                  { h:40, c:t.red, l:"EBT1", v:"−65,2K", pct:"−31%" },
                  { h:57, c:t.purple, l:"RNOP", v:"92,7K", pct:"44,0%" },
                  { h:14, c:t.red, l:"DNOP", v:"21,6K", pct:"10,2%" },
                  { h:4, c:t.green, l:"EBT2", v:"+5,9K", pct:"2,8%" },
                ].map((bar, i) => (
                  <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:0,position:"relative" }}>
                    {/* Value + pct label */}
                    <div style={{ position:"absolute",top:-20,left:0,right:0,textAlign:"center",whiteSpace:"nowrap" }}>
                      <span style={{ fontSize:9,color:bar.c,fontFamily:"'DM Mono',monospace" }}>{bar.v}</span>
                      <span style={{ fontSize:7,color:t.muted,fontFamily:"'DM Mono',monospace",marginLeft:2 }}>{bar.pct}</span>
                    </div>
                    {/* Bar */}
                    <div style={{
                      width:"85%",height:Math.max(bar.h, 4),borderRadius:"4px 4px 0 0",
                      background:`${bar.c}25`,border:`1px solid ${bar.c}55`,borderBottom:"none",
                      transition:"all 0.2s",cursor:"default",
                    }}
                      onMouseEnter={e=>{e.currentTarget.style.background=`${bar.c}40`;e.currentTarget.style.borderColor=`${bar.c}88`;}}
                      onMouseLeave={e=>{e.currentTarget.style.background=`${bar.c}25`;e.currentTarget.style.borderColor=`${bar.c}55`;}}>
                    </div>
                    {/* Label */}
                    <div style={{ marginTop:5,textAlign:"center" }}>
                      <div style={{ fontSize:8,color:t.textSec,fontFamily:"'DM Mono',monospace",fontWeight:500 }}>{bar.l}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DRE Table */}
            <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,overflow:"hidden" }}>
              <table style={{ width:"100%",borderCollapse:"collapse",fontSize:10 }}>
                <thead>
                  <tr style={{ background:"rgba(0,0,0,0.2)" }}>
                    {["Indicador","Valor","% RoB","Status"].map((h,i) => (
                      <th key={i} style={{ padding:"8px 12px",textAlign:"left",fontSize:8,color:t.muted,textTransform:"uppercase",letterSpacing:0.8,borderBottom:`1px solid ${t.border}`,fontFamily:"'DM Mono',monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dreTable.map((r, i) => (
                    <tr key={i} style={{ borderBottom:i<dreTable.length-1?`1px solid ${t.text}06`:"none" }}>
                      <td style={{ padding:"8px 12px" }}>{r.ind}</td>
                      <td style={{ padding:"8px 12px",fontFamily:"'DM Mono',monospace" }}>{r.val}</td>
                      <td style={{ padding:"8px 12px",fontFamily:"'DM Mono',monospace",color:r.pcColor }}>{r.pct}</td>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ display:"inline-flex",padding:"2px 7px",borderRadius:99,fontSize:8,fontWeight:600,background:`${r.stColor}15`,color:r.stColor,border:`1px solid ${r.stColor}33` }}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ flexShrink:0, height:20 }}/>
          </div>
          <div style={{ display:"flex",flexDirection:"column",background:t.surfaceElevated,minHeight:900 }}>
            {/* Agent header */}
            <div style={{ padding:"14px 16px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",gap:10,background:`${t.purple}06` }}>
              <div style={{ width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${t.purpleDim},${t.blueDim})`,border:`1px solid ${t.purple}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>✦</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12,fontWeight:700,color:t.text }}>Claude — Analista Financeiro</div>
                <div style={{ fontSize:9,color:t.muted,marginTop:1 }}>Analisa os dados do dashboard em tempo real</div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:9,color:t.purple }}>
                <div style={{ width:6,height:6,borderRadius:"50%",background:t.purple,animation:"pulse 2s infinite" }}/>
                Online
              </div>
            </div>

            {/* Messages */}
            <div ref={iaChatRef} style={{ flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12 }}>
              {iaMessages.map((msg, i) => (
                <div key={i} style={{ display:"flex",gap:8,flexDirection:msg.role==="user"?"row-reverse":"row",animation:"fadeUp 0.3s ease" }}>
                  <div style={{ width:24,height:24,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:msg.role==="user"?11:10,
                    background:msg.role==="user"?t.blueDim:`linear-gradient(135deg,${t.purpleDim},${t.blueDim})`,
                    border:`1px solid ${msg.role==="user"?`${t.blue}33`:`${t.purple}33`}` }}>
                    {msg.role==="user"?"👤":"✦"}
                  </div>
                  <div style={{ maxWidth:"85%",padding:"10px 13px",borderRadius:msg.role==="user"?"12px 2px 12px 12px":"2px 12px 12px 12px",fontSize:11,lineHeight:1.6,
                    background:msg.role==="user"?`${t.blue}12`:t.surface,border:`1px solid ${msg.role==="user"?`${t.blue}22`:t.border}`,color:t.text }}>
                    <div dangerouslySetInnerHTML={{ __html: formatIaMsg(msg.content) }}/>
                  </div>
                </div>
              ))}
              {iaTyping && (
                <div style={{ display:"flex",gap:8,animation:"fadeUp 0.3s ease" }}>
                  <div style={{ width:24,height:24,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:`linear-gradient(135deg,${t.purpleDim},${t.blueDim})`,border:`1px solid ${t.purple}33` }}>✦</div>
                  <div style={{ padding:"12px 16px",borderRadius:"2px 12px 12px 12px",background:t.surface,border:`1px solid ${t.border}`,display:"flex",gap:4,alignItems:"center" }}>
                    {[0,1,2].map(j => <div key={j} style={{ width:5,height:5,borderRadius:"50%",background:t.purple,animation:`pulse 1.4s ease ${j*0.2}s infinite` }}/>)}
                  </div>
                </div>
              )}
            </div>

            {/* Context pill */}
            <div style={{ margin:"0 14px 8px",padding:"6px 10px",borderRadius:7,background:`${t.green}0A`,border:`1px solid ${t.green}22`,fontSize:9,color:`${t.green}BB`,fontFamily:"'DM Mono',monospace",display:"flex",alignItems:"center",gap:5 }}>
              ⬡ Contexto carregado: DRE · Caixa · CP/CR · 6 meses
            </div>

            {/* Suggestions */}
            {iaSugsVisible && (
              <div style={{ padding:"0 14px 10px",display:"flex",flexDirection:"column",gap:5 }}>
                <div style={{ fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.muted,marginBottom:4,fontFamily:"'DM Mono',monospace" }}>Perguntas sugeridas</div>
                {iaSuggestions.map((s, i) => (
                  <button key={i} onClick={()=>iaSend(s.full)} style={{
                    padding:"7px 11px",borderRadius:7,fontSize:10,border:`1px solid ${t.border}`,background:t.surface,
                    color:t.text,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all 0.2s",display:"flex",alignItems:"center",gap:7,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=`${t.purple}66`; e.currentTarget.style.background=`${t.purple}0A`; e.currentTarget.style.color=t.purple; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=t.surface; e.currentTarget.style.color=t.text; }}>
                    <span style={{ fontSize:12 }}>{s.icon}</span>{s.short}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding:"12px 14px",borderTop:`1px solid ${t.border}`,display:"flex",gap:8,background:t.surfaceElevated }}>
              <textarea ref={iaInputRef} value={iaInput} onChange={e=>setIaInput(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); iaSend(); } }}
                placeholder="Pergunte sobre os dados do dashboard..."
                rows={1}
                style={{ flex:1,background:t.surface,border:`1px solid ${t.border}`,color:t.text,fontSize:11,padding:"9px 13px",borderRadius:8,fontFamily:"inherit",resize:"none",outline:"none",height:40,lineHeight:1.4,transition:"border-color 0.2s" }}
              />
              <button onClick={()=>iaSend()} disabled={!iaInput.trim()||iaTyping} style={{
                width:40,height:40,borderRadius:8,flexShrink:0,background:`${t.purple}22`,border:`1px solid ${t.purple}44`,color:t.purple,cursor:iaInput.trim()?"pointer":"not-allowed",
                fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",opacity:iaInput.trim()?1:0.4,
              }}>↑</button>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE: EXTRATO (compact)
   ═══════════════════════════════════════════════════════════════════════════ */
const PageExtrato = () => {
  const t = useT();
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("all");
  const [sort, setSort] = useState({ field: "data", dir: "desc" });
  const filtered = mockExtrato.filter(r => {
    if (search && !r.descricao.toLowerCase().includes(search.toLowerCase()) && !getCatDesc(r.catCod).toLowerCase().includes(search.toLowerCase())) return false;
    if (filtro === "concil" && !r.conciliado) return false;
    if (filtro === "pend" && r.conciliado) return false;
    return true;
  });
  const sorted = sortRows(filtered, sort, (r, f) => {
    if (f === "data") return parseDMY(r.data);
    if (f === "banco") return r.banco;
    if (f === "valor") return r.valor;
    if (f === "descricao") return r.descricao;
    if (f === "categoria") return getCatDesc(r.catCod);
    if (f === "status") return r.conciliado ? 1 : 0;
    return 0;
  });
  const totEnt = filtered.filter(r => r.valor > 0).reduce((s, r) => s + r.valor, 0);
  const totSai = filtered.filter(r => r.valor < 0).reduce((s, r) => s + Math.abs(r.valor), 0);

  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 240px",minHeight:"100%" }}>
      <div style={{ display:"flex",flexDirection:"column",borderRight:`1px solid ${t.border}`,minHeight:0 }}>
        {/* KPIs */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",borderBottom:`1px solid ${t.border}` }}>
          {[
            { l:"Saldo Total", v:fmtK(mockContas.reduce((s,c)=>s+c.saldo,0)), c:t.blue },
            { l:"Entradas", v:fmtK(totEnt), c:t.green },
            { l:"Saídas", v:fmtK(totSai), c:t.red },
            { l:"Resultado", v:fmtK(totEnt-totSai), c:totEnt-totSai>=0?t.green:t.red },
            { l:"Lançamentos", v:String(filtered.length), c:t.text },
          ].map((k, i) => (
            <div key={i} style={{ padding:"14px 18px",borderRight:i<4?`1px solid ${t.border}`:"none" }}>
              <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:5 }}>{k.l}</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:17,color:k.c }}>{k.v}</div>
            </div>
          ))}
        </div>
        {/* Filters */}
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 18px",borderBottom:`1px solid ${t.border}`,background:`${t.bg}88` }}>
          <div style={{ position:"relative",flex:1 }}>
            <Search size={13} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:t.muted }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar descrição, categoria..."
              style={{ width:"100%",background:t.surface,border:`1px solid ${t.border}`,color:t.text,fontSize:11,padding:"8px 10px 8px 30px",borderRadius:8,fontFamily:"inherit",outline:"none" }}/>
          </div>
          {["all","concil","pend"].map(f => (
            <button key={f} onClick={()=>setFiltro(f)} style={{ padding:"6px 14px",borderRadius:7,fontSize:10,border:`1px solid ${filtro===f?`${t.blue}55`:t.border}`,background:filtro===f?t.blueDim:"transparent",color:filtro===f?t.blue:t.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:filtro===f?600:400 }}>
              {f==="all"?"Todos":f==="concil"?"Conciliados":"Pendentes"}
            </button>
          ))}
          <span style={{ fontSize:10,color:t.muted,fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap" }}>{filtered.length} itens</span>
        </div>
        {/* Table */}
        <div style={{ flex:1,overflowY:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11 }}>
            <thead>
              <tr style={{ background:`${t.bg}EE`,position:"sticky",top:0,zIndex:5 }}>
                <SortHeader label="Data" field="data" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} />
                <SortHeader label="Banco" field="banco" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} />
                <SortHeader label="Valor" field="valor" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} align="right" />
                <SortHeader label="Descrição" field="descricao" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} />
                <SortHeader label="Categoria" field="categoria" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} />
                <SortHeader label="Status" field="status" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} align="center" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const isE = r.valor > 0;
                return (
                  <tr key={i} style={{ borderBottom:`1px solid ${t.border}22`,transition:"background 0.12s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=isE?`${t.green}08`:`${t.red}08`}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"9px 14px",fontFamily:"'DM Mono',monospace",fontSize:10,color:t.muted }}>{r.data}</td>
                    <td style={{ padding:"9px 14px",fontSize:10,color:t.muted }}>{r.banco}</td>
                    <td style={{ padding:"9px 14px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:isE?t.green:t.red,fontWeight:500 }}>{isE?"+":"−"} {fmtBRL(r.valor)}</td>
                    <td style={{ padding:"9px 14px",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.descricao}</td>
                    <td style={{ padding:"9px 14px",fontSize:10,color:t.muted,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }} title={`${r.catCod} — ${getCatDesc(r.catCod)}`}>{getCatDesc(r.catCod)}</td>
                    <td style={{ padding:"9px 14px",textAlign:"center" }}><ConcilBadge ok={r.conciliado}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Right panel */}
      <div style={{ padding:"16px 14px",overflowY:"auto",display:"flex",flexDirection:"column",gap:12 }}>
        <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:t.muted,fontWeight:500 }}>Saldo por Conta</div>
        {mockContas.map((c, i) => (
          <div key={i} style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:"12px 14px" }}>
            <div style={{ fontSize:10,color:t.muted,display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:c.cor }}/> {c.nome}
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:16,color:c.saldo>=0?t.text:t.red }}>{fmtBRL(c.saldo)}</div>
            <div style={{ height:2,background:`${t.text}08`,borderRadius:2,marginTop:8,overflow:"hidden" }}>
              <div style={{ width:`${(Math.abs(c.saldo)/45231)*100}%`,height:"100%",background:c.cor,opacity:0.6,borderRadius:2 }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE: CP / CR — enriched with 3 views, aging, rankings
   ═══════════════════════════════════════════════════════════════════════════ */

const mockCPFull = [
  { fav:"POSTO IPIRANGA LTDA", valor:42800, vcto:"05/12/2025", status:"A VENCER", cat:"2.03.04", banco:"Itaú" },
  { fav:"FOLHA MOTORISTAS NOV/25", valor:98500, vcto:"05/12/2025", status:"A VENCER", cat:"2.05.93", banco:"Itaú" },
  { fav:"AUTOPISTA LITORAL SUL", valor:8900, vcto:"10/12/2025", status:"A VENCER", cat:"2.03.03", banco:"BB" },
  { fav:"SEGURO CARGA MAPFRE", valor:12400, vcto:"01/11/2025", status:"ATRASADO", cat:"2.03.06", banco:"Itaú" },
  { fav:"MANUTENÇÃO VEÍCULOS", valor:15200, vcto:"20/12/2025", status:"A VENCER", cat:"2.09.02", banco:"BB" },
  { fav:"GALPÃO INHUMAS ALUGUEL", valor:6800, vcto:"15/12/2025", status:"A VENCER", cat:"2.06.01", banco:"Bradesco" },
  { fav:"CONSULTORIA TRIAD", valor:8500, vcto:"30/11/2025", status:"PAGO", cat:"2.10.98", banco:"Itaú" },
  { fav:"POSTOS (ARAGUAÍNA)", valor:31200, vcto:"10/01/2026", status:"A VENCER", cat:"2.03.04", banco:"BB" },
  { fav:"INSS COMPETÊNCIA NOV", valor:14800, vcto:"20/12/2025", status:"A VENCER", cat:"2.05.92", banco:"Itaú" },
  { fav:"FGTS NOV/25", valor:9600, vcto:"07/12/2025", status:"A VENCER", cat:"2.05.90", banco:"Itaú" },
  { fav:"ENERGIA ELÉTRICA", valor:3200, vcto:"25/11/2025", status:"ATRASADO", cat:"2.07.02", banco:"Bradesco" },
  { fav:"INTERNET / TELEFONE", valor:1800, vcto:"28/12/2025", status:"A VENCER", cat:"2.08.01", banco:"Bradesco" },
  { fav:"SEGURO FROTA DEZ", valor:22100, vcto:"15/01/2026", status:"A VENCER", cat:"2.03.06", banco:"Itaú" },
  { fav:"PRÓ-LABORE SÓCIOS", valor:18000, vcto:"05/01/2026", status:"A VENCER", cat:"2.05.97", banco:"BB" },
];
const mockCRFull = [
  { fav:"BEAUVALLET IND", valor:85200, vcto:"10/12/2025", status:"A RECEBER", cat:"1.01.01", banco:"Itaú" },
  { fav:"JHS ALIMENTOS", valor:42300, vcto:"15/12/2025", status:"A RECEBER", cat:"1.01.01", banco:"BB" },
  { fav:"CARGILL SA", valor:128900, vcto:"20/12/2025", status:"A RECEBER", cat:"1.01.01", banco:"Itaú" },
  { fav:"FRIBAL FRIGORÍFICO", valor:34500, vcto:"05/12/2025", status:"A RECEBER", cat:"1.01.01", banco:"BB" },
  { fav:"BRF SA", valor:67800, vcto:"28/12/2025", status:"A RECEBER", cat:"1.01.01", banco:"Itaú" },
  { fav:"MARFRIG GLOBAL", valor:56400, vcto:"10/01/2026", status:"A RECEBER", cat:"1.01.01", banco:"BB" },
  { fav:"MINERVA FOODS", valor:41200, vcto:"15/01/2026", status:"A RECEBER", cat:"1.01.01", banco:"Itaú" },
  { fav:"RENDIMENTO APLIC.", valor:3800, vcto:"02/12/2025", status:"A RECEBER", cat:"1.02.98", banco:"Itaú" },
];

const cpTemporalData = [
  { mes:"Nov/25", cp:24100, cr:0 },
  { mes:"Dez/25", cp:222200, cr:358700 },
  { mes:"Jan/26", cp:89800, cr:97600 },
];

const PageCPCR = () => {
  const t = useT();
  const [tab, setTab] = useState("CP");
  const [view, setView] = useState("lanc"); // lanc | temp | repr
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "vcto", dir: "asc" });

  const rawData = tab === "CP" ? mockCPFull : mockCRFull;
  const isCP = tab === "CP";
  const accent = isCP ? t.red : t.green;
  const accentDim = isCP ? t.redDim : t.greenDim;

  // Filter
  const data = rawData.filter(r => {
    if (search && !r.fav.toLowerCase().includes(search.toLowerCase()) && !getCatDesc(r.cat).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const dataSorted = sortRows(data, sort, (r, f) => {
    if (f === "fav") return r.fav;
    if (f === "categoria") return getCatDesc(r.cat);
    if (f === "banco") return r.banco;
    if (f === "vcto") return parseDMY(r.vcto);
    if (f === "valor") return r.valor;
    if (f === "status") return r.status;
    return 0;
  });

  const aberto = data.filter(r => r.status !== "PAGO" && r.status !== "RECEBIDO");
  const totalAberto = aberto.reduce((s, r) => s + r.valor, 0);
  const atrasado = data.filter(r => r.status === "ATRASADO").reduce((s, r) => s + r.valor, 0);
  const aVencer = aberto.filter(r => r.status !== "ATRASADO").reduce((s, r) => s + r.valor, 0);
  const pago = data.filter(r => r.status === "PAGO" || r.status === "RECEBIDO").reduce((s, r) => s + r.valor, 0);
  const pmDias = isCP ? 24.7 : 19.3;

  // Aging buckets (mock based on vcto distance)
  const today = new Date(2025, 10, 27); // Nov 27 2025 for mock
  const aging = { "0-15": 0, "16-30": 0, "31-60": 0, "60+": 0 };
  aberto.forEach(r => {
    const d = parseDMY(r.vcto);
    const diff = Math.round((d - today) / 86400000);
    if (diff <= 15) aging["0-15"] += r.valor;
    else if (diff <= 30) aging["16-30"] += r.valor;
    else if (diff <= 60) aging["31-60"] += r.valor;
    else aging["60+"] += r.valor;
  });
  const agingMax = Math.max(...Object.values(aging), 1);

  // Category breakdown
  const catBreak = {};
  data.forEach(r => { const desc = getCatDesc(r.cat); catBreak[desc] = (catBreak[desc] || 0) + r.valor; });
  const catSorted = Object.entries(catBreak).sort((a, b) => b[1] - a[1]);
  const catMax = catSorted[0]?.[1] || 1;
  const catTotal = catSorted.reduce((s, [, v]) => s + v, 0) || 1;

  // Favorecido ranking
  const favBreak = {};
  data.forEach(r => { favBreak[r.fav] = (favBreak[r.fav] || 0) + r.valor; });
  const favSorted = Object.entries(favBreak).sort((a, b) => b[1] - a[1]);
  const favMax = favSorted[0]?.[1] || 1;

  const viewBtns = [
    { id:"lanc", label:"☰ Lançamentos" },
    { id:"temp", label:"📅 Temporal" },
    { id:"repr", label:"◫ Representatividade" },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",minHeight:"100%" }}>
      {/* Tab Bar + View Toggle */}
      <div style={{ display:"flex",alignItems:"center",borderBottom:`1px solid ${t.border}`,background:`${t.bg}DD` }}>
        {["CP","CR"].map(t => (
          <button key={t} onClick={()=>{ setTab(t); setSearch(""); }} style={{
            padding:"12px 28px",fontSize:11,fontWeight:tab===t?600:400,color:tab===t?t.text:t.muted,
            background:"transparent",border:"none",
            borderBottom:`2px solid ${tab===t?(t==="CP"?t.red:t.green):"transparent"}`,
            cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,transition:"all 0.2s",
          }}>
            {t==="CP"?"Contas a Pagar":"Contas a Receber"}
            <span style={{ fontSize:9,padding:"1px 8px",borderRadius:99,fontFamily:"'DM Mono',monospace",background:t==="CP"?t.redDim:t.greenDim,color:t==="CP"?t.red:t.green }}>
              {(t==="CP"?mockCPFull:mockCRFull).filter(r=>r.status!=="PAGO"&&r.status!=="RECEBIDO").length}
            </span>
          </button>
        ))}
        {/* View toggle — pushed right */}
        <div style={{ marginLeft:"auto",display:"flex",gap:2,background:`${t.text}06`,borderRadius:8,padding:3,marginRight:20 }}>
          {viewBtns.map(vb => (
            <button key={vb.id} onClick={()=>setView(vb.id)} style={{
              padding:"5px 14px",borderRadius:6,fontSize:10,border:"none",
              background:view===vb.id?t.blueDim:"transparent",
              color:view===vb.id?t.blue:t.muted,fontWeight:view===vb.id?600:400,
              cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",display:"flex",alignItems:"center",gap:5,
            }}>{vb.label}</button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",borderBottom:`1px solid ${t.border}`,flexShrink:0 }}>
        {[
          { l:isCP?"Total a Pagar":"Total a Receber", v:fmtK(totalAberto), c:accent, sub:"Em aberto", glow:accent },
          { l:"A Vencer", v:fmtK(aVencer), c:t.text, sub:"Dentro do prazo", glow:t.green },
          { l:"Atrasado", v:fmtK(atrasado), c:atrasado>0?t.red:t.text, sub:atrasado>0?"Atenção necessária":"Nenhum em atraso", glow:t.red },
          { l:"Prazo Médio", v:`${pmDias} dias`, c:t.text, sub:isCP?"Pagamento":"Recebimento", glow:t.amber },
          { l:"Saldo Líquido", v:fmtK(mockCRFull.reduce((s,r)=>s+r.valor,0)-mockCPFull.reduce((s,r)=>s+r.valor,0)), c:t.green, sub:"CR − CP total", glow:t.blue },
        ].map((k, i) => (
          <div key={i} style={{ padding:"14px 22px",borderRight:i<4?`1px solid ${t.border}`:"none",position:"relative",overflow:"hidden",cursor:"default",transition:"background 0.2s",animation:`fadeUp 0.35s ease ${i*0.04}s both` }}
            onMouseEnter={e => { e.currentTarget.style.background=t.surfaceHover; e.currentTarget.querySelector('.glow2').style.opacity='1'; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.querySelector('.glow2').style.opacity='0'; }}>
            <div className="glow2" style={{ position:"absolute",bottom:0,left:0,right:0,height:1.5,background:k.glow,opacity:0,transition:"opacity 0.3s" }}/>
            <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:6 }}>{k.l}</div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:20,color:k.c }}>{k.v}</div>
            <div style={{ fontSize:9,color:t.muted,marginTop:2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Body: varies by view */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 290px",minHeight:500 }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ display:"flex",flexDirection:"column",borderRight:`1px solid ${t.border}` }}>

          {/* VIEW: LANÇAMENTOS */}
          {view === "lanc" && <>
            {/* Search bar */}
            <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 18px",borderBottom:`1px solid ${t.border}`,background:`${t.bg}88` }}>
              <div style={{ position:"relative",flex:1 }}>
                <Search size={13} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:t.muted }}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar favorecido, categoria..."
                  style={{ width:"100%",background:t.surface,border:`1px solid ${t.border}`,color:t.text,fontSize:11,padding:"8px 10px 8px 30px",borderRadius:8,fontFamily:"inherit",outline:"none" }}/>
              </div>
              <span style={{ fontSize:10,color:t.muted,fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap" }}>{data.length} itens</span>
            </div>
            {/* Summary row */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,padding:"10px 18px",borderBottom:`1px solid ${t.border}` }}>
              {[
                { icon:"↑", label:isCP?"Pago":"Recebido", value:fmtK(pago), color:t.muted, bg:`${t.muted}12` },
                { icon:"⏳", label:"Em aberto", value:fmtK(totalAberto), color:accent, bg:accentDim },
                { icon:"⚠", label:"Atrasado", value:fmtK(atrasado), color:t.red, bg:t.redDim },
              ].map((s,i) => (
                <div key={i} style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:s.bg,flexShrink:0 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:0.8,color:t.muted }}>{s.label}</div>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:14,color:s.color,marginTop:1 }}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Table */}
            <div style={{ flex:1,overflowY:"auto" }}>
              <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11 }}>
                <thead>
                  <tr style={{ background:`${t.bg}EE`,position:"sticky",top:0,zIndex:5 }}>
                    <SortHeader label="Favorecido" field="fav" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} />
                    <SortHeader label="Categoria" field="categoria" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} />
                    <SortHeader label="Banco" field="banco" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} />
                    <SortHeader label="Vencimento" field="vcto" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} />
                    <SortHeader label="Valor" field="valor" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} align="right" />
                    <SortHeader label="Status" field="status" sort={sort} onSort={f=>setSort(prev=>toggleSort(prev,f))} align="center" />
                  </tr>
                </thead>
                <tbody>
                  {dataSorted.map((r, i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${t.border}22`,transition:"background 0.12s" }}
                      onMouseEnter={e=>e.currentTarget.style.background=t.surfaceHover}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"10px 14px",fontWeight:500 }}>{r.fav}</td>
                      <td style={{ padding:"10px 14px",fontSize:10,color:t.muted,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }} title={`${r.cat} — ${getCatDesc(r.cat)}`}>{getCatDesc(r.cat)}</td>
                      <td style={{ padding:"10px 14px",fontSize:10,color:t.muted }}>{r.banco}</td>
                      <td style={{ padding:"10px 14px",fontFamily:"'DM Mono',monospace",fontSize:10,color:r.status==="ATRASADO"?t.red:t.muted }}>{r.vcto}</td>
                      <td style={{ padding:"10px 14px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:accent,fontWeight:500 }}>{isCP?"−":"+"} {fmtBRL(r.valor)}</td>
                      <td style={{ padding:"10px 14px",textAlign:"center" }}><Badge status={r.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>}

          {/* VIEW: TEMPORAL */}
          {view === "temp" && (
            <div style={{ padding:"18px 22px",overflowY:"auto",flex:1 }}>
              {/* Main chart: CP vs CR by month */}
              <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden",marginBottom:14 }}>
                <GlowLine color={t.blue}/>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                  <div>
                    <span style={{ fontSize:10,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500 }}>Vencimentos por Mês — CP × CR</span>
                  </div>
                  <div style={{ display:"flex",gap:14 }}>
                    {[{ c:t.red, l:"A Pagar" },{ c:t.green, l:"A Receber" },{ c:`${t.blue}88`, l:"Saldo", dash:true }].map((lg,i)=>(
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:5,fontSize:9,color:t.muted }}>
                        <div style={{ width:8,height:8,borderRadius:2,background:lg.dash?"transparent":lg.c,border:lg.dash?`1px dashed ${lg.c}`:"none" }}/> {lg.l}
                      </div>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={cpTemporalData} barSize={28} margin={{ top:18, right:4, left:4, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${t.text}06`}/>
                    <XAxis dataKey="mes" tick={{ fill:t.muted,fontSize:10,fontFamily:"DM Mono" }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:t.muted,fontSize:9,fontFamily:"DM Mono" }} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                    <Tooltip content={<CustomTooltip/>} cursor={false}/>
                    <Bar dataKey="cp" name="A Pagar" fill={`${t.red}20`} stroke={t.red} strokeWidth={1.5} radius={[4,4,0,0]} activeBar={{ fill:`${t.red}35`, stroke:t.red, strokeWidth:2, radius:[4,4,0,0] }}>
                      <LabelList dataKey="cp" content={props => <BarLabel {...props} fill={t.red} />} />
                    </Bar>
                    <Bar dataKey="cr" name="A Receber" fill={`${t.green}20`} stroke={t.green} strokeWidth={1.5} radius={[4,4,0,0]} activeBar={{ fill:`${t.green}35`, stroke:t.green, strokeWidth:2, radius:[4,4,0,0] }}>
                      <LabelList dataKey="cr" content={props => <BarLabel {...props} fill={t.green} />} />
                    </Bar>
                    <Line type="monotone" dataKey={d => d.cr - d.cp} name="Saldo" stroke={`${t.blue}88`} strokeWidth={1.5} strokeDasharray="4 3"
                      dot={{ fill:t.blue, r:4 }}/>
                  </ComposedChart>
                </ResponsiveContainer>
                <div style={{ fontSize:8,color:`${t.muted}77`,textAlign:"center",marginTop:4 }}>clique em uma barra para detalhar ▼</div>
              </div>

              {/* Aging analysis */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden" }}>
                  <GlowLine color={t.amber}/>
                  <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500,marginBottom:12 }}>
                    Aging — Prazo de Vencimento
                  </div>
                  {Object.entries(aging).map(([bucket, val], i) => {
                    const colors = [t.green, t.blue, t.amber, T.red];
                    const pct = totalAberto > 0 ? ((val / totalAberto) * 100).toFixed(0) : 0;
                    return (
                      <div key={i} style={{ marginBottom:10 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3 }}>
                          <span style={{ color:t.muted }}>{bucket} dias</span>
                          <div style={{ display:"flex",gap:8 }}>
                            <span style={{ fontFamily:"'DM Mono',monospace",color:t.text }}>{fmtK(val)}</span>
                            <span style={{ fontFamily:"'DM Mono',monospace",color:colors[i],fontSize:9 }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ height:6,background:`${t.text}08`,borderRadius:3,overflow:"hidden" }}>
                          <div style={{ width:`${Math.max(2,(val/agingMax)*100)}%`,height:"100%",background:colors[i],opacity:0.6,borderRadius:3,transition:"width 0.8s ease" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Status distribution */}
                <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden" }}>
                  <GlowLine color={accent}/>
                  <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500,marginBottom:12 }}>
                    Distribuição por Status
                  </div>
                  {[
                    { label:"A Vencer", val:aVencer, color:t.green, count:aberto.filter(r=>r.status!=="ATRASADO").length },
                    { label:"Atrasado", val:atrasado, color:t.red, count:data.filter(r=>r.status==="ATRASADO").length },
                    { label:isCP?"Pago":"Recebido", val:pago, color:t.muted, count:data.filter(r=>r.status==="PAGO"||r.status==="RECEBIDO").length },
                  ].map((s, i) => {
                    const pct = (rawData.reduce((a,r)=>a+r.valor,0)) > 0 ? ((s.val / rawData.reduce((a,r)=>a+r.valor,0)) * 100).toFixed(0) : 0;
                    return (
                      <div key={i} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                            <div style={{ width:5,height:5,borderRadius:"50%",background:s.color }}/>
                            <span style={{ color:t.muted }}>{s.label}</span>
                            <span style={{ fontSize:8,color:t.mutedDim,fontFamily:"'DM Mono',monospace" }}>{s.count} itens</span>
                          </div>
                          <div style={{ display:"flex",gap:8 }}>
                            <span style={{ fontFamily:"'DM Mono',monospace",color:s.color }}>{fmtK(s.val)}</span>
                            <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:t.muted }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ height:5,background:`${t.text}08`,borderRadius:3,overflow:"hidden" }}>
                          <div style={{ width:`${Math.max(2, Number(pct))}%`,height:"100%",background:s.color,opacity:0.55,borderRadius:3,transition:"width 0.8s ease" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: REPRESENTATIVIDADE */}
          {view === "repr" && (
            <div style={{ padding:"18px 22px",overflowY:"auto",flex:1 }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                {/* Ranking by Favorecido */}
                <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden" }}>
                  <GlowLine color={accent}/>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
                    <span style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500 }}>Ranking por Favorecido</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontSize:13,color:t.text }}>{fmtK(catTotal)}</span>
                  </div>
                  {favSorted.slice(0, 8).map(([name, val], i) => {
                    const pct = ((val / catTotal) * 100).toFixed(1);
                    return (
                      <div key={i} style={{ marginBottom:8 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                            <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:t.mutedDim,width:16 }}>#{i+1}</span>
                            <span style={{ color:t.muted,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</span>
                          </div>
                          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                            <span style={{ fontFamily:"'DM Mono',monospace",color:t.text,fontSize:10 }}>{fmtK(val)}</span>
                            <span style={{ fontFamily:"'DM Mono',monospace",color:accent,fontSize:9,minWidth:36,textAlign:"right" }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ height:4,background:`${t.text}08`,borderRadius:2,overflow:"hidden" }}>
                          <div style={{ width:`${(val/favMax)*100}%`,height:"100%",background:accent,opacity:0.5,borderRadius:2,transition:"width 0.8s ease" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ranking by Category */}
                <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden" }}>
                  <GlowLine color={t.blue}/>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
                    <span style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500 }}>Ranking por Categoria</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontSize:13,color:t.text }}>{fmtK(catTotal)}</span>
                  </div>
                  {catSorted.slice(0, 8).map(([name, val], i) => {
                    const colors = [t.blue, t.orange, t.amber, t.green, t.purple, t.red, t.muted, T.blue];
                    const pct = ((val / catTotal) * 100).toFixed(1);
                    return (
                      <div key={i} style={{ marginBottom:8 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                            <div style={{ width:5,height:5,borderRadius:"50%",background:colors[i % 8],flexShrink:0 }}/>
                            <span style={{ color:t.muted,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</span>
                          </div>
                          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                            <span style={{ fontFamily:"'DM Mono',monospace",color:t.text,fontSize:10 }}>{fmtK(val)}</span>
                            <span style={{ fontFamily:"'DM Mono',monospace",color:colors[i % 8],fontSize:9,minWidth:36,textAlign:"right" }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ height:4,background:`${t.text}08`,borderRadius:2,overflow:"hidden" }}>
                          <div style={{ width:`${(val/catMax)*100}%`,height:"100%",background:colors[i % 8],opacity:0.5,borderRadius:2,transition:"width 0.8s ease" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Concentration bar — visual pareto */}
              <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,marginTop:10,position:"relative",overflow:"hidden" }}>
                <GlowLine color={t.amber}/>
                <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500,marginBottom:10 }}>
                  Concentração — Top 3 representam {((favSorted.slice(0,3).reduce((s,[,v])=>s+v,0)/catTotal)*100).toFixed(0)}% do total
                </div>
                <div style={{ display:"flex",height:24,borderRadius:6,overflow:"hidden",gap:1 }}>
                  {favSorted.slice(0, 6).map(([name, val], i) => {
                    const colors = [accent, t.blue, t.amber, t.purple, t.orange, T.muted];
                    const w = (val / catTotal) * 100;
                    return (
                      <div key={i} title={`${name}: ${fmtK(val)} (${w.toFixed(1)}%)`}
                        style={{ width:`${w}%`,background:`${colors[i]}44`,borderLeft:i>0?`1px solid ${t.bg}`:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:colors[i],fontFamily:"'DM Mono',monospace",overflow:"hidden",whiteSpace:"nowrap",transition:"width 0.8s ease" }}>
                        {w > 8 ? `${w.toFixed(0)}%` : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{ padding:"16px 14px",overflowY:"auto",display:"flex",flexDirection:"column",gap:12 }}>
          {/* Resumo card */}
          <div style={{ background:`linear-gradient(135deg,${accentDim},${t.blueDim})`,border:`1px solid ${accent}33`,borderRadius:12,padding:14 }}>
            <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:4,fontWeight:500 }}>
              {isCP?"Posição Contas a Pagar":"Posição Contas a Receber"}
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:22,color:accent,lineHeight:1,margin:"6px 0" }}>{fmtK(totalAberto)}</div>
            <div style={{ fontSize:9,color:t.muted }}>{aberto.length} documentos em aberto</div>
          </div>

          {/* Prazo Médio visual */}
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:14 }}>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500,marginBottom:10 }}>Prazo Médio</div>
            <div style={{ display:"flex",alignItems:"baseline",gap:4,marginBottom:8 }}>
              <span style={{ fontFamily:"'DM Mono',monospace",fontSize:28,color:t.text,lineHeight:1 }}>{pmDias}</span>
              <span style={{ fontSize:10,color:t.muted }}>dias</span>
            </div>
            <div style={{ height:4,background:`${t.text}08`,borderRadius:2,overflow:"hidden" }}>
              <div style={{ width:`${Math.min(100,(pmDias/60)*100)}%`,height:"100%",background:pmDias>30?t.amber:t.green,opacity:0.6,borderRadius:2 }}/>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:8,color:t.mutedDim,marginTop:4 }}>
              <span>0d</span><span>30d</span><span>60d</span>
            </div>
          </div>

          {/* Top favorecidos mini */}
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:14 }}>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500,marginBottom:10 }}>Top Favorecidos</div>
            {favSorted.slice(0, 5).map(([name, val], i) => (
              <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${t.border}22` }}>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:t.mutedDim,width:14 }}>#{i+1}</span>
                  <span style={{ fontSize:10,color:t.muted,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</span>
                </div>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:accent }}>{fmtK(val)}</span>
              </div>
            ))}
          </div>

          {/* Aging mini */}
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:14 }}>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500,marginBottom:10 }}>Aging</div>
            {Object.entries(aging).map(([bucket, val], i) => {
              const colors = [t.green, t.blue, t.amber, T.red];
              return (
                <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${t.border}22` }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <div style={{ width:5,height:5,borderRadius:"50%",background:colors[i] }}/>
                    <span style={{ fontSize:10,color:t.muted }}>{bucket}d</span>
                  </div>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:colors[i] }}>{fmtK(val)}</span>
                </div>
              );
            })}
          </div>

          {/* Próximos vencimentos */}
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:14 }}>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500,marginBottom:10 }}>Próximos Vencimentos</div>
            {aberto.sort((a,b) => { const da=parseDMY(a.vcto),db=parseDMY(b.vcto); return da-db; }).slice(0, 5).map((r, i) => (
              <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${t.border}22` }}>
                <div>
                  <div style={{ fontSize:10,color:t.text,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.fav}</div>
                  <div style={{ fontSize:9,color:r.status==="ATRASADO"?t.red:t.muted,fontFamily:"'DM Mono',monospace" }}>{r.vcto}</div>
                </div>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:accent }}>{fmtK(r.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE: FLUXO DE CAIXA
   ═══════════════════════════════════════════════════════════════════════════ */
const PageFluxo = () => {
  const t = useT();
  const [hz, setHz] = useState(30);
  const saldoAtual = mockContas.reduce((s, c) => s + c.saldo, 0);
  const totEnt = mockFluxo.reduce((s, m) => s + m.ent, 0);
  const totSai = mockFluxo.reduce((s, m) => s + m.sai, 0);
  const proj = saldoAtual + totEnt - totSai;
  const cob = totSai > 0 ? totEnt / totSai : 0;
  const fluxoDiario = useMemo(() => {
    const seed = (i) => Math.abs(Math.sin(i * 9301 + 49297) * 233280) % 1; // deterministic pseudo-random
    return Array.from({ length: Math.min(hz, 90) }, (_, i) => {
      const ent = (Math.sin(i*0.3)+1)*8000+seed(i)*5000;
      const sai = (Math.cos(i*0.2)+1)*6000+seed(i+999)*4000;
      return { dia: `D${i+1}`, saldo: saldoAtual+(ent-sai)*(i+1)*0.1 };
    });
  }, [hz, saldoAtual]);

  return (
    <div style={{ display:"flex",flexDirection:"column",minHeight:"100%" }}>
      {/* Horizon */}
      <div style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 20px",borderBottom:`1px solid ${t.border}`,background:`${t.bg}CC`,flexWrap:"wrap" }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,background:t.blueDim,border:`1px solid ${t.blue}33`,borderRadius:8,padding:"6px 14px" }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:t.blue,animation:"pulse 2s infinite" }}/>
          <span style={{ fontSize:10,color:t.muted,fontFamily:"'DM Mono',monospace" }}>Hoje</span>
        </div>
        <span style={{ color:t.muted }}>→</span>
        {[7,30,60,90].map(d => (
          <button key={d} onClick={()=>setHz(d)} style={{ padding:"5px 14px",borderRadius:7,fontSize:10,border:`1px solid ${hz===d?`${t.blue}55`:t.border}`,background:hz===d?t.blueDim:"transparent",color:hz===d?t.blue:t.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:hz===d?600:400 }}>+{d}d</button>
        ))}
        <div style={{ marginLeft:"auto",background:t.surface,border:`1px solid ${t.border}`,borderRadius:8,padding:"6px 14px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:16,color:t.text }}>+{hz}</div>
          <div style={{ fontSize:9,color:t.muted }}>dias à frente</div>
        </div>
      </div>
      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",borderBottom:`1px solid ${t.border}` }}>
        {[
          { l:"Saldo Atual", v:fmtK(saldoAtual), c:t.blue },
          { l:"Entradas Prev.", v:fmtK(totEnt), c:t.green },
          { l:"Saídas Prev.", v:fmtK(totSai), c:t.red },
          { l:"Saldo Projetado", v:fmtK(proj), c:proj>=0?t.green:t.red },
          { l:"Cobertura", v:cob.toFixed(2)+"x", c:t.amber },
        ].map((k, i) => (
          <div key={i} style={{ padding:"14px 22px",borderRight:i<4?`1px solid ${t.border}`:"none" }}>
            <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:6 }}>{k.l}</div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:20,color:k.c }}>{k.v}</div>
          </div>
        ))}
      </div>
      {/* Charts */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 260px",minHeight:480 }}>
        <div style={{ padding:16,overflowY:"auto",display:"flex",flexDirection:"column",gap:14,borderRight:`1px solid ${t.border}` }}>
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden" }}>
            <GlowLine color={t.blue}/>
            <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:12 }}>Entradas × Saídas Mensais</div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={mockFluxo} margin={{ top:18, right:4, left:4, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${t.text}06`}/>
                <XAxis dataKey="mes" tick={{ fill:t.muted,fontSize:10,fontFamily:"DM Mono" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:t.muted,fontSize:9,fontFamily:"DM Mono" }} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                <Tooltip content={<CustomTooltip/>} cursor={false}/>
                <Bar dataKey="ent" name="Entradas" fill={`${t.green}25`} stroke={t.green} strokeWidth={1.5} radius={[4,4,0,0]} barSize={28} activeBar={{ fill:`${t.green}38`, stroke:t.green, strokeWidth:2, radius:[4,4,0,0] }}>
                  <LabelList dataKey="ent" content={props => <BarLabel {...props} fill={t.green} />} />
                </Bar>
                <Bar dataKey="sai" name="Saídas" fill={`${t.red}25`} stroke={t.red} strokeWidth={1.5} radius={[4,4,0,0]} barSize={28} activeBar={{ fill:`${t.red}38`, stroke:t.red, strokeWidth:2, radius:[4,4,0,0] }}>
                  <LabelList dataKey="sai" content={props => <BarLabel {...props} fill={t.red} />} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:14,position:"relative",overflow:"hidden" }}>
            <GlowLine color={t.green}/>
            <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:12 }}>Saldo Projetado Diário</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={fluxoDiario}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${t.text}06`}/>
                <XAxis dataKey="dia" tick={{ fill:t.muted,fontSize:8,fontFamily:"DM Mono" }} axisLine={false} tickLine={false} interval={Math.floor(hz/8)}/>
                <YAxis tick={{ fill:t.muted,fontSize:9,fontFamily:"DM Mono" }} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                <Tooltip content={<CustomTooltip/>}/>
                <ReferenceLine y={0} stroke={t.muted} strokeDasharray="3 3"/>
                <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={t.green} stopOpacity={0.15}/><stop offset="95%" stopColor={t.green} stopOpacity={0}/></linearGradient></defs>
                <Area type="monotone" dataKey="saldo" name="Saldo" stroke={t.green} fill="url(#sg)" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Side */}
        <div style={{ padding:"16px 14px",overflowY:"auto",display:"flex",flexDirection:"column",gap:14 }}>
          <div style={{ background:`linear-gradient(135deg,${t.blueDim},${t.greenDim})`,border:`1px solid ${t.blue}33`,borderRadius:12,padding:16 }}>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:4 }}>Saldo Projetado Final</div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:22,color:proj>=0?t.green:t.red,margin:"6px 0" }}>{proj>=0?"+":""}{fmtK(proj)}</div>
            <div style={{ fontSize:9,color:t.muted }}>Horizonte de {hz} dias</div>
          </div>
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:14 }}>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500,marginBottom:10 }}>Maiores Entradas</div>
            {[...mockCRFull].sort((a,b)=>b.valor-a.valor).slice(0,4).map((r,i)=>(
              <div key={i} style={{ marginBottom:8 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:3 }}>
                  <span style={{ color:t.muted }}>{r.fav}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",color:t.text }}>{fmtK(r.valor)}</span>
                </div>
                <div style={{ height:3,background:`${t.text}08`,borderRadius:2,overflow:"hidden" }}>
                  <div style={{ width:`${(r.valor/128900)*100}%`,height:"100%",background:t.green,opacity:0.7,borderRadius:2 }}/>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:14 }}>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500,marginBottom:10 }}>Maiores Saídas</div>
            {[...mockCPFull].sort((a,b)=>b.valor-a.valor).slice(0,4).map((r,i)=>(
              <div key={i} style={{ marginBottom:8 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:3 }}>
                  <span style={{ color:t.muted }}>{r.fav}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",color:t.text }}>{fmtK(r.valor)}</span>
                </div>
                <div style={{ height:3,background:`${t.text}08`,borderRadius:2,overflow:"hidden" }}>
                  <div style={{ width:`${(r.valor/98500)*100}%`,height:"100%",background:t.red,opacity:0.7,borderRadius:2 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE: CONCILIAÇÃO — Calendar heatmap + reconciliation tables
   ═══════════════════════════════════════════════════════════════════════════ */

// Generate mock reconciliation data per day
// Logic: dif = vConcExtrato - vConcSaldoLimite + AjusteSaldoManual
// When dif === 0 → conciliado (green), dif !== 0 → pendente (red/orange)
const genConcilData = () => {
  const data = {};
  const banks = ["Itaú","Banco do Brasil","Bradesco","Santander"];
  const start = new Date(2025, 9, 1); // Oct 1 2025
  const end = new Date(2026, 2, 31); // Mar 31 2026
  const cur = new Date(start);
  const today = new Date(2025, 10, 27); // Nov 27 for mock "today"

  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-${String(cur.getDate()).padStart(2,"0")}`;
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) { // weekdays
      const hasMovement = Math.random() > 0.12;
      if (hasMovement) {
        const extrato = Math.round((Math.random() - 0.4) * 50000 * 100) / 100;
        const saldoLimite = Math.round((Math.random() * 80000 - 10000) * 100) / 100;
        const ajusteManual = 0; // usually 0 unless manually adjusted

        // Older dates have higher chance of being reconciled (dif=0)
        const daysSinceStart = Math.round((cur - start) / 86400000);
        const daysUntilToday = Math.round((today - cur) / 86400000);
        const reconcileChance = daysUntilToday > 30 ? 0.92 : daysUntilToday > 14 ? 0.75 : daysUntilToday > 0 ? 0.55 : 0.2;

        // The core formula: dif = extrato - saldoLimite + ajusteManual
        // If reconciled, the bank adjusted so dif lands at 0
        const isReconciled = Math.random() < reconcileChance;
        const rawDif = Math.round((extrato - saldoLimite + ajusteManual) * 100) / 100;
        const dif = isReconciled ? 0 : rawDif;
        // If reconciled, saldoBanco matches extrato (adjusted)
        const saldoBanco = isReconciled ? Math.round((saldoLimite + rawDif) * 100) / 100 : saldoLimite;

        data[key] = {
          date: key,
          extrato,
          saldoBanco,
          dif,
          conciliado: dif === 0, // ← DERIVED from dif, not random
          banco: banks[Math.floor(Math.random() * banks.length)],
        };
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return data;
};
const CONCIL_DATA = genConcilData();

const MONTH_NAMES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DOW_SHORT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const PageConciliacao = () => {
  const t = useT();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBank, setSelectedBank] = useState("Todos");
  const [sortC, setSortC] = useState({ field: "date", dir: "desc" });
  const banks = ["Todos","Itaú","Banco do Brasil","Bradesco","Santander"];

  // Calendar months: Oct 2025 → Mar 2026
  const calMonths = [
    { year:2025, month:9 },  // Oct
    { year:2025, month:10 }, // Nov
    { year:2025, month:11 }, // Dec
    { year:2026, month:0 },  // Jan
    { year:2026, month:1 },  // Feb
    { year:2026, month:2 },  // Mar
  ];

  // Stats — each metric computed once, used in ONE place only
  const allEntries = Object.values(CONCIL_DATA);
  const filteredEntries = selectedBank === "Todos" ? allEntries : allEntries.filter(e => e.banco === selectedBank);
  const totalConcil = filteredEntries.filter(e => e.conciliado).length;
  const totalPend = filteredEntries.filter(e => !e.conciliado).length;
  const totalDias = filteredEntries.length;
  const pctConcil = totalDias > 0 ? Math.round((totalConcil / totalDias) * 100) : 0;

  // Unique analytical metrics
  const pendEntries = filteredEntries.filter(e => !e.conciliado);
  const somaDif = pendEntries.reduce((s, e) => s + Math.abs(e.dif), 0);
  const maiorDif = pendEntries.length > 0 ? Math.max(...pendEntries.map(e => Math.abs(e.dif))) : 0;
  const mediaExtrato = totalDias > 0 ? filteredEntries.reduce((s, e) => s + Math.abs(e.extrato), 0) / totalDias : 0;

  // Streak: consecutive pending days from most recent
  const sortedDesc = [...filteredEntries].sort((a, b) => b.date.localeCompare(a.date));
  let streakPend = 0;
  for (const e of sortedDesc) { if (!e.conciliado) streakPend++; else break; }

  // Last reconciled date
  const lastConcil = sortedDesc.find(e => e.conciliado);
  const lastConcilDate = lastConcil ? lastConcil.date : null;

  // ── SLA D+1 ÚTIL — Atraso de conciliação ──────────────────────────────────
  // Feriados nacionais brasileiros no período Out/2025 – Mar/2026
  const FERIADOS = new Set([
    "2025-10-12", // N.S. Aparecida
    "2025-11-02", // Finados
    "2025-11-15", // Proclamação da República
    "2025-11-20", // Consciência Negra
    "2025-12-25", // Natal
    "2026-01-01", // Confraternização Universal
    "2026-02-16", // Carnaval (ponto facultativo, mas bancário fecha)
    "2026-02-17", // Carnaval
    "2026-02-18", // Quarta de Cinzas (meio-dia, tratado como feriado bancário)

  ]);

  const isBusinessDay = (d) => {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return false; // fim de semana
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return !FERIADOS.has(key);
  };

  const nextBusinessDay = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    // Avança para o próximo dia útil após a data do movimento
    dt.setDate(dt.getDate() + 1); // D+1
    while (!isBusinessDay(dt)) {
      dt.setDate(dt.getDate() + 1);
    }
    return dt;
  };

  const todayRef = new Date(2025, 10, 27); // Nov 27 2025 (mock today)
  todayRef.setHours(0, 0, 0, 0);

  // Para cada dia pendente, calcula se está dentro ou fora do SLA
  const slaAnalysis = pendEntries.map(e => {
    const prazoLimite = nextBusinessDay(e.date); // deadline: próximo dia útil após movimento
    const diffDays = Math.round((todayRef - prazoLimite) / 86400000); // positivo = atrasado
    return {
      ...e,
      prazoLimite,
      diasAtraso: Math.max(0, diffDays), // 0 se ainda dentro do prazo
      dentroSLA: diffDays <= 0,
    };
  });

  const dentroSLA = slaAnalysis.filter(e => e.dentroSLA).length;
  const foraSLA = slaAnalysis.filter(e => !e.dentroSLA).length;
  const pctSLA = pendEntries.length > 0 ? Math.round((dentroSLA / pendEntries.length) * 100) : 100;
  const maxAtraso = slaAnalysis.length > 0 ? Math.max(...slaAnalysis.map(e => e.diasAtraso)) : 0;
  const mediaAtraso = foraSLA > 0 ? Math.round(slaAnalysis.filter(e => !e.dentroSLA).reduce((s, e) => s + e.diasAtraso, 0) / foraSLA) : 0;

  // Reconciliation table — sorted by date desc
  const reconEntries = sortRows([...filteredEntries].slice(0, 50), sortC, (r, f) => {
    if (f === "date") return new Date(r.date);
    if (f === "extrato") return r.extrato;
    if (f === "saldoBanco") return r.saldoBanco;
    if (f === "dif") return Math.abs(r.dif);
    if (f === "status") return r.conciliado ? 1 : 0;
    return 0;
  });

  // Selected date detail
  const selectedEntries = selectedDate
    ? Object.entries(CONCIL_DATA).filter(([k]) => k === selectedDate).map(([, v]) => v)
    : [];

  // Build calendar grid for a month
  const CalendarMonth = ({ year, month, bankFilter }) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = "2025-11-27";

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, padding:"8px 6px", position:"relative", overflow:"hidden" }}>
        <GlowLine color={t.blue} />
        <div style={{ textAlign:"center", fontSize:9, fontWeight:600, color:t.text, marginBottom:5 }}>
          {MONTH_NAMES_FULL[month]} {year}
        </div>
        {/* DOW headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, marginBottom:2 }}>
          {DOW_SHORT.map((d, i) => (
            <div key={i} style={{ textAlign:"center", fontSize:6, color:t.mutedDim, fontFamily:"'DM Mono',monospace", padding:"1px 0" }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1 }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dateKey = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const rawEntry = CONCIL_DATA[dateKey];
            const entry = rawEntry && (bankFilter === "Todos" || rawEntry.banco === bankFilter) ? rawEntry : null;
            const isToday = dateKey === today;
            const isSelected = dateKey === selectedDate;

            let bg = "transparent";
            let color = t.mutedDim;
            let border = "1px solid transparent";

            if (entry) {
              if (entry.conciliado) {
                bg = `${t.green}30`;
                color = t.green;
              } else {
                // Check SLA: D+1 útil
                const prazo = nextBusinessDay(dateKey);
                const isOverdue = todayRef >= prazo;
                if (isOverdue) {
                  bg = `${t.red}30`; // FORA do SLA — vermelho
                  color = t.red;
                } else {
                  bg = `${t.amber}30`; // Dentro do SLA — âmbar
                  color = t.amber;
                }
              }
            }
            if (isToday) {
              border = `2px solid ${t.blue}`;
              color = t.blue;
            }
            if (isSelected) {
              border = `2px solid ${t.text}`;
              bg = `${t.blue}30`;
            }

            return (
              <div key={i} onClick={() => entry && setSelectedDate(dateKey)}
                style={{
                  width:"100%", aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:8, fontFamily:"'DM Mono',monospace", fontWeight: isToday||isSelected ? 600 : 400,
                  background:bg, color, border, borderRadius:4,
                  cursor: entry ? "pointer" : "default",
                  transition:"all 0.15s",
                }}>
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const fmtDateBR = (key) => {
    if (!key) return "—";
    const [y, m, d] = key.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"auto" }}>
      {/* KPI Strip — each metric is UNIQUE, no repetition */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        {[
          { l:"% Conciliação", v:`${pctConcil}%`, c:pctConcil>=80?t.green:pctConcil>=50?t.amber:t.red, sub:`${totalConcil} de ${totalDias} dias`, glow:pctConcil>=80?t.green:t.amber },
          { l:"Σ Diferenças Abertas", v:fmtK(somaDif), c:somaDif>0?t.red:t.green, sub:`${totalPend} dias com DIF ≠ 0`, glow:t.red },
          { l:"Maior Diferença", v:fmtK(maiorDif), c:maiorDif>0?t.red:t.text, sub:"Pior dia do período", glow:t.red },
          { l:"Dias sem Conciliar", v:String(streakPend), c:streakPend>5?t.red:streakPend>2?t.amber:t.green, sub:streakPend>0?"Sequência recente":"Em dia", glow:streakPend>5?t.red:t.green },
          { l:"Média Diária Extrato", v:fmtK(mediaExtrato), c:t.blue, sub:`${totalDias} dias no período`, glow:t.blue },
        ].map((k, i) => (
          <div key={i} style={{ padding:"14px 22px", borderRight:i<4?`1px solid ${t.border}`:"none", position:"relative", overflow:"hidden", cursor:"default", transition:"background 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = t.surfaceHover; e.currentTarget.querySelector('.glc').style.opacity='1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.querySelector('.glc').style.opacity='0'; }}>
            <div className="glc" style={{ position:"absolute",bottom:0,left:0,right:0,height:1.5,background:k.glow,opacity:0,transition:"opacity 0.3s" }}/>
            <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,marginBottom:6 }}>{k.l}</div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:20,color:k.c }}>{k.v}</div>
            <div style={{ fontSize:9,color:t.muted,marginTop:2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Bank filter */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 20px", borderBottom:`1px solid ${t.border}`, background:`${t.bg}CC` }}>
        <span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:1.2, color:t.muted, fontWeight:500 }}>Banco:</span>
        {banks.map(b => (
          <button key={b} onClick={()=>setSelectedBank(b)} style={{
            padding:"5px 14px", borderRadius:7, fontSize:10,
            border:`1px solid ${selectedBank===b?`${t.blue}55`:t.border}`,
            background:selectedBank===b?t.blueDim:"transparent",
            color:selectedBank===b?t.blue:t.muted,
            cursor:"pointer", fontFamily:"inherit", fontWeight:selectedBank===b?600:400, transition:"all 0.2s",
          }}>{b}</button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}>
          {/* Formula reference */}
          <div style={{ display:"flex", alignItems:"center", gap:6, background:`${t.purple}0A`, border:`1px solid ${t.purple}22`, borderRadius:6, padding:"4px 10px" }}>
            <span style={{ fontSize:8, color:t.purple, fontFamily:"'DM Mono',monospace", letterSpacing:0.3 }}>DIF = Extrato − SaldoLimite + Ajuste</span>
            <span style={{ fontSize:8, color:`${t.purple}88` }}>│</span>
            <span style={{ fontSize:8, fontFamily:"'DM Mono',monospace" }}>
              <span style={{ color:t.green }}>0 = ✓</span>
              <span style={{ color:t.muted }}> · </span>
              <span style={{ color:t.red }}>≠ 0 = ✗</span>
            </span>
            <span style={{ fontSize:8, color:`${t.purple}88` }}>│</span>
            <span style={{ fontSize:8, color:t.amber, fontFamily:"'DM Mono',monospace" }}>SLA: D+1 útil</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:`${t.green}40` }}/>
              <span style={{ fontSize:9, color:t.muted }}>DIF = 0</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:`${t.amber}40` }}/>
              <span style={{ fontSize:9, color:t.muted }}>Pendente (no prazo)</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:`${t.red}40` }}/>
              <span style={{ fontSize:9, color:t.muted }}>Fora do SLA</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:10, height:10, borderRadius:2, border:`2px solid ${t.blue}`, background:"transparent" }}/>
              <span style={{ fontSize:9, color:t.muted }}>Hoje</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar heatmap strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:6, padding:"10px 20px", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        {calMonths.map((cm, i) => (
          <CalendarMonth key={i} year={cm.year} month={cm.month} bankFilter={selectedBank} />
        ))}
      </div>

      {/* Bottom: two tables side by side */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", minHeight:420 }}>

        {/* LEFT TABLE — Daily bank entries */}
        <div style={{ display:"flex", flexDirection:"column", borderRight:`1px solid ${t.border}`, overflow:"hidden" }}>
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${t.border}`, background:`${t.bg}AA`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:10, textTransform:"uppercase", letterSpacing:1.2, color:t.muted, fontWeight:500 }}>
                Lançamentos do Dia
              </span>
              {selectedDate && (
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:t.blue, fontWeight:500 }}>
                  {fmtDateBR(selectedDate)}
                </span>
              )}
            </div>
            {selectedDate && (
              <button onClick={()=>setSelectedDate(null)} style={{ fontSize:9, color:t.muted, background:"transparent", border:`1px solid ${t.border}`, borderRadius:6, padding:"3px 10px", cursor:"pointer", fontFamily:"inherit" }}>
                Limpar seleção
              </button>
            )}
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {!selectedDate ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8, color:t.muted }}>
                <Calendar size={24} strokeWidth={1}/>
                <span style={{ fontSize:11 }}>Selecione um dia no calendário</span>
                <span style={{ fontSize:9, color:t.mutedDim }}>Os lançamentos do dia aparecerão aqui</span>
              </div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:`${t.bg}EE`, position:"sticky", top:0, zIndex:5 }}>
                    {["Data","Banco","Descrição","Valor"].map((h, i) => (
                      <th key={i} style={{ padding:"10px 14px", textAlign:i===3?"right":"left", fontSize:9, fontWeight:600, color:t.muted, textTransform:"uppercase", letterSpacing:0.8, borderBottom:`1px solid ${t.border}`, fontFamily:"'DM Mono',monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Deterministic mock entries for the selected day */}
                  {Array.from({ length: 10 }, (_, i) => {
                    const entry = CONCIL_DATA[selectedDate];
                    if (!entry) return null;
                    const seed = Math.abs(Math.sin((i+1) * 9301 + selectedDate.charCodeAt(3) * 49297) * 233280) % 1;
                    const valor = Math.round((seed - 0.35) * 22000 * 100) / 100;
                    const descs = ["PIX RECEBIDO - FRETE","PAGTO FORNECEDOR","TRANSFERÊNCIA ENTRE CONTAS","TARIFA BANCÁRIA","BOLETO COBRANÇA","TED ENVIADA","PIX ENVIADO - ADTO","CRÉDITO CT-E","PAGTO DIESEL","RECEBIMENTO NF-E"];
                    const bancos = ["Itaú","Banco do Brasil","Bradesco","Santander"];
                    return (
                      <tr key={i} style={{ borderBottom:`1px solid ${t.border}22`, transition:"background 0.12s" }}
                        onMouseEnter={e=>e.currentTarget.style.background=valor>0?`${t.green}06`:`${t.red}06`}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"9px 14px", fontFamily:"'DM Mono',monospace", fontSize:10, color:t.muted }}>{fmtDateBR(selectedDate)}</td>
                        <td style={{ padding:"9px 14px", fontSize:10, color:t.muted }}>{bancos[i % bancos.length]}</td>
                        <td style={{ padding:"9px 14px", fontSize:10 }}>{descs[i % descs.length]}</td>
                        <td style={{ padding:"9px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", color:valor>0?t.green:t.red, fontWeight:500 }}>
                          {valor>0?"+":"−"} {fmtBRL(valor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT TABLE — Reconciliation status */}
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${t.border}`, background:`${t.bg}AA`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:10, textTransform:"uppercase", letterSpacing:1.2, color:t.muted, fontWeight:500 }}>
                Conciliação Diária
              </span>
              <span style={{ fontSize:8, color:t.mutedDim, fontFamily:"'DM Mono',monospace" }}>
                DIF = Extrato − Saldo + Ajuste · SLA D+1 útil
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12, fontSize:9 }}>
              <span style={{ color:t.green, fontFamily:"'DM Mono',monospace" }}>
                {pctConcil}% ok
              </span>
              {streakPend > 0 && <span style={{ color:t.amber, fontFamily:"'DM Mono',monospace" }}>
                {streakPend}d sequência aberta
              </span>}
            </div>
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:`${t.bg}EE`, position:"sticky", top:0, zIndex:5 }}>
                  <th style={{ padding:"10px 6px 10px 14px", width:20, borderBottom:`1px solid ${t.border}` }}/>
                  <SortHeader label="Data" field="date" sort={sortC} onSort={f=>setSortC(prev=>toggleSort(prev,f))} />
                  <SortHeader label="Extrato" field="extrato" sort={sortC} onSort={f=>setSortC(prev=>toggleSort(prev,f))} align="right" />
                  <SortHeader label="Saldo Bancos" field="saldoBanco" sort={sortC} onSort={f=>setSortC(prev=>toggleSort(prev,f))} align="right" />
                  <SortHeader label="Diferença" field="dif" sort={sortC} onSort={f=>setSortC(prev=>toggleSort(prev,f))} align="right" />
                  <SortHeader label="ST" field="status" sort={sortC} onSort={f=>setSortC(prev=>toggleSort(prev,f))} align="center" />
                </tr>
              </thead>
              <tbody>
                {reconEntries.map((r, i) => {
                  const isOk = r.conciliado;
                  // SLA check per row
                  let rowColor = t.green;
                  let slaLabel = "";
                  if (!isOk) {
                    const prazo = nextBusinessDay(r.date);
                    const diasAtraso = Math.round((todayRef - prazo) / 86400000);
                    if (diasAtraso > 0) {
                      rowColor = t.red; // fora do SLA
                      slaLabel = `${diasAtraso}d`;
                    } else {
                      rowColor = t.amber; // dentro do SLA
                    }
                  }
                  return (
                    <tr key={i}
                      onClick={() => setSelectedDate(r.date)}
                      style={{
                        borderBottom:`1px solid ${t.border}22`, transition:"background 0.12s", cursor:"pointer",
                        background: r.date === selectedDate ? `${t.blue}0C` : "transparent",
                      }}
                      onMouseEnter={e => { if (r.date !== selectedDate) e.currentTarget.style.background = t.surfaceHover; }}
                      onMouseLeave={e => { if (r.date !== selectedDate) e.currentTarget.style.background = "transparent"; }}>
                      {/* Color indicator — green/amber/red */}
                      <td style={{ padding:"9px 6px 9px 14px", width:20 }}>
                        <div style={{ width:4, height:24, borderRadius:2, background:rowColor, opacity:0.7 }}/>
                      </td>
                      <td style={{ padding:"9px 14px", fontFamily:"'DM Mono',monospace", fontSize:10, color:t.muted }}>{fmtDateBR(r.date)}</td>
                      <td style={{ padding:"9px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", color:r.extrato>=0?t.green:t.red, fontWeight:500 }}>
                        {fmtBRL(r.extrato)}
                      </td>
                      <td style={{ padding:"9px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", color:t.text }}>
                        {r.saldoBanco !== 0 ? fmtBRL(r.saldoBanco) : ""}
                      </td>
                      <td style={{ padding:"9px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:500, color: r.dif === 0 ? t.green : t.red }}>
                        {r.dif === 0 ? "0,00" : fmtBRL(r.dif)}
                      </td>
                      <td style={{ padding:"9px 14px", textAlign:"center" }}>
                        {isOk
                          ? <CheckCircle2 size={15} color={t.green} strokeWidth={2}/>
                          : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                              <XCircle size={13} color={rowColor} strokeWidth={2}/>
                              {slaLabel && <span style={{ fontSize:8, fontFamily:"'DM Mono',monospace", color:t.red, fontWeight:600 }}>{slaLabel}</span>}
                            </div>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer: operational metrics — NO overlap with KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", borderTop:`1px solid ${t.border}`, flexShrink:0 }}>
        {[
          { l:"Último Conciliado", v:lastConcilDate ? fmtDateBR(lastConcilDate) : "—", c:t.green, sub:"Data mais recente ok" },
          { l:"SLA D+1 Útil", v:foraSLA > 0 ? `${foraSLA} fora` : "Em dia", c:foraSLA>0?t.red:t.green, sub:foraSLA>0 ? `Maior atraso: ${maxAtraso}d úteis` : "Todos dentro do prazo" },
          { l:"Movimentação Total", v:fmtK(filteredEntries.reduce((s,e)=>s+Math.abs(e.extrato),0)), c:t.blue, sub:"Soma |extrato| período" },
          { l:"Dias s/ Movimento", v:String(Math.round(totalDias*0.12)), c:t.muted, sub:"Sem lançamento no extrato" },
          { l:"Regra SLA", v:"D+1 útil", c:t.amber, sub:"Feriados e FDS → próx. útil" },
        ].map((f, i) => (
          <div key={i} style={{ padding:"12px 20px", borderRight:i<4?`1px solid ${t.border}`:"none" }}>
            <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:1, color:t.muted, marginBottom:4 }}>{f.l}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:14, color:f.c }}>{f.v}</div>
            <div style={{ fontSize:9, color:t.muted, marginTop:1 }}>{f.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   CHATBOT PANEL — prepared for Claude API integration
   ═══════════════════════════════════════════════════════════════════════════ */

const SUGGESTIONS = [
  "Qual o saldo atual por banco?",
  "Quais contas estão atrasadas?",
  "Resuma o DRE deste mês",
  "Quais dias faltam conciliar?",
  "Projeção de caixa para 30 dias",
  "Top 5 maiores despesas",
];

const ChatPanel = ({ open, onClose, currentPage }) => {
  const t = useT();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Olá! Sou o assistente financeiro da ALT MAX. Posso ajudar com análises do portal — saldos, DRE, conciliação, contas a pagar e fluxo de caixa.\n\nNo que posso ajudar?",
      time: "agora",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = (text) => {
    const msg = text || input.trim();
    if (!msg) return;

    setMessages(prev => [...prev, { role: "user", content: msg, time: "agora" }]);
    setInput("");
    setIsTyping(true);

    // Simulate response — will be replaced by Claude API call
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `[Integração Claude pendente]\n\nRecebi sua pergunta sobre "${msg}". Quando a API estiver conectada, vou analisar os dados reais do portal (${currentPage}) e responder com insights financeiros.`,
        time: "agora",
      }]);
    }, 1200 + Math.random() * 800);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0,
      width: open ? 380 : 0, zIndex: 40,
      display: "flex", flexDirection: "column",
      background: t.bg,
      borderLeft: open ? `1px solid ${t.border}` : "none",
      boxShadow: open ? `-8px 0 40px ${t.isDark?"rgba(0,0,0,0.5)":"rgba(0,0,0,0.12)"}` : "none",
      transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderBottom: `1px solid ${t.border}`,
        background: t.surfaceElevated, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className="orbit-icon-always"
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: `linear-gradient(135deg, ${t.blueDim}, ${t.purpleDim})`,
              border: `1px solid ${t.blue}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <Orbit size={15} color={t.blue} strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Orbit</div>
            <div style={{ fontSize: 9, color: t.green, display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.green, animation: "pulse 2s infinite" }} />
              Sistema Inteligente em Órbita
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
          background: t.surface, border: `1px solid ${t.border}`, color: t.muted,
          cursor: "pointer", transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.color = t.text; e.currentTarget.style.borderColor = t.borderHover; }}
          onMouseLeave={e => { e.currentTarget.style.color = t.muted; e.currentTarget.style.borderColor = t.border; }}>
          <X size={14} />
        </button>
      </div>

      {/* Context pill — shows which page the user is on */}
      <div style={{
        padding: "8px 16px", borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: t.muted }}>Contexto:</span>
        <span style={{
          fontSize: 9, padding: "3px 10px", borderRadius: 6,
          background: t.blueDim, color: t.blue, fontWeight: 600,
          fontFamily: "'DM Mono', monospace",
        }}>
          {currentPage === "caixa" ? "Caixa Realizado" :
           currentPage === "extrato" ? "Extrato" :
           currentPage === "cpCr" ? "A Pagar / Receber" :
           currentPage === "fluxo" ? "Fluxo de Caixa" :
           currentPage === "concil" ? "Conciliação" : currentPage}
        </span>
        <span style={{ fontSize: 8, color: t.mutedDim }}>Os dados desta tela serão usados como contexto</span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", gap: 10,
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
            animation: "fadeUp 0.3s ease both",
          }}>
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: msg.role === "user" ? t.blueDim : t.surface,
              border: `1px solid ${msg.role === "user" ? `${t.blue}33` : t.border}`,
            }}>
              {msg.role === "user"
                ? <User size={13} color={t.blue} strokeWidth={1.5} />
                : <Bot size={13} color={t.purple} strokeWidth={1.5} />}
            </div>
            {/* Bubble */}
            <div style={{
              maxWidth: "80%", padding: "10px 14px", borderRadius: 12,
              background: msg.role === "user" ? `${t.blue}15` : t.surface,
              border: `1px solid ${msg.role === "user" ? `${t.blue}22` : t.border}`,
            }}>
              <div style={{
                fontSize: 11, lineHeight: 1.6, color: t.text, whiteSpace: "pre-wrap",
              }}>{msg.content}</div>
              <div style={{
                fontSize: 8, color: t.mutedDim, marginTop: 6,
                textAlign: msg.role === "user" ? "right" : "left",
              }}>{msg.time}</div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: "flex", gap: 10, animation: "fadeUp 0.3s ease both" }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: t.surface, border: `1px solid ${t.border}`,
            }}>
              <Bot size={13} color={t.purple} strokeWidth={1.5} />
            </div>
            <div style={{
              padding: "12px 16px", borderRadius: 12,
              background: t.surface, border: `1px solid ${t.border}`,
              display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{
                  width: 6, height: 6, borderRadius: "50%", background: t.muted,
                  animation: `pulse 1.4s ease ${j * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions — only show if few messages */}
      {messages.length <= 2 && (
        <div style={{
          padding: "0 16px 10px", display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0,
        }}>
          {SUGGESTIONS.slice(0, 4).map((s, i) => (
            <button key={i} onClick={() => handleSend(s)} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 9,
              background: t.surface, border: `1px solid ${t.border}`,
              color: t.muted, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s", lineHeight: 1.3,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${t.blue}55`; e.currentTarget.style.color = t.blue; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.muted; }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: "12px 16px", borderTop: `1px solid ${t.border}`,
        background: t.surfaceElevated, flexShrink: 0,
      }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 8,
          background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: 12, padding: "4px 4px 4px 14px",
          transition: "border-color 0.2s",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre os dados financeiros..."
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none", color: t.text,
              fontSize: 11, fontFamily: "inherit", outline: "none", resize: "none",
              lineHeight: 1.5, padding: "8px 0", maxHeight: 80,
            }}
          />
          <button onClick={() => handleSend()} disabled={!input.trim()} style={{
            width: 34, height: 34, borderRadius: 9,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: input.trim() ? t.blue : t.surface,
            border: "none", cursor: input.trim() ? "pointer" : "default",
            transition: "all 0.2s", flexShrink: 0,
          }}>
            <Send size={14} color={input.trim() ? t.bg : t.muted} strokeWidth={2} />
          </button>
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 8, fontSize: 8, color: t.mutedDim,
        }}>
          <span>Enter para enviar · Shift+Enter para nova linha</span>
          <span style={{ fontFamily: "'DM Mono', monospace" }}>Claude Sonnet 4 · Anthropic</span>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   EMPRESAS — Config + Context + Admin Page
   ═══════════════════════════════════════════════════════════════════════════ */
const EMPRESAS_DEFAULT = [
  { id: "altmax", nome: "Alt Max Transportes", cnpj: "00.000.000/0001-00", logoDark: null, logoLight: null, cor: "#38BDF8" },
  { id: "altsp", nome: "ALT Logística SP", cnpj: "00.000.000/0002-00", logoDark: null, logoLight: null, cor: "#34D399" },
  { id: "altne", nome: "ALT Nordeste", cnpj: "00.000.000/0003-00", logoDark: null, logoLight: null, cor: "#FBBF24" },
];

const EmpresasCtx = createContext({ empresas: EMPRESAS_DEFAULT, setEmpresas: () => {}, activeEmp: "altmax", setActiveEmp: () => {} });
const useEmpresas = () => useContext(EmpresasCtx);

// Helper: get the best logo for the current theme
const getLogo = (emp, isDark) => {
  if (isDark) return emp.logoDark || emp.logoLight;
  return emp.logoLight || emp.logoDark;
};

const PageAdmin = () => {
  const t = useT();
  const { empresas, setEmpresas } = useEmpresas();
  const [editIdx, setEditIdx] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editCor, setEditCor] = useState("#38BDF8");
  const fileRefs = useRef({});

  const startEdit = (idx) => {
    setEditIdx(idx);
    setEditNome(empresas[idx].nome);
    setEditCnpj(empresas[idx].cnpj);
    setEditCor(empresas[idx].cor);
  };
  const cancelEdit = () => setEditIdx(null);
  const saveEdit = () => {
    setEmpresas(prev => prev.map((e, i) => i === editIdx ? { ...e, nome: editNome, cnpj: editCnpj, cor: editCor } : e));
    setEditIdx(null);
  };
  const handleLogo = (idx, file, variant) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEmpresas(prev => prev.map((e, i) => i === idx ? { ...e, [variant]: ev.target.result } : e));
    };
    reader.readAsDataURL(file);
  };
  const removeLogo = (idx, variant) => {
    setEmpresas(prev => prev.map((e, i) => i === idx ? { ...e, [variant]: null } : e));
  };
  const addEmpresa = () => {
    const id = `emp_${Date.now()}`;
    setEmpresas(prev => [...prev, { id, nome: "Nova Empresa", cnpj: "00.000.000/0000-00", logoDark: null, logoLight: null, cor: "#94A3B8" }]);
  };
  const removeEmpresa = (idx) => {
    if (empresas.length <= 1) return;
    setEmpresas(prev => prev.filter((_, i) => i !== idx));
  };

  const LogoUploadBox = ({ emp, idx, variant, label, bgPreview }) => {
    const refKey = `${idx}_${variant}`;
    const src = emp[variant];
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 10, overflow: "hidden",
          border: `2px dashed ${src ? emp.cor : t.border}`,
          background: bgPreview,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "all 0.2s", position: "relative",
        }}
          onClick={() => fileRefs.current[refKey]?.click()}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.blue; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = src ? emp.cor : t.border; }}>
          {src ? (
            <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 5 }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <Upload size={14} color={t.muted} strokeWidth={1.5} />
              <span style={{ fontSize: 6, color: t.mutedDim, textTransform: "uppercase", letterSpacing: 0.5 }}>Upload</span>
            </div>
          )}
          <input
            ref={el => { fileRefs.current[refKey] = el; }}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            style={{ display: "none" }}
            onChange={e => { handleLogo(idx, e.target.files?.[0], variant); e.target.value = ""; }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 8, color: t.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
          {src && (
            <button onClick={(e) => { e.stopPropagation(); removeLogo(idx, variant); }} style={{
              background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex",
            }}>
              <X size={9} color={t.red} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      {/* Header */}
      <div style={{ padding: "20px 28px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <Settings size={18} color={t.blue} strokeWidth={1.5} />
          <span style={{ fontSize: 16, fontWeight: 600, color: t.text }}>Configurações</span>
        </div>
        <span style={{ fontSize: 11, color: t.muted }}>Gerencie as empresas, logos e identidade visual do portal.</span>
      </div>

      {/* Companies list */}
      <div style={{ padding: "20px 28px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Empresas Cadastradas</span>
            <span style={{ fontSize: 10, color: t.muted, marginLeft: 10 }}>{empresas.length} {empresas.length === 1 ? "empresa" : "empresas"}</span>
          </div>
          <button onClick={addEmpresa} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8,
            background: t.blueDim, border: `1px solid ${t.blue}44`, color: t.blue,
            fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = `${t.blue}33`; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.blueDim; }}>
            <Plus size={13} strokeWidth={2} /> Adicionar Empresa
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {empresas.map((emp, idx) => (
            <div key={emp.id} style={{
              display: "flex", alignItems: "center", gap: 18, padding: 18,
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
              position: "relative", overflow: "hidden", transition: "border-color 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; }}>
              {/* Color accent line */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${emp.cor}, transparent)`, opacity: 0.5 }} />

              {/* Logo area — dual */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <LogoUploadBox emp={emp} idx={idx} variant="logoDark" label="Dark" bgPreview="#0A0F1E" />
                <LogoUploadBox emp={emp} idx={idx} variant="logoLight" label="Light" bgPreview="#F0F2F5" />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {editIdx === idx ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome da empresa"
                        style={{ flex: 1, background: t.surface, border: `1px solid ${t.border}`, color: t.text, fontSize: 12, padding: "8px 12px", borderRadius: 8, fontFamily: "inherit", outline: "none" }} />
                      <input value={editCor} onChange={e => setEditCor(e.target.value)} type="color"
                        style={{ width: 38, height: 38, borderRadius: 8, border: `1px solid ${t.border}`, cursor: "pointer", background: t.surface, padding: 2 }} />
                    </div>
                    <input value={editCnpj} onChange={e => setEditCnpj(e.target.value)} placeholder="CNPJ"
                      style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text, fontSize: 10, padding: "7px 12px", borderRadius: 8, fontFamily: "'DM Mono',monospace", outline: "none", maxWidth: 220 }} />
                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                      <button onClick={saveEdit} style={{ padding: "5px 14px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: t.blueDim, border: `1px solid ${t.blue}44`, color: t.blue, cursor: "pointer", fontFamily: "inherit" }}>Salvar</button>
                      <button onClick={cancelEdit} style={{ padding: "5px 14px", borderRadius: 6, fontSize: 10, background: "transparent", border: `1px solid ${t.border}`, color: t.muted, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: emp.cor, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{emp.nome}</span>
                    </div>
                    <span style={{ fontSize: 10, color: t.muted, fontFamily: "'DM Mono',monospace" }}>{emp.cnpj}</span>
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      <span style={{ fontSize: 8, color: t.mutedDim, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Dark: {emp.logoDark ? "✓" : "—"}
                      </span>
                      <span style={{ fontSize: 8, color: t.mutedDim, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Light: {emp.logoLight ? "✓" : "—"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              {editIdx !== idx && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => startEdit(idx)} style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7,
                    fontSize: 9, background: t.surface, border: `1px solid ${t.border}`, color: t.muted,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.color = t.blue; e.currentTarget.style.borderColor = `${t.blue}55`; }}
                    onMouseLeave={e => { e.currentTarget.style.color = t.muted; e.currentTarget.style.borderColor = t.border; }}>
                    <Pencil size={11} /> Editar
                  </button>
                  {empresas.length > 1 && (
                    <button onClick={() => removeEmpresa(idx)} style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7,
                      fontSize: 9, background: t.surface, border: `1px solid ${t.border}`, color: t.muted,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.color = t.red; e.currentTarget.style.borderColor = `${t.red}55`; }}
                      onMouseLeave={e => { e.currentTarget.style.color = t.muted; e.currentTarget.style.borderColor = t.border; }}>
                      <Trash2 size={11} /> Excluir
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info box */}
        <div style={{ marginTop: 24, padding: 16, background: t.blueDim, border: `1px solid ${t.blue}22`, borderRadius: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: t.blue, marginBottom: 6 }}>Como funciona</div>
          <div style={{ fontSize: 10, color: t.muted, lineHeight: 1.6 }}>
            Faça upload de duas variações do logo: uma para o tema escuro (fundo navy) e outra para o tema claro (fundo branco). Se enviar apenas uma, ela será usada em ambos os temas. O logo ativo aparecerá no canto superior esquerdo da barra de navegação. Formatos aceitos: PNG, JPG, SVG, WebP. Recomendado: fundo transparente, mínimo 200×60px horizontal.
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN APP — NAVIGATION SHELL
   ═══════════════════════════════════════════════════════════════════════════ */
const NAV = [
  { id: "caixa", label: "Caixa Realizado", icon: LayoutDashboard },
  { id: "extrato", label: "Extrato", icon: FileText },
  { id: "cpCr", label: "A Pagar / Receber", icon: CreditCard },
  { id: "fluxo", label: "Fluxo de Caixa", icon: TrendingUp },
  { id: "concil", label: "Conciliação", icon: CheckSquare },
];

export default function AltMaxPortal() {
  const [page, setPage] = useState("caixa");
  const [empOpen, setEmpOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("2025-10-01");
  const [dateTo, setDateTo] = useState("2026-03-31");
  const [theme, setTheme] = useState("dark");
  const [empresas, setEmpresas] = useState(EMPRESAS_DEFAULT);
  const [activeEmp, setActiveEmp] = useState("altmax");
  const t = theme === "dark" ? DARK : LIGHT;
  const activeEmpresa = empresas.find(e => e.id === activeEmp) || empresas[0];
  const empRef = useRef(null);
  const dateRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (empRef.current && !empRef.current.contains(e.target)) setEmpOpen(false);
      if (dateRef.current && !dateRef.current.contains(e.target)) setDateOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fmtDateNav = (iso) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const applyPreset = (from, to) => { setDateFrom(from); setDateTo(to); setDateOpen(false); };

  return (
    <ThemeCtx.Provider value={t}>
    <EmpresasCtx.Provider value={{ empresas, setEmpresas, activeEmp, setActiveEmp }}>
    <div style={{ width:"100%",height:"100vh",display:"flex",flexDirection:"column",background:t.bg,color:t.text,fontFamily:"'Plus Jakarta Sans',-apple-system,sans-serif",backgroundImage:`linear-gradient(${t.gridLine} 1px,transparent 1px),linear-gradient(90deg,${t.gridLine} 1px,transparent 1px)`,backgroundSize:"48px 48px",transition:"background 0.35s, color 0.35s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:7px;height:7px}::-webkit-scrollbar-track{background:${t.scrollTrack};border-radius:4px}::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:4px}::-webkit-scrollbar-thumb:hover{background:${t.scrollHover}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes orbitSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .orbit-icon{transition:all 0.4s ease}
        .orbit-icon:hover,.orbit-btn:hover .orbit-icon{animation:orbitSpin 5s linear infinite}
        .orbit-icon-always{animation:orbitSpin 5s linear infinite}
        textarea::-webkit-scrollbar{width:4px}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:${t.isDark?"invert(1)":"none"}}
      `}</style>

      {/* NAV */}
      <nav style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",height:52,borderBottom:`1px solid ${t.border}`,background:t.surfaceElevated,position:"sticky",top:0,zIndex:30,flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,minWidth:0 }}>
          {getLogo(activeEmpresa, t.isDark) ? (
            <img src={getLogo(activeEmpresa, t.isDark)} alt={activeEmpresa.nome} style={{ height:30,maxWidth:120,objectFit:"contain",flexShrink:0 }}/>
          ) : (
            <div style={{ width:30,height:30,borderRadius:8,background:`${activeEmpresa.cor}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <Building2 size={15} color={activeEmpresa.cor} strokeWidth={1.5}/>
            </div>
          )}
          <span style={{ fontSize:14,fontWeight:700,color:t.text,letterSpacing:0.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{activeEmpresa.nome}</span>
        </div>
        <div style={{ display:"flex",gap:2,background:`${t.text}06`,borderRadius:8,padding:3 }}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={()=>setPage(id)} style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:6,fontSize:10,color:page===id?t.blue:t.muted,background:page===id?t.blueDim:"transparent",fontWeight:page===id?600:400,border:"none",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s" }}>
              <Icon size={12} strokeWidth={page===id?2:1.5}/> {label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div ref={dateRef} style={{ position:"relative" }}>
            <button onClick={()=>setDateOpen(!dateOpen)} style={{ display:"flex",alignItems:"center",gap:6,background:dateOpen?t.blueDim:t.surface,border:`1px solid ${dateOpen?`${t.blue}55`:t.border}`,borderRadius:7,padding:"5px 11px",fontSize:10,fontFamily:"'DM Mono',monospace",color:t.muted,cursor:"pointer",transition:"all 0.2s" }}>
              <Calendar size={10} color={dateOpen?t.blue:t.muted}/> <b style={{ color:dateOpen?t.blue:t.text,fontWeight:500 }}>{fmtDateNav(dateFrom)}</b> → <b style={{ color:dateOpen?t.blue:t.text,fontWeight:500 }}>{fmtDateNav(dateTo)}</b>
              <ChevronDown size={9} style={{ color:dateOpen?t.blue:t.muted,transform:dateOpen?"rotate(180deg)":"none",transition:"transform 0.2s",marginLeft:2 }}/>
            </button>
            {dateOpen && (
              <div style={{ position:"absolute",right:0,top:"calc(100% + 6px)",background:t.surfaceElevated,border:`1px solid ${t.borderHover}`,borderRadius:12,overflow:"hidden",zIndex:55,minWidth:300,boxShadow:t.tooltipShadow,padding:"14px 16px" }}>
                <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:t.muted,fontWeight:500,marginBottom:10 }}>Período de Consulta</div>
                {/* Presets */}
                <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:14 }}>
                  {[
                    { l:"Último Mês", f:"2026-03-01", t:"2026-03-31" },
                    { l:"Último Trimestre", f:"2026-01-01", t:"2026-03-31" },
                    { l:"Último Semestre", f:"2025-10-01", t:"2026-03-31" },
                    { l:"Ano 2025", f:"2025-01-01", t:"2025-12-31" },
                    { l:"Ano 2026", f:"2026-01-01", t:"2026-12-31" },
                  ].map((p,i) => {
                    const active = dateFrom === p.f && dateTo === p.t;
                    return (
                      <button key={i} onClick={()=>applyPreset(p.f,p.t)} style={{
                        padding:"5px 10px",borderRadius:6,fontSize:9,
                        border:`1px solid ${active?`${t.blue}55`:t.border}`,
                        background:active?t.blueDim:"transparent",
                        color:active?t.blue:t.muted,cursor:"pointer",fontFamily:"inherit",
                        fontWeight:active?600:400,transition:"all 0.15s",
                      }}>{p.l}</button>
                    );
                  })}
                </div>
                {/* Custom date inputs */}
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.mutedDim,marginBottom:4 }}>De</div>
                    <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{
                      width:"100%",background:t.surface,border:`1px solid ${t.border}`,color:t.text,
                      fontSize:10,padding:"7px 10px",borderRadius:6,fontFamily:"'DM Mono',monospace",
                      outline:"none",colorScheme:t.isDark?"dark":"light",
                    }}/>
                  </div>
                  <span style={{ color:t.mutedDim,marginTop:14,fontSize:10 }}>→</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:8,textTransform:"uppercase",letterSpacing:1,color:t.mutedDim,marginBottom:4 }}>Até</div>
                    <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{
                      width:"100%",background:t.surface,border:`1px solid ${t.border}`,color:t.text,
                      fontSize:10,padding:"7px 10px",borderRadius:6,fontFamily:"'DM Mono',monospace",
                      outline:"none",colorScheme:t.isDark?"dark":"light",
                    }}/>
                  </div>
                </div>
                {/* Apply button */}
                <button onClick={()=>setDateOpen(false)} style={{
                  width:"100%",marginTop:12,padding:"8px 0",borderRadius:7,fontSize:10,fontWeight:600,
                  background:t.blueDim,border:`1px solid ${t.blue}44`,color:t.blue,
                  cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${t.blue}33`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=t.blueDim;}}>
                  Aplicar Período
                </button>
                <div style={{ fontSize:8,color:t.mutedDim,textAlign:"center",marginTop:6,fontFamily:"'DM Mono',monospace" }}>
                  {Math.round((new Date(dateTo) - new Date(dateFrom)) / 86400000)} dias selecionados
                </div>
              </div>
            )}
          </div>
          {/* Theme toggle */}
          <button onClick={()=>setTheme(prev=>prev==="dark"?"light":"dark")} style={{
            display:"flex",alignItems:"center",justifyContent:"center",
            width:32,height:32,borderRadius:8,
            background:t.surface,border:`1px solid ${t.border}`,
            cursor:"pointer",transition:"all 0.25s",position:"relative",overflow:"hidden",
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=`${t.blue}55`;e.currentTarget.style.background=t.blueDim;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.background=t.surface;}}>
            {theme==="dark"
              ? <Sun size={13} color={t.amber} strokeWidth={2} style={{ transition:"transform 0.3s",transform:"rotate(0deg)" }}/>
              : <Moon size={13} color={t.purple} strokeWidth={2} style={{ transition:"transform 0.3s",transform:"rotate(-30deg)" }}/>
            }
          </button>
          <div ref={empRef} style={{ position:"relative" }}>
            <button onClick={()=>setEmpOpen(!empOpen)} style={{ display:"flex",alignItems:"center",gap:6,background:t.surface,border:`1px solid ${t.border}`,color:t.text,fontSize:10,padding:"4px 12px 4px 5px",borderRadius:7,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s" }}>
              {getLogo(activeEmpresa, t.isDark) ? (
                <img src={getLogo(activeEmpresa, t.isDark)} alt="" style={{ width:22,height:22,borderRadius:5,objectFit:"contain" }}/>
              ) : (
                <div style={{ width:22,height:22,borderRadius:5,background:`${activeEmpresa.cor}22`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <Building2 size={11} color={activeEmpresa.cor} strokeWidth={1.5}/>
                </div>
              )}
              {activeEmpresa.nome} <ChevronDown size={10} style={{ transform:empOpen?"rotate(180deg)":"none",transition:"transform 0.2s" }}/>
            </button>
            {empOpen && (
              <div style={{ position:"absolute",right:0,top:"calc(100% + 4px)",background:t.surfaceElevated,border:`1px solid ${t.borderHover}`,borderRadius:10,overflow:"hidden",zIndex:50,minWidth:220,boxShadow:t.tooltipShadow }}>
                {empresas.map((emp,i)=>(
                  <button key={emp.id} onClick={()=>{setActiveEmp(emp.id);setEmpOpen(false);}} style={{
                    width:"100%",textAlign:"left",padding:"8px 14px",fontSize:10,
                    color:emp.id===activeEmp?t.blue:t.textSec,
                    background:emp.id===activeEmp?t.blueDim:"transparent",
                    border:"none",cursor:"pointer",fontFamily:"inherit",
                    borderBottom:i<empresas.length-1?`1px solid ${t.border}`:"none",
                    display:"flex",alignItems:"center",gap:8,transition:"background 0.12s",
                  }}
                    onMouseEnter={e=>{if(emp.id!==activeEmp)e.currentTarget.style.background=t.surfaceHover;}}
                    onMouseLeave={e=>{if(emp.id!==activeEmp)e.currentTarget.style.background="transparent";}}>
                    {getLogo(emp, t.isDark) ? (
                      <img src={getLogo(emp, t.isDark)} alt="" style={{ width:20,height:20,borderRadius:4,objectFit:"contain" }}/>
                    ) : (
                      <div style={{ width:20,height:20,borderRadius:4,background:`${emp.cor}22`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <Building2 size={10} color={emp.cor} strokeWidth={1.5}/>
                      </div>
                    )}
                    <span style={{ flex:1 }}>{emp.nome}</span>
                    {emp.id===activeEmp && <CheckCircle2 size={12} color={t.blue} strokeWidth={2}/>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Settings gear */}
          <button onClick={()=>setPage("admin")} style={{
            display:"flex",alignItems:"center",justifyContent:"center",
            width:32,height:32,borderRadius:8,
            background:page==="admin"?t.blueDim:t.surface,
            border:`1px solid ${page==="admin"?`${t.blue}55`:t.border}`,
            cursor:"pointer",transition:"all 0.25s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=`${t.blue}55`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=page==="admin"?`${t.blue}55`:t.border;}}>
            <Settings size={13} color={page==="admin"?t.blue:t.muted} strokeWidth={1.5} style={{ transition:"transform 0.4s",transform:page==="admin"?"rotate(90deg)":"rotate(0deg)" }}/>
          </button>
        </div>
      </nav>

      {/* PAGE — adjusts margin when chat is open */}
      <main style={{ flex:1, overflow:"auto", marginRight: chatOpen ? 380 : 0, transition:"margin-right 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
        {page === "caixa" && <PageCaixa />}
        {page === "extrato" && <PageExtrato />}
        {page === "cpCr" && <PageCPCR />}
        {page === "fluxo" && <PageFluxo />}
        {page === "concil" && <PageConciliacao />}
        {page === "admin" && <PageAdmin />}
      </main>

      {/* CHAT PANEL — slides from right */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} currentPage={page} />

      {/* FLOATING CHAT BUTTON */}
      {!chatOpen && (
        <button className="orbit-btn" onClick={() => setChatOpen(true)}
          style={{
            position: "fixed", bottom: 20, right: 20, zIndex: 35,
            width: 52, height: 52, borderRadius: 16,
            background: `linear-gradient(135deg, ${t.blue}, ${t.purple})`,
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 20px ${t.blue}44, 0 0 40px ${t.blue}15`,
            transition: "all 0.3s ease",
            animation: "fadeUp 0.5s ease both",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = `0 6px 28px ${t.blue}66, 0 0 50px ${t.blue}22`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 4px 20px ${t.blue}44, 0 0 40px ${t.blue}15`; }}>
          <span className="orbit-icon" style={{ display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Orbit size={22} color="#fff" strokeWidth={1.8} />
          </span>
        </button>
      )}
    </div>
    </EmpresasCtx.Provider>
    </ThemeCtx.Provider>
  );
}
