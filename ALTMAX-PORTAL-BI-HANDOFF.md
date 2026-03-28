# ALT MAX Portal BI — Handoff para Claude Code

## Documento de Referência Técnica
**Autor:** Protótipo construído em Claude.ai  
**Arquivo de referência:** `altmax-portal-v2.jsx` (3.223 linhas, React JSX)  
**Repositório destino:** `altmax-web` (Next.js 14 + TypeScript + Tailwind + Zustand)  
**Backend:** FastAPI no Railway  
**Frontend:** Vercel  
**Banco:** Azure SQL  
**ERP:** Omie (API REST)

---

## 1. VISÃO GERAL DO PROTÓTIPO

### 1.1 Arquitetura do Protótipo

```
AltMaxPortal (root)
├── ThemeCtx.Provider (DARK/LIGHT)
│   └── EmpresasCtx.Provider (empresas, activeEmp)
│       ├── <nav> — Logo dinâmico + tabs + date picker + tema + empresa + settings
│       ├── <main> — Page router (overflow:auto)
│       │   ├── PageCaixa (dashboard | detailView | analise)
│       │   ├── PageExtrato
│       │   ├── PageCPCR
│       │   ├── PageFluxo
│       │   ├── PageConciliacao
│       │   └── PageAdmin
│       ├── ChatPanel (Orbit — slide-in 380px)
│       └── Floating Button (Orbit icon + animation)
```

### 1.2 Design System

**Fontes:**
- DM Mono — números, valores financeiros, códigos, eixos de gráficos
- Plus Jakarta Sans — texto, labels, títulos, interface geral

**Temas (DARK / LIGHT):**
```
DARK:
  bg: "#05091A"
  surface: "rgba(255,255,255,0.034)"
  surfaceHover: "rgba(255,255,255,0.055)"
  surfaceElevated: "rgba(8,14,38,0.95)"
  border: "rgba(255,255,255,0.07)"
  text: "#F1F5F9", textSec: "#94A3B8", muted: "#64748B"
  
LIGHT:
  bg: "#F4F6F8"
  surface: "rgba(0,0,0,0.028)"
  surfaceElevated: "rgba(255,255,255,0.97)"
  border: "rgba(0,0,0,0.09)"
  text: "#0F172A", textSec: "#475569", muted: "#64748B"
```

**Cores semânticas (mesmas em ambos os temas, mas com dim calibrado):**
- Blue `#38BDF8` / `#0284C7` — receita, principal, saldo
- Green `#34D399` / `#059669` — positivo, conciliado, receita NOP
- Red `#F87171` / `#DC2626` — negativo, atrasado, custos variáveis
- Amber `#FBBF24` / `#D97706` — alerta, TDCF, pendente
- Purple `#C084FC` / `#9333EA` — Orbit IA, despesa NOP, saldo NOP
- Orange `#FB923C` / `#EA580C` — custo fixo

**Grid sutil:** Linhas 48×48px com opacidade mínima (`gridLine` token)

**Scrollbar customizada:** `scrollTrack`, `scrollThumb`, `scrollHover` por tema

### 1.3 Componentes Compartilhados

| Componente | Descrição |
|---|---|
| `GlowLine` | Linha gradiente no topo de cards |
| `CustomTooltip` | Tooltip recharts com fundo elevado e formatação K/M |
| `Badge` | Status pill (A Vencer, Atrasado, Pago, A Receber) |
| `ConcilBadge` | Badge de conciliação (✓ Conciliado / ⏳ Pendente) |
| `SortHeader` | Header de tabela clicável com sort ▲▼ |
| `BarLabel` | Label SVG customizado para barras (sem bold) |
| `BarLabelVar` | Label SVG com indicador de variação MoM (▲/▼ X,X%) |
| `DetailBtn` | Botão "Detalhar →" com hover colorido |

### 1.4 Formatadores

```typescript
fmtBRL(v) → "12.500,00" (pt-BR, 2 decimais, valor absoluto)
fmtK(v) → "12,5K" | "1,2M" | "−65,2K" (abreviação inteligente)
fmtPct(v) → "12,0%" | "−31,0%"
```

---

## 2. PÁGINAS — SPEC DETALHADA

### 2.1 Caixa Realizado

**Rota:** `/caixa`  
**Views:** Dashboard | Análise IA (toggle bar)  
**Sub-view:** Detail (drill-down por indicador)

#### 2.1.1 Dashboard

**KPI Strip (5 colunas):**
- Saldo Inicial, Entradas, Saídas, Saldo Final, Balanço
- Hover: glow line animada na borda inferior
- Valores fixos no protótipo → Em produção: calcular de `fExtratoLancamentos` Omie

**Drill-Down (3 níveis):**
- Trimestral → Mensal → Semanal
- Breadcrumb clicável com label de nível (pill colorida)
- Botões ▲ Drill Up / ▼ Drill Down
- Click em barra no nível Mensal → expande para Semanal do mês
- Mock data: `CAIXA_DATA.quarterly`, `.monthly`, `WEEKLY["Dez/25"]` etc.

**Layout principal:**
- Grid `1fr 252px` (charts + DRE sidebar)
- Top row: Receita Bruta (2fr) + Conciliação (1fr)
- Grid 3 colunas: TDCF, Custo Variável, Custo Fixo
- Grid `2fr 1fr`: Saldo NOP (span 2) + Resultado Final (span 1)

**Cards de indicador (cada um tem):**
- Título colorido + valor + % RoB
- MiniChart com barras (barSize conforme nível)
- Botão "Detalhar →" que abre a view de detalhamento

**Saldo NOP (card especial):**
- Subtítulo com R: (verde) e D: (vermelho)
- Barras verdes (saldo positivo) e vermelhas (saldo negativo) com Cell dinâmico
- Valor total com sinal + cor condicional

