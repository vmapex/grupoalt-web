'use client'
import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { Orbit, X, Send, User, Bot, Zap, Brain } from 'lucide-react'
import api from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  classification?: string
}

interface ChatPanelProps {
  open: boolean
  onClose: () => void
  currentPage?: string
}

interface TokenUsage {
  tokens_used: number
  tokens_limit: number
  tokens_remaining: number
  role: string
}

const SUGGESTIONS = [
  'Qual o resultado operacional do mês?',
  'Quais contas estão atrasadas?',
  'Resumo da conciliação bancária',
  'Qual a projeção de fluxo de caixa?',
  'Analise a tendência de custos',
  'Compare receita vs despesas',
]

const PAGE_LABELS: Record<string, string> = {
  '/portal': 'Dashboard',
  '/portal/grupo': 'Dashboard',
  '/portal/financeiro/caixa': 'Caixa Realizado',
  '/portal/financeiro/extrato': 'Extrato',
  '/portal/financeiro/cp': 'Contas a Pagar/Receber',
  '/portal/financeiro/fluxo': 'Fluxo de Caixa',
  '/portal/financeiro/conciliacao': 'Conciliação',
  '/portal/admin': 'Configurações',
}

export function ChatPanel({ open, onClose, currentPage = '/portal' }: ChatPanelProps) {
  const t = useThemeStore((s) => s.tokens)
  const empresaAtiva = useAuthStore((s) => s.empresaAtiva)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [usage, setUsage] = useState<TokenUsage | null>(null)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const pageLabel = PAGE_LABELS[currentPage] || 'Portal'

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, isTyping, scrollToBottom])

  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 300)
    }
    // Fetch usage when panel opens
    if (open) {
      api.get('/orbit/usage').then((r) => setUsage(r.data)).catch(() => {})
    }
  }, [open])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isTyping) return

    setError('')
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsTyping(true)

    try {
      const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }))
      const res = await api.post('/orbit/chat', {
        messages: apiMessages,
        financial_context: `Página atual: ${pageLabel}`,
        empresa_id: empresaAtiva?.id || null,
      })

      const data = res.data
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        model: data.model,
        classification: data.classification,
      }
      setMessages((prev) => [...prev, assistantMsg])

      // Update usage
      setUsage((prev) => prev ? {
        ...prev,
        tokens_used: prev.tokens_limit - data.tokens_remaining,
        tokens_remaining: data.tokens_remaining,
      } : null)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Erro ao enviar mensagem'
      if (err?.response?.status === 429) {
        setError(detail)
      } else {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ ${detail}`,
        }
        setMessages((prev) => [...prev, errorMsg])
      }
    } finally {
      setIsTyping(false)
    }
  }, [isTyping, messages, pageLabel])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const usagePct = usage ? Math.min(100, (usage.tokens_used / usage.tokens_limit) * 100) : 0

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
              width: 36, height: 36,
              background: `linear-gradient(135deg, ${t.blue}, ${t.purple})`,
            }}
          >
            <Orbit size={18} color="#fff" className="animate-[spin_5s_linear_infinite]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold" style={{ color: t.text }}>Orbit</div>
            <div className="flex items-center gap-1.5">
              <span className="block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: t.green }} />
              <span className="text-[9px]" style={{ color: t.textSec }}>Sistema Inteligente em Órbita</span>
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

        {/* Context Pill + Usage */}
        <div className="px-5 py-2.5 shrink-0 flex items-center justify-between" style={{ borderBottom: `1px solid ${t.border}` }}>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-medium" style={{ background: t.blueDim, color: t.blue }}>
            <span>&#x2B21;</span> {pageLabel}
          </span>
          {usage && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: `${t.text}10` }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${usagePct}%`,
                    background: usagePct > 80 ? t.red : usagePct > 50 ? t.amber : t.green,
                  }}
                />
              </div>
              <span className="text-[8px] font-mono" style={{ color: t.muted }}>
                {((usage.tokens_used / 1000).toFixed(1))}K/{((usage.tokens_limit / 1000).toFixed(0))}K
              </span>
            </div>
          )}
        </div>

        {/* Token limit error */}
        {error && (
          <div className="px-4 py-2 text-[10px] shrink-0" style={{ background: t.redDim, color: t.red }}>
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{ width: 56, height: 56, background: `linear-gradient(135deg, ${t.blueDim}, ${t.purpleDim})` }}
              >
                <Orbit size={26} style={{ color: t.purple }} />
              </div>
              <div className="text-center">
                <div className="text-[12px] font-medium mb-1" style={{ color: t.textSec }}>Como posso ajudar?</div>
                <div className="text-[10px]" style={{ color: t.muted }}>Pergunte sobre seus dados financeiros</div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5"
                  style={{ background: `linear-gradient(135deg, ${t.blue}, ${t.purple})` }}
                >
                  <Bot size={12} color="#fff" />
                </div>
              )}
              <div className="flex flex-col max-w-[280px]">
                <div
                  className="rounded-xl px-3 py-2 text-[11px] leading-relaxed"
                  style={{
                    background: msg.role === 'user' ? t.blueDim : t.surface,
                    color: msg.role === 'user' ? t.blue : t.text,
                    border: `1px solid ${msg.role === 'user' ? `${t.blue}22` : t.border}`,
                  }}
                >
                  {msg.content}
                </div>
                {/* Model indicator for assistant messages */}
                {msg.role === 'assistant' && msg.model && (
                  <div className="flex items-center gap-1 mt-0.5 ml-1">
                    {msg.classification === 'haiku' ? (
                      <Zap size={8} style={{ color: t.green }} />
                    ) : (
                      <Brain size={8} style={{ color: t.purple }} />
                    )}
                    <span className="text-[7px] font-mono" style={{ color: t.mutedDim }}>
                      {msg.classification === 'haiku' ? 'Haiku' : 'Sonnet'}
                    </span>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5" style={{ background: t.blueDim }}>
                  <User size={12} style={{ color: t.blue }} />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2 justify-start">
              <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5" style={{ background: `linear-gradient(135deg, ${t.blue}, ${t.purple})` }}>
                <Bot size={12} color="#fff" />
              </div>
              <div className="rounded-xl px-3 py-2.5 flex items-center gap-1" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: t.muted, animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length < 3 && !isTyping && (
          <div className="px-4 pb-2 shrink-0 flex flex-wrap gap-1.5" style={{ borderTop: `1px solid ${t.border}` }}>
            <div className="w-full pt-2 pb-1 text-[8px] uppercase tracking-wider" style={{ color: t.muted }}>Sugestões</div>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="px-2.5 py-1 rounded-full text-[9px] transition-colors cursor-pointer"
                style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textSec }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${t.blue}44`; e.currentTarget.style.color = t.blue }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textSec }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 shrink-0" style={{ borderTop: `1px solid ${t.border}`, background: t.surfaceElevated }}>
          <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre seus dados..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none text-[11px] leading-relaxed"
              style={{ color: t.text, maxHeight: 80 }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-all cursor-pointer"
              style={{
                background: input.trim() && !isTyping ? `linear-gradient(135deg, ${t.blue}, ${t.purple})` : t.surface,
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
        <div className="px-4 py-2 text-center shrink-0 flex items-center justify-center gap-2" style={{ borderTop: `1px solid ${t.border}` }}>
          <span className="text-[8px] font-mono tracking-wider" style={{ color: t.mutedDim }}>
            Haiku <Zap size={7} className="inline" /> &middot; Sonnet <Brain size={7} className="inline" /> &middot; Anthropic
          </span>
        </div>
      </div>
    </>
  )
}
