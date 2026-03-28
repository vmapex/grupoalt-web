'use client'
import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { Orbit, X, Send, User, Bot } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatPanelProps {
  open: boolean
  onClose: () => void
  currentPage?: string
}

const SUGGESTIONS = [
  'Qual o resultado operacional do mes?',
  'Quais contas estao atrasadas?',
  'Resumo da conciliacao bancaria',
  'Qual a projecao de fluxo de caixa?',
  'Maiores clientes por receita',
  'Analise de custos fixos vs variaveis',
]

const MOCK_RESPONSES = [
  'Com base nos dados financeiros carregados, o resultado operacional (EBT2) do periodo foi de R$ 5.901, representando uma margem positiva apos considerar receitas e despesas nao operacionais. A receita bruta ficou em R$ 485.200 com custos totais de R$ 412.300.',
  'Analisando os dados do periodo, identifiquei 3 contas atrasadas totalizando R$ 27.100. As principais pendencias sao: ENERGIA (R$ 12.500), INTERNET (R$ 8.200) e SEGURO (R$ 6.400). Recomendo priorizar a regularizacao para evitar encargos.',
  'A conciliacao bancaria esta em 87% no periodo. Existem 5 dias fora do SLA D+1 util, com o maior atraso sendo de 12 dias uteis. Os bancos Itau e Bradesco apresentam as maiores divergencias pendentes.',
]

const PAGE_LABELS: Record<string, string> = {
  '/portal': 'Dashboard',
  '/portal/caixa': 'Caixa Realizado',
  '/portal/extrato': 'Extrato',
  '/portal/cp-cr': 'A Pagar/Receber',
  '/portal/fluxo': 'Fluxo de Caixa',
  '/portal/conciliacao': 'Conciliacao',
  '/portal/admin': 'Configuracoes',
}

export function ChatPanel({ open, onClose, currentPage = '/portal' }: ChatPanelProps) {
  const t = useThemeStore((s) => s.tokens)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const pageLabel = PAGE_LABELS[currentPage] || 'Portal'

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 300)
    }
  }, [open])

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isTyping) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    const responseIdx = Math.floor(Math.random() * MOCK_RESPONSES.length)
    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: MOCK_RESPONSES[responseIdx],
      }
      setMessages((prev) => [...prev, assistantMsg])
      setIsTyping(false)
    }, 1500)
  }, [isTyping])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion)
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out"
        style={{
          width: 380,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          background: t.bg,
          borderLeft: `1px solid ${t.border}`,
          boxShadow: open ? '-8px 0 32px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 shrink-0"
          style={{
            height: 60,
            borderBottom: `1px solid ${t.border}`,
            background: `linear-gradient(135deg, ${t.blueDim}, ${t.purpleDim})`,
          }}
        >
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 36,
              height: 36,
              background: `linear-gradient(135deg, ${t.blue}, ${t.purple})`,
            }}
          >
            <Orbit size={18} color="#fff" className="animate-[spin_5s_linear_infinite]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold" style={{ color: t.text }}>
              Orbit
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="block w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: t.green }}
              />
              <span className="text-[9px]" style={{ color: t.textSec }}>
                Sistema Inteligente em Orbita
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
            style={{ color: t.muted, background: t.surface }}
            aria-label="Fechar chat"
          >
            <X size={14} />
          </button>
        </div>

        {/* Context Pill */}
        <div className="px-5 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-medium"
            style={{ background: t.blueDim, color: t.blue }}
          >
            <span>&#x2B21;</span> Contexto: {pageLabel}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{
                  width: 56,
                  height: 56,
                  background: `linear-gradient(135deg, ${t.blueDim}, ${t.purpleDim})`,
                }}
              >
                <Orbit size={26} style={{ color: t.purple }} />
              </div>
              <div className="text-center">
                <div className="text-[12px] font-medium mb-1" style={{ color: t.textSec }}>
                  Como posso ajudar?
                </div>
                <div className="text-[10px]" style={{ color: t.muted }}>
                  Pergunte sobre seus dados financeiros
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5"
                  style={{ background: `linear-gradient(135deg, ${t.blue}, ${t.purple})` }}
                >
                  <Bot size={12} color="#fff" />
                </div>
              )}
              <div
                className="rounded-xl px-3 py-2 text-[11px] leading-relaxed max-w-[280px]"
                style={{
                  background: msg.role === 'user' ? t.blueDim : t.surface,
                  color: msg.role === 'user' ? t.blue : t.text,
                  border: `1px solid ${msg.role === 'user' ? `${t.blue}22` : t.border}`,
                }}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5"
                  style={{ background: t.blueDim }}
                >
                  <User size={12} style={{ color: t.blue }} />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2 justify-start">
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5"
                style={{ background: `linear-gradient(135deg, ${t.blue}, ${t.purple})` }}
              >
                <Bot size={12} color="#fff" />
              </div>
              <div
                className="rounded-xl px-3 py-2.5 flex items-center gap-1"
                style={{ background: t.surface, border: `1px solid ${t.border}` }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="block w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{
                      background: t.muted,
                      animationDelay: `${i * 200}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length < 3 && !isTyping && (
          <div
            className="px-4 pb-2 shrink-0 flex flex-wrap gap-1.5"
            style={{ borderTop: `1px solid ${t.border}` }}
          >
            <div className="w-full pt-2 pb-1 text-[8px] uppercase tracking-wider" style={{ color: t.muted }}>
              Sugestoes
            </div>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="px-2.5 py-1 rounded-full text-[9px] transition-colors cursor-pointer"
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  color: t.textSec,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${t.blue}44`
                  e.currentTarget.style.color = t.blue
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = t.border
                  e.currentTarget.style.color = t.textSec
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div
          className="px-4 py-3 shrink-0"
          style={{ borderTop: `1px solid ${t.border}`, background: t.surfaceElevated }}
        >
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre seus dados..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none text-[11px] leading-relaxed"
              style={{
                color: t.text,
                maxHeight: 80,
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-all cursor-pointer"
              style={{
                background: input.trim() && !isTyping
                  ? `linear-gradient(135deg, ${t.blue}, ${t.purple})`
                  : t.surface,
                color: input.trim() && !isTyping ? '#fff' : t.muted,
                opacity: input.trim() && !isTyping ? 1 : 0.5,
              }}
              aria-label="Enviar mensagem"
            >
              <Send size={12} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 text-center shrink-0"
          style={{ borderTop: `1px solid ${t.border}` }}
        >
          <span className="text-[8px] font-mono tracking-wider" style={{ color: t.mutedDim }}>
            Claude Sonnet 4 &middot; Anthropic
          </span>
        </div>
      </div>
    </>
  )
}