**Resultado Final:**
- Gradiente verde/azul no background
- Cascata: EBT1 → +RNOP → −DNOP → =EBT2

**DRE Sidebar:**
- Lista vertical de 10 linhas DRE com mini barras %
- Hover: padding-left animado + destaque

#### 2.1.2 Detail View (por indicador)

**Indicadores com detalhe:** receita, tdcf, cv, cf, saldoNop

**Cada detail view contém:**
1. Breadcrumb: Dashboard › [Indicador] (clicável)
2. KPIs (4 colunas): Total, Média/%, Melhor, Pior
3. Gráfico expandido (height:340, barSize:48):
   - BarLabelVar com variação MoM (▲/▼ X,X%) acima do rótulo
   - Saldo NOP: ComposedChart com barras RNOP×DNOP + linha saldo
4. Ranking por Cliente/Fornecedor:
   - Barras horizontais ordenadas desc
   - Numeração, nome, valor, % do total
   - Pareto: barra empilhada 28px com % dentro + nomes abaixo
   - Top 3 e Top 5 percentuais no header
5. Composição: barras de progresso com item, valor, %
   - Saldo NOP: duas tabelas lado a lado (RNOP + DNOP)

**Mock data de clientes por indicador:**
- Receita: Cargill, Beauvallet, BRF, Marfrig, JHS, Minerva, Fribal
- CV: Ipiranga, Shell, Autopista, Bridgestone, Porto Seguro
- CF: Folha Motoristas, Administrativo, INSS, FGTS, Aluguel
- TDCF: COFINS, ICMS, PIS, ISS
- Saldo NOP: Itaú, BB, Venda ativo, Recuperação

#### 2.1.3 Análise IA (Claude Agent)

**Layout:** Grid `1fr 400px` (charts + chat agent)

**Painel esquerdo (scrollable, minHeight:900):**
- Mini cards: EBT2 + TDCF
- DRE Cascata Waterfall:
  - 10 barras com valor + % acima (cor da categoria)
  - Barras com fill semitransparente + borda + hover
  - Labels abaixo com % para barras baixas
- Tabela de Indicadores (10 linhas DRE completas):
  - Indicador, Valor, % RoB, Status (badge colorido)

**Painel direito (Claude Agent):**
- Avatar ✦ com gradient + "Online" pulsante
- Chat com bolhas user/assistant
- formatIaMsg: bold em azul, quebras, bullets
- Context pill: "⬡ Contexto carregado: DRE · Caixa · CP/CR · 6 meses"
- 4 sugestões rápidas clicáveis
- Chamada real à API Claude: `claude-sonnet-4-20250514`
- System prompt: `FINANCIAL_CONTEXT` com DRE_ROWS completo
- Input: Enter envia, Shift+Enter nova linha

### 2.2 Extrato

**Rota:** `/extrato`  
**Layout:** Grid `1fr 240px` (tabela + sidebar saldos)

**KPIs (5):** Saldo Total, Entradas, Saídas, Resultado, Lançamentos

**Filtros:** Busca (descrição + categoria) + toggle Todos/Conciliados/Pendentes + contador

**Tabela (sortable):**
- Colunas: Data, Banco, Valor (±), Descrição, Categoria (extenso via CAT_DESC), Status (ConcilBadge)
- Sort: SortHeader em todas as colunas
- Hover: verde para entradas, vermelho para saídas
- Tooltip na categoria mostrando código + descrição

**Sidebar:**
- Saldo por conta (4 bancos): nome, valor, barra proporcional

**Mock data:** 20 lançamentos com descrições realistas (PIX, PAGTO, TED, etc.)

**Mapeamento de categorias:** `CAT_DESC` com ~20 códigos do planoContas.ts mapeados para descrição por extenso. Na produção: expandir para todos os ~80 códigos.

### 2.3 Contas a Pagar / Receber

**Rota:** `/cp-cr`  
**Tabs:** CP | CR (com badge de contagem)  
**Views:** Lançamentos | Temporal | Representatividade

**KPIs (5):** Total A Pagar/Receber, A Vencer, Atrasado, Prazo Médio, Saldo Líquido

#### Lançamentos:
- Busca + summary row (Pago/Aberto/Atrasado com ícones)
- Tabela sortable: Favorecido, Categoria, Banco, Vencimento, Valor, Status

#### Temporal:
- ComposedChart CP×CR mensal com linha de saldo
- Aging (4 buckets: 0-15d, 16-30d, 31-60d, 60+d) com barras
- Distribuição por Status (3 itens com barra %)

#### Representatividade:
- Rankings por Favorecido e Categoria com barras %
- Barra de concentração Pareto

**Sidebar (fixo em todas as views):**
- Card posição, Prazo Médio visual, Top Favorecidos, Aging mini, Próximos Vencimentos

**Mock data:** 14 CP + 8 CR com campos fav/valor/vcto/status/cat/banco

### 2.4 Fluxo de Caixa

**Rota:** `/fluxo`  
**Horizon bar:** Presets +7d/30d/60d/90d

**KPIs (5):** Saldo Atual, Entradas Prev., Saídas Prev., Saldo Projetado, Cobertura (Nx)

**Charts (grid 1fr 260px):**
- Entradas × Saídas Mensais (ComposedChart, barSize:28)
- Saldo Projetado Diário (AreaChart com gradiente, ReferenceLine y=0)
  - Dados determinísticos via seed function (não Math.random)
  - useMemo dependente de [hz, saldoAtual]

**Sidebar:**
- Card gradiente: Saldo Projetado Final
- Maiores Entradas (top 4 de mockCRFull)
- Maiores Saídas (top 4 de mockCPFull)

### 2.5 Conciliação

**Rota:** `/conciliacao`  
**Regra:** `DIF = vConcExtrato - vConcSaldoLimite + AjusteManual` → DIF=0 é conciliado

**KPIs (5 únicos):** % Conciliação, Σ Diferenças Abertas, Maior Diferença, Dias sem Conciliar (streak), Média Diária Extrato

**Filtro:** Banco (Todos/Itaú/BB/Bradesco/Santander) + legenda 3 estados + pill fórmula

**Calendários Heatmap (6 meses: Out/25 → Mar/26):**
- 3 cores: verde (DIF=0), âmbar (pendente dentro SLA), vermelho (fora SLA)
- Click num dia → popula tabela "Lançamentos do Dia"
- Respeita filtro de banco via `bankFilter` prop

**SLA D+1 Útil:**
- Feriados BR cadastrados: N.S. Aparecida, Finados, Proclamação, Consciência Negra, Natal, Confraternização, Carnaval (16-18/Fev)
- `isBusinessDay(d)`: pula weekends + feriados
- `nextBusinessDay(dateStr)`: D+1 e avança até dia útil
- `slaAnalysis`: diasAtraso, dentroSLA para cada pendência

**Tabelas (grid 1fr 1fr, minHeight:420):**
- Esquerda: Lançamentos do Dia (10 itens determinísticos por dia selecionado)
- Direita: Conciliação Diária (sortable, 50 registros):
  - Barra lateral colorida (verde/âmbar/vermelho)
  - Colunas: Data, Extrato, Saldo Bancos, DIF, ST
  - ST: CheckCircle2 (ok) ou XCircle + "Xd" (atraso)

**Footer (5 métricas operacionais):**
- Último Conciliado, SLA D+1 Útil (fora/em dia), Movimentação Total, Dias s/ Movimento, Regra SLA

### 2.6 Configurações (Admin)

**Rota:** `/admin` (via ícone ⚙️ na navbar)

**Funcionalidades:**
- Lista de empresas cadastradas
- Upload dual de logo: variação Dark + variação Light
  - Preview com background real do tema (#0A0F1E / #F0F2F5)
  - Aceita PNG, JPG, SVG, WebP
  - Base64 no protótipo → Azure Blob Storage em produção
  - Remoção individual por variação (✕ vermelho)
- Edição inline: Nome, CNPJ, Color Picker
- Adicionar / Excluir empresa (mínimo 1)
- Info box com instruções

**Helper `getLogo(emp, isDark)`:**
- isDark → logoDark || logoLight (fallback)
- !isDark → logoLight || logoDark (fallback)

### 2.7 Chatbot Global (Orbit)

**Trigger:** Botão flutuante (canto inferior direito)
- Ícone: Orbit (lucide-react)
- Gradiente azul→roxo + glow shadow
- Hover: scale(1.08) + orbit-icon spin (5s)
- Click: abre painel 380px slide-in pela direita

**Painel:**
- Header: Orbit icon (spin contínuo 5s) + "Orbit" + "Sistema Inteligente em Órbita"
- Context pill mostrando página atual
- Sugestões rápidas (5 opções financeiras)
- Chat input: Enter/Shift+Enter
- Footer: "Claude Sonnet 4 · Anthropic"
- Mock response (placeholder para Claude API)

---

## 3. NAVBAR — Spec Completa

**Altura:** 52px, sticky top, z-index 30

**Esquerda:** Logo da empresa ativa + nome (14px, bold 700)
- `getLogo(activeEmpresa, t.isDark)` → img 30px height
- Fallback: ícone Building2 colorido

**Centro:** Tabs de navegação (5 + admin)
- Caixa Realizado, Extrato, A Pagar/Receber, Fluxo de Caixa, Conciliação
- Active: blue dim background + font 600

**Direita:**
1. Date Picker: dropdown com 5 presets + inputs type="date" + "Aplicar Período" + contador de dias
2. Theme Toggle: Sun/Moon com transição
3. Empresa Dropdown: logo + nome + ChevronDown → lista com logos + checkmark
4. Settings Gear: rotação 90° quando ativo

---

## 4. FEATURES NOVAS — SPEC PARA IMPLEMENTAÇÃO

### 4.1 Exportar Relatório em PDF

**Objetivo:** Permitir que o usuário exporte qualquer página ou seção como PDF formatado, pronto para enviar por WhatsApp ou apresentar em reunião.

**Implementação recomendada:**
- **Produção:** Server-side rendering com Puppeteer no FastAPI (`/api/export/pdf`)
  - Renderiza a página Next.js em headless Chrome
  - Aplica CSS de impressão (@media print)
  - Retorna blob PDF
- **Alternativa client-side:** `html2canvas` + `jsPDF` para casos simples

**Botão de exportação:**
- Posição: canto superior direito de cada página, ao lado do drill-down/filtros
- Ícone: `Download` (lucide-react) + texto "Exportar PDF"
- Estilo: mesma linguagem visual dos botões existentes (surface + border + hover blue)

**Templates de PDF por página:**

| Página | Conteúdo do PDF |
|---|---|
| Caixa Realizado | Header com logo empresa + período, KPI strip, gráficos (renderizados como imagem), DRE sidebar como tabela, footer com data/hora de geração |
| Caixa Detail | KPIs + gráfico de evolução + ranking por cliente + composição |
| Extrato | Header + filtros aplicados + tabela completa (paginada) + totais |
| CP/CR | KPIs + tabela lançamentos + aging + distribuição |
| Fluxo de Caixa | KPIs + gráficos + sidebar resumo |
| Conciliação | KPIs + calendários (como imagem) + tabela de conciliação diária + footer SLA |

**Layout do PDF:**
- Página A4 landscape (melhor para tabelas e gráficos)
- Header: logo empresa (getLogo dark variant) + nome empresa + período selecionado
- Footer: "Gerado em DD/MM/YYYY às HH:MM — ALT MAX Portal BI" + número da página
- Cores: usar variante dark (navy) mesmo no PDF para consistência com a marca
- Tipografia: DM Mono para números, fonte sans para texto

**Opções no modal de exportação:**
```
┌─ Exportar Relatório ────────────────┐
│                                      │
│  Página: [Caixa Realizado ▼]        │
│  Período: 01/10/2025 → 31/03/2026  │
│  Empresa: Alt Max Transportes       │
│                                      │
│  ☑ Incluir gráficos                │
│  ☑ Incluir tabelas detalhadas      │
│  ☐ Incluir análise IA              │
│                                      │
│  [Cancelar]  [Exportar PDF]         │
└──────────────────────────────────────┘
```

**Endpoint FastAPI:**
```python
@router.post("/api/export/pdf")
async def export_pdf(
    page: str,           # "caixa" | "extrato" | "cpcr" | "fluxo" | "concil"
    empresa_id: str,
    date_from: str,
    date_to: str,
    include_charts: bool = True,
    include_tables: bool = True,
):
    # Renderiza HTML → Puppeteer → PDF blob
    # Retorna FileResponse com content-disposition: attachment
```

---

### 4.2 Notificações / Alertas Visuais

**Objetivo:** Notificações passivas que alertam o usuário sobre pendências financeiras sem precisar navegar por cada página.

**Ícone na navbar:**
- Posição: entre o date picker e o theme toggle
- Ícone: `Bell` (lucide-react)
- Badge vermelho com contagem (estilo: circle 16px, position absolute top-right)
- Click: abre painel dropdown (similar ao date picker)

**Categorias de alerta:**

| Prioridade | Categoria | Condição | Cor |
|---|---|---|---|
| 🔴 Crítico | Saldo negativo | saldoAtual < 0 | Red |
| 🔴 Crítico | Contas atrasadas | status === "ATRASADO" && diasAtraso > 5 | Red |
| 🟡 Atenção | Conciliação fora SLA | foraSLA > 0 | Amber |
| 🟡 Atenção | Vencimento próximo | diasParaVcto <= 3 | Amber |
| 🟡 Atenção | Cobertura baixa | cobertura < 1.0x | Amber |
| 🔵 Info | Saldo abaixo do mínimo | saldo < limiteMinimo | Blue |
| 🔵 Info | Novos lançamentos | lançamentos não conciliados hoje | Blue |

**Layout do painel de notificações:**
```
┌─ Notificações ──────────── 3 novas ─┐
│                                      │
│  ● Hoje                             │
│  ┌─────────────────────────────────┐│
│  │ 🔴 3 contas atrasadas          ││
│  │    ENERGIA, INTERNET, SEGURO    ││
│  │    Total: R$ 27.100             ││
│  │    [Ver detalhes →]             ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 🟡 Conciliação: 5 dias fora SLA││
│  │    Maior atraso: 12d úteis      ││
│  │    [Ir para Conciliação →]      ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 🔵 Cobertura de caixa: 0.8x    ││
│  │    Saídas previstas > entradas  ││
│  │    [Ver Fluxo de Caixa →]       ││
│  └─────────────────────────────────┘│
│                                      │
│  ● Ontem                            │
│  ┌─────────────────────────────────┐│
│  │ 🟡 Vencimento amanhã: FGTS     ││
│  │    R$ 9.600 — Itaú              ││
│  └─────────────────────────────────┘│
│                                      │
│  [Marcar todas como lidas]          │
└──────────────────────────────────────┘
```

**Implementação:**

```typescript
// notificationsStore.ts (Zustand)
interface Notification {
  id: string;
  type: "critical" | "warning" | "info";
  category: "saldo" | "atraso" | "conciliacao" | "vencimento" | "cobertura";
  title: string;
  description: string;
  value?: number;
  action?: { label: string; route: string };
  createdAt: Date;
  read: boolean;
}

// Hook que gera notificações a partir dos dados reais
const useNotifications = () => {
  // Calcular a partir de mockCPFull, mockContas, CONCIL_DATA, etc.
  // Em produção: calcular server-side via endpoint /api/notifications
};
```

**Regras de contagem:**
- Badge conta apenas não-lidas
- Críticos sempre aparecem primeiro
- Agrupamento por dia (Hoje, Ontem, Esta Semana)
- Link "Ver detalhes" navega para a página relevante com filtro pré-aplicado

**Persistência:**
- Protótipo: React state (reseta ao refresh)
- Produção: tabela `notifications` no Azure SQL com status read/unread por usuário

---

### 4.3 Dashboard de KPIs Executivo

**Objetivo:** Uma "home" que consolida os números-chave de todas as páginas numa tela só. O CEO/CFO olha e em 5 segundos sabe como está a operação.

**Rota:** `/` (home, antes do Caixa Realizado)  
**Aba na navbar:** Inserir como primeira aba, ícone `Home` ou `Gauge`

**Layout:**

```
┌──────────────────────────────────────────────────────┐
│  KPI STRIP PRINCIPAL (6 cards grandes)               │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐         │
│  │Saldo│ │Resu│ │CP  │ │CR  │ │Conc│ │Flux│         │
│  │Caixa│ │ltad│ │Atr.│ │Prev│ │%   │ │Proj│         │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─── Receita vs Custos ───────┐ ┌── Resultado ───┐ │
│  │  Sparkline 6 meses          │ │  Waterfall mini │ │
│  │  Receita (azul) vs Total    │ │  EBT1→RNOP→EBT2│ │
│  │  Custos (vermelho)          │ │                 │ │
│  └─────────────────────────────┘ └─────────────────┘ │
│                                                      │
│  ┌── Fluxo Projetado ─────────┐ ┌── Conciliação ──┐ │
│  │  Area chart 30d             │ │  Progress ring  │ │
│  │  Zona verde/vermelha        │ │  87% conciliado │ │
│  │  Saldo mínimo como ref.line │ │  + streak info  │ │
│  └─────────────────────────────┘ └─────────────────┘ │
│                                                      │
│  ┌── Aging CP ─────┐ ┌── Top Clientes ─┐ ┌─ SLA ──┐ │
│  │  4 buckets       │ │  Top 5 com bars │ │ Status │ │
│  │  com barras      │ │  + valor        │ │ D+1    │ │
│  └──────────────────┘ └─────────────────┘ └────────┘ │
│                                                      │
│  ┌── Últimas Movimentações ─────────────────────────┐│
│  │  5 últimos lançamentos do extrato (mini tabela)  ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

**KPI Strip (6 cards):**

| KPI | Valor | Sparkline | Cor | Click → |
|---|---|---|---|---|
| Saldo de Caixa | R$ 74.323 | Saldo diário 7d | Blue | /extrato |
| Resultado (EBT2) | R$ 5.901 | EBT2 mensal 6m | Green/Red | /caixa |
| CP Atrasado | R$ 27.100 | Aging 4 buckets | Red se >0 | /cp-cr?tab=CP |
| CR Previsto | R$ 456.100 | CR por mês 3m | Green | /cp-cr?tab=CR |
| Conciliação | 87% | Progress ring | Green/Amber | /conciliacao |
| Fluxo 30d | +R$ 38.400 | Saldo projetado | Green/Red | /fluxo |

**Cada card tem:**
- Label (uppercase, muted)
- Valor grande (DM Mono, 20px, cor semântica)
- Sparkline ou mini visual (40px height)
- Indicador de tendência: ▲/▼ X,X% vs período anterior
- Click navega para a página de detalhe

**Gráficos do corpo:**

1. **Receita vs Custos** — ComposedChart (6 meses)
   - Barras de Receita (blue) vs Barras de Custo Total (red, empilhado CV+CF)
   - Linha de Margem de Contribuição
   - Height: 200px

2. **Resultado Waterfall mini** — Cascata simplificada
   - 5 barras: RoB → Custos → EBT1 → NOP → EBT2
   - Mesma linguagem visual do waterfall da Análise IA

3. **Fluxo Projetado** — AreaChart (30d)
   - Área verde acima de 0, vermelha abaixo
   - ReferenceLine no saldo mínimo (configurable)

4. **Conciliação** — Progress ring (SVG circle)
   - % conciliado no centro
   - Streak de dias sem conciliar

5. **Aging CP** — 4 barras horizontais (0-15d, 16-30d, 31-60d, 60+d)

6. **Top Clientes** — 5 barras horizontais com nome + valor

7. **Últimas Movimentações** — Mini tabela com 5 últimos lançamentos

**Responsividade:**
- Desktop: grid 2×3 nos charts
- O KPI strip: grid 6 colunas (comprime em telas menores)

**Dados:**
- Todos derivados das mesmas fontes mock do protótipo
- Em produção: endpoint `/api/dashboard/summary` que agrega todos os dados num único call

---

## 5. MAPEAMENTO PROTÓTIPO → PRODUÇÃO

### 5.1 Estrutura de Arquivos (Next.js)

```
app/
├── (portal)/
│   ├── layout.tsx          ← Shell (nav, theme, empresa, chat)
│   ├── page.tsx            ← Dashboard Executivo (HOME)
│   ├── caixa/
│   │   └── page.tsx        ← PageCaixa (dashboard + detail + analise)
│   ├── extrato/
│   │   └── page.tsx        ← PageExtrato
│   ├── cp-cr/
│   │   └── page.tsx        ← PageCPCR
│   ├── fluxo/
│   │   └── page.tsx        ← PageFluxo
│   ├── conciliacao/
│   │   └── page.tsx        ← PageConciliacao
│   └── admin/
│       └── page.tsx        ← PageAdmin
├── components/
│   ├── ui/                 ← GlowLine, Badge, ConcilBadge, SortHeader, etc.
│   ├── charts/             ← BarLabel, BarLabelVar, CustomTooltip, MiniChart
│   ├── chat/               ← ChatPanel, Orbit button
│   ├── nav/                ← Navbar, DatePicker, EmpresaDropdown, ThemeToggle
│   └── export/             ← ExportModal, PDFTemplates
├── lib/
│   ├── theme.ts            ← DARK, LIGHT, ThemeCtx, useT
│   ├── empresas.ts         ← EmpresasCtx, useEmpresas, getLogo
│   ├── formatters.ts       ← fmtBRL, fmtK, fmtPct, parseDMY
│   ├── sla.ts              ← FERIADOS, isBusinessDay, nextBusinessDay
│   └── notifications.ts   ← useNotifications, types
├── stores/
│   ├── authStore.ts        ← (existente)
│   └── notificationStore.ts ← Zustand store
└── api/
    ├── omie/               ← Integração Omie (existente no backend FastAPI)
    ├── export/              ← PDF export endpoint
    └── notifications/       ← Alerts engine
```

### 5.2 Substituição de Mock por API Real

| Mock no protótipo | Endpoint Omie / API |
|---|---|
| `CAIXA_DATA` | `fExtratoLancamentos` agrupado por período |
| `mockExtrato` | `fExtratoLancamentos` com paginação |
| `mockCPFull` / `mockCRFull` | `fContasPagar` / `fContasReceber` |
| `mockContas` | `fSaldoBancario` por conta |
| `mockFluxo` | `fContasPagar` + `fContasReceber` agrupado por mês |
| `CONCIL_DATA` | `fConciliacaoBancaria` ou lógica custom |
| `DRE_ROWS` | `fExtratoLancamentos` classificado por planoContas |
| `CAT_DESC` | `planoContas.ts` (já existe no repo) |
| `EMPRESAS_DEFAULT` | Tabela `empresas` no Azure SQL |

### 5.3 Dependências (já no repo ou a adicionar)

```json
{
  "existentes": ["next", "react", "tailwindcss", "zustand", "typescript"],
  "adicionar": [
    "recharts",
    "lucide-react", 
    "jspdf",
    "html2canvas"
  ]
}
```

---

## 6. DECISÕES DE DESIGN REGISTRADAS

| Decisão | Contexto |
|---|---|
| Coluna "Conta" → "Banco" | Extrato: mostra nome do banco, não número da conta |
| Coluna "Categoria" → descrição por extenso | Via mapeamento CAT_DESC do planoContas |
| DIF = 0 → conciliado | Regra de conciliação: derivado de fórmula, não flag |
| SLA D+1 útil | Conciliação deve ocorrer no próximo dia útil após movimento |
| Feriados BR cadastrados | Out/25→Mar/26, incluindo Carnaval bancário |
| Dual logo (Dark/Light) | Cada empresa pode ter variação de logo por tema |
| Orbit (não Sparkles/Brain) | Ícone do assistente IA: Orbit com animação 5s |
| Saldo NOP unificado | Um card ao invés de RNOP + DNOP separados |
| Grid 3col + span | Row1: TDCF/CV/CF (1fr cada), Row2: SNOP (span 2) + Resultado (1fr) |
| Theme via Context | ThemeCtx propaga DARK/LIGHT, useT() em todos os componentes |
| Empresa via Context | EmpresasCtx com getLogo() helper para fallback automático |
| Scroll via main | `<main overflow:auto>`, pages com `minHeight:"100%"` |

---

## 7. PRIORIDADE DE IMPLEMENTAÇÃO

```
Fase 1 — Core (MVP)
  ├── Shell (nav + theme + empresa)
  ├── Caixa Realizado (dashboard view)
  ├── Extrato
  ├── Contas a Pagar/Receber
  └── Integração Omie (endpoints existentes)

Fase 2 — Avançado
  ├── Fluxo de Caixa
  ├── Conciliação (com SLA D+1)
  ├── Dashboard Executivo (home)
  ├── Caixa Detail views (drill-down por indicador)
  └── Análise IA (Claude Agent)

Fase 3 — Polish
  ├── Admin (upload logo, empresas)
  ├── Orbit Chatbot global
  ├── Notificações / Alertas
  ├── Exportar PDF
  └── Responsividade mobile
```

---

## 8. REFATORAÇÃO E OTIMIZAÇÃO DE CÓDIGO

O protótipo é um arquivo monolítico JSX de 3.223 linhas com mock data inline, estilos inline, e componentes aninhados. Esta seção detalha as refatorações necessárias para código de produção.

### 8.1 Decomposição de Componentes

**Problema:** Tudo está num único arquivo. Componentes como `DetailPanel`, `MiniChart`, `CalendarMonth` estão definidos dentro de outros componentes, recriando-se a cada render.

**Refatoração:**

```
components/
├── ui/
│   ├── GlowLine.tsx
│   ├── Badge.tsx
│   ├── ConcilBadge.tsx
│   ├── SortHeader.tsx
│   ├── DetailBtn.tsx
│   └── KPICard.tsx              ← Extrair pattern KPI repetido em 5+ páginas
├── charts/
│   ├── BarLabel.tsx
│   ├── BarLabelVar.tsx
│   ├── CustomTooltip.tsx
│   ├── MiniChart.tsx            ← Tirar de dentro de PageCaixa
│   ├── MainChart.tsx
│   ├── WaterfallDRE.tsx         ← Cascata extraída como componente
│   └── SaldoNOPChart.tsx
├── caixa/
│   ├── KPIStrip.tsx
│   ├── DrillBar.tsx
│   ├── ChartGrid.tsx
│   ├── ResultadoFinalCard.tsx
│   ├── DRESidebar.tsx
│   ├── DetailPanel.tsx          ← Tirar de dentro de PageCaixa
│   ├── ClientRanking.tsx
│   ├── ParetoBar.tsx
│   └── AnaliseIA.tsx
├── conciliacao/
│   ├── CalendarMonth.tsx        ← Tirar de dentro de PageConciliacao
│   ├── CalendarHeatmap.tsx
│   ├── ConcilTable.tsx
│   └── SLAFooter.tsx
├── chat/
│   ├── ChatPanel.tsx
│   ├── OrbitButton.tsx
│   └── ChatMessage.tsx
└── nav/
    ├── Navbar.tsx
    ├── DateRangePicker.tsx
    ├── EmpresaDropdown.tsx
    ├── ThemeToggle.tsx
    └── NotificationBell.tsx     ← Feature nova
```

### 8.2 Extração de Estilos Inline → Tailwind

**Problema:** ~500 ocorrências de `style={{ ... }}` com objetos CSS inline. Difícil de manter, sem cache, sem reuso.

**Refatoração:** Converter para classes Tailwind. Exemplos:

```tsx
// ANTES (protótipo)
<div style={{ 
  display:"flex", alignItems:"center", gap:8,
  padding:"14px 22px", borderRight:`1px solid ${t.border}`,
  fontSize:9, textTransform:"uppercase", letterSpacing:1.2,
  color:t.muted, fontFamily:"'DM Mono',monospace"
}}>

// DEPOIS (produção)
<div className="flex items-center gap-2 px-5 py-3.5 border-r border-border
  text-[9px] uppercase tracking-wider text-muted font-mono">
```

**Temas via Tailwind CSS variables:**
```css
/* globals.css */
:root {
  --bg: #F4F6F8;
  --surface: rgba(0,0,0,0.028);
  --border: rgba(0,0,0,0.09);
  --text: #0F172A;
  --muted: #64748B;
  --blue: #0284C7;
  --green: #059669;
  --red: #DC2626;
  /* ... */
}

.dark {
  --bg: #05091A;
  --surface: rgba(255,255,255,0.034);
  --border: rgba(255,255,255,0.07);
  --text: #F1F5F9;
  --muted: #64748B;
  --blue: #38BDF8;
  --green: #34D399;
  --red: #F87171;
  /* ... */
}
```

```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      bg: 'var(--bg)',
      surface: 'var(--surface)',
      border: 'var(--border)',
      text: 'var(--text)',
      muted: 'var(--muted)',
      accent: {
        blue: 'var(--blue)',
        green: 'var(--green)',
        red: 'var(--red)',
        amber: 'var(--amber)',
        purple: 'var(--purple)',
        orange: 'var(--orange)',
      }
    },
    fontFamily: {
      mono: ['DM Mono', 'monospace'],
      sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
    }
  }
}
```

### 8.3 Separação de Mock Data → API Layer

**Problema:** Mock data definido como constantes globais inline (~200 linhas de dados hardcoded). `genConcilData()` usa `Math.random()` no module scope.

**Refatoração:**

```
lib/
├── api/
│   ├── omie.ts               ← Client HTTP para API Omie
│   ├── endpoints.ts           ← URLs e configs
│   └── types.ts               ← Interfaces TypeScript
├── hooks/
│   ├── useCaixaData.ts        ← React Query / SWR hook
│   ├── useExtrato.ts
│   ├── useCPCR.ts
│   ├── useFluxo.ts
│   ├── useConciliacao.ts
│   └── useDashboard.ts       ← Agregação para home
├── mocks/                     ← Apenas para dev/testes
│   ├── caixaData.ts
│   ├── extratoData.ts
│   ├── cpcrData.ts
│   ├── concilData.ts
│   └── empresasData.ts
└── utils/
    ├── formatters.ts          ← fmtBRL, fmtK, fmtPct
    ├── sla.ts                 ← Feriados, isBusinessDay, nextBusinessDay
    ├── sort.ts                ← toggleSort, sortRows
    └── dates.ts               ← parseDMY, fmtDateBR, fmtDateNav
```

**Pattern com React Query:**
```tsx
// hooks/useCaixaData.ts
export const useCaixaData = (empresaId: string, dateFrom: string, dateTo: string) => {
  return useQuery({
    queryKey: ['caixa', empresaId, dateFrom, dateTo],
    queryFn: () => fetchCaixaData(empresaId, dateFrom, dateTo),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
};
```

### 8.4 Tipagem TypeScript

**Problema:** Protótipo é JSX puro sem tipagem. Props implícitas, objetos sem interface.

**Interfaces principais a criar:**

```typescript
// types/financial.ts
interface KPIItem {
  label: string;
  value: string;
  color: string;
  accent?: string;
  sub?: string;
  glow?: string;
}

interface ExtratoLancamento {
  data: string;          // DD/MM/YYYY
  descricao: string;
  valor: number;
  catCod: string;        // Código planoContas
  conciliado: boolean;
  banco: string;
}

interface ContaPagarReceber {
  fav: string;           // Favorecido
  valor: number;
  vcto: string;          // DD/MM/YYYY
  status: 'A VENCER' | 'ATRASADO' | 'PAGO' | 'A RECEBER' | 'RECEBIDO';
  cat: string;           // Código planoContas
  banco: string;
}

interface ConcilEntry {
  date: string;          // YYYY-MM-DD
  extrato: number;
  saldoBanco: number;
  dif: number;
  conciliado: boolean;   // Derivado: dif === 0
  banco: string;
}

interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  logoDark: string | null;
  logoLight: string | null;
  cor: string;
}

interface SortState {
  field: string;
  dir: 'asc' | 'desc';
}

interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceHover: string;
  surfaceElevated: string;
  border: string;
  borderHover: string;
  blue: string;
  blueDim: string;
  green: string;
  greenDim: string;
  red: string;
  redDim: string;
  amber: string;
  amberDim: string;
  purple: string;
  purpleDim: string;
  orange: string;
  orangeDim: string;
  text: string;
  textSec: string;
  muted: string;
  mutedDim: string;
  gridLine: string;
  scrollTrack: string;
  scrollThumb: string;
  scrollHover: string;
  tooltipShadow: string;
  isDark: boolean;
}

interface DetailDef {
  title: string;
  key: string | null;
  color: string;
  kpis: KPIItem[];
  breakdown: { item: string; valor: number; pct: number }[];
  breakdownDN?: { item: string; valor: number; pct: number }[];
  clientes?: { nome: string; valor: number }[];
}

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  value?: number;
  action?: { label: string; route: string };
  createdAt: Date;
  read: boolean;
}
```

### 8.5 Eliminação de Anti-Patterns

**1. querySelector em React → Refs ou state**
```tsx
// ANTES (protótipo) — 12 ocorrências
onMouseEnter={e => { 
  e.currentTarget.querySelector('.glow').style.opacity='1'; 
}}

// DEPOIS — CSS hover ou React state
// Opção A: CSS puro
.kpi-card .glow { opacity: 0; transition: opacity 0.3s; }
.kpi-card:hover .glow { opacity: 1; }

// Opção B: React state (se precisar de lógica)
const [hovered, setHovered] = useState(false);
<div style={{ opacity: hovered ? 1 : 0 }} />
```

**2. Inline event handlers com style mutation → CSS classes**
```tsx
// ANTES
onMouseEnter={e => { 
  e.currentTarget.style.background = t.surfaceHover; 
  e.currentTarget.style.borderColor = `${t.blue}55`; 
}}

// DEPOIS — Tailwind
className="hover:bg-surface-hover hover:border-blue/30 transition-all"
```

**3. Componentes definidos dentro de componentes → Extrair**
```tsx
// ANTES — MiniChart, DetailPanel, CalendarMonth recriados a cada render
const PageCaixa = () => {
  const MiniChart = ({ dataKey }) => { ... }; // ← Recria a cada render!
  
// DEPOIS — Componentes externos com memo
const MiniChart = memo(({ dataKey, color, data, level }: MiniChartProps) => {
  ...
});
```

**4. Cálculos repetidos no render → useMemo**
```tsx
// ANTES
const pago = data.filter(r => r.status === "PAGO").reduce((s, r) => s + r.valor, 0);
// Recalcula a cada render mesmo sem mudança nos dados

// DEPOIS
const pago = useMemo(() => 
  data.filter(r => r.status === "PAGO").reduce((s, r) => s + r.valor, 0),
  [data]
);
```

**5. Context rebuild → Zustand stores**
```tsx
// ANTES — Context recria value object a cada render
<ThemeCtx.Provider value={t}>
<EmpresasCtx.Provider value={{ empresas, setEmpresas, activeEmp, setActiveEmp }}>

// DEPOIS — Zustand (já no stack)
// stores/themeStore.ts
export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'dark',
  tokens: DARK,
  toggle: () => set(s => ({ 
    mode: s.mode === 'dark' ? 'light' : 'dark',
    tokens: s.mode === 'dark' ? LIGHT : DARK,
  })),
}));

// stores/empresaStore.ts
export const useEmpresaStore = create<EmpresaStore>((set) => ({
  empresas: [],
  activeId: null,
  setActive: (id) => set({ activeId: id }),
  updateEmpresa: (idx, data) => set(s => ({
    empresas: s.empresas.map((e, i) => i === idx ? { ...e, ...data } : e),
  })),
}));
```

### 8.6 Performance

**1. Lazy loading de páginas:**
```tsx
// app/(portal)/layout.tsx
const PageCaixa = dynamic(() => import('./caixa/page'), { 
  loading: () => <PageSkeleton /> 
});
```

**2. Chart components com lazy import:**
```tsx
const ResponsiveContainer = dynamic(
  () => import('recharts').then(m => m.ResponsiveContainer),
  { ssr: false }
);
```

**3. Virtualização de tabelas longas:**
```tsx
// Extrato e CP/CR podem ter 100+ linhas em produção
import { useVirtualizer } from '@tanstack/react-virtual';
```

**4. Debounce no search:**
```tsx
const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search, 300);
// Filtrar usando debouncedSearch, não search
```

**5. Image optimization para logos:**
```tsx
// Produção: Azure Blob Storage URLs
// Next.js Image component com blur placeholder
<Image src={logoUrl} width={120} height={30} alt={empresa.nome} />
```

### 8.7 Acessibilidade (a11y)

**Problemas no protótipo:**
- Botões sem `aria-label` (ícones sem texto)
- Tabelas sem `scope` nos headers
- Contraste insuficiente em alguns tokens `mutedDim`
- Gráficos sem `aria-describedby`
- Toggle de tema sem announce

**Correções mínimas:**
```tsx
<button aria-label="Alternar tema" onClick={toggleTheme}>
<button aria-label="Abrir assistente Orbit" onClick={openChat}>
<th scope="col">Data</th>
<div role="img" aria-label="Gráfico de receita bruta por mês">
```

### 8.8 Testes

```
__tests__/
├── components/
│   ├── Badge.test.tsx
│   ├── SortHeader.test.tsx
│   └── KPICard.test.tsx
├── hooks/
│   ├── useCaixaData.test.ts
│   └── useNotifications.test.ts
├── utils/
│   ├── formatters.test.ts      ← fmtBRL, fmtK, fmtPct
│   ├── sla.test.ts             ← isBusinessDay, nextBusinessDay
│   └── sort.test.ts            ← toggleSort, sortRows
└── pages/
    ├── caixa.test.tsx           ← Snapshot + drill-down flow
    └── conciliacao.test.tsx     ← SLA logic + calendar
```

**Prioridade de testes:**
1. `formatters.ts` — funções puras, fácil de testar, alto impacto
2. `sla.ts` — lógica de negócio crítica (feriados, D+1 útil)
3. `sort.ts` — sortRows com diferentes tipos de dado
4. Hooks de dados — mock de API + verificação de transformação
5. Componentes — snapshot tests das páginas principais

### 8.9 Checklist de Refatoração

```
□ Decompor arquivo monolítico em ~40 componentes
□ Converter styles inline → Tailwind classes
□ Implementar CSS variables para temas (dark/light)
□ Extrair mock data para /mocks + criar hooks com React Query
□ Adicionar interfaces TypeScript para todos os types
□ Substituir querySelector → CSS :hover ou React state
□ Extrair componentes de dentro de componentes (MiniChart, CalendarMonth, DetailPanel)
□ Adicionar useMemo nos cálculos derivados pesados
□ Migrar Context → Zustand (theme, empresa)
□ Lazy load páginas e componentes de chart
□ Adicionar aria-labels e roles de acessibilidade
□ Implementar virtualização para tabelas 100+ linhas
□ Debounce nos campos de busca
□ Escrever testes para utils e hooks críticos
□ Configurar CI/CD para lint + type-check + test
```

---

*Documento gerado em 27/03/2026. Protótipo: altmax-portal-v2.jsx (3.223 linhas).*
