'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import Cookies from 'js-cookie'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const { data } = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      const token = data.access_token
      Cookies.set('access_token', token, { expires: 1 })

      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const me = meRes.data

      setAuth(
        token,
        { id: me.id, nome: me.nome, email: me.email, is_admin: me.is_admin },
        me.empresas || [],
        me.grupos || [],
        me.permissoes || [],
      )
      router.push('/portal')
    } catch (err: any) {
      if (err?.response?.status === 400 || err?.response?.status === 401) {
        setError('Email ou senha inválidos.')
      } else if (err?.code === 'ERR_NETWORK') {
        setError('Erro de conexão com o servidor.')
      } else {
        const detail = err?.response?.data?.detail || err?.message || 'Erro desconhecido'
        setError(`Erro ao fazer login: ${detail}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: '#BDB9BA',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{
        maxWidth: 1152,
        width: '100%',
        overflow: 'hidden',
        borderRadius: 24,
        boxShadow: '0 25px 60px -12px rgba(0,0,0,0.35)',
        border: '1px solid #524D4E',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 640,
      }}>

        {/* ═══ LEFT — LOGIN FORM ═══ */}
        <div style={{
          background: 'linear-gradient(165deg, #1A1718 0%, #232021 45%, #2E2A2B 100%)',
          padding: '28px 48px 36px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Radial glow */}
          <div style={{
            position: 'absolute', top: '-40%', right: '-20%',
            width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          {/* Gold bottom line */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(90deg, #CCA000, #E0B82E, #CCA000)',
          }} />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, position: 'relative', zIndex: 2 }}>
            <img
              src="/logo_grupo_alt.png"
              alt="Grupo ALT"
              style={{ height: 207, width: 'auto', filter: 'brightness(0) invert(1)', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 420, position: 'relative', zIndex: 2 }}>
            <h1 style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 34, lineHeight: 1.2, color: '#FFFFFF',
              marginBottom: 12, letterSpacing: -0.5,
            }}>
              Bem-vindo(a) de volta ao seu{' '}
              <span style={{ color: '#E0B82E' }}>portal profissional.</span>
            </h1>
            <p style={{
              fontSize: 15, color: 'rgba(255,255,255,0.6)',
              fontWeight: 300, lineHeight: 1.7, marginBottom: 24,
            }}>
              Acesse seu painel do Grupo ALT e continue gerenciando suas operações, indicadores e frentes de negócio.
            </p>

            <form onSubmit={handleLogin}>
              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: 8, letterSpacing: 0.2 }}>
                  E-mail corporativo
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="seu.nome@grupoalt.com.br"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 12,
                      padding: '14px 46px 14px 16px',
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      fontSize: 15,
                      color: '#FFFFFF',
                      outline: 'none',
                      transition: 'all 0.25s ease',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#E0B82E'
                      e.target.style.boxShadow = '0 0 0 3px rgba(224,184,46,0.15)'
                      e.target.style.background = 'rgba(255,255,255,0.1)'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.15)'
                      e.target.style.boxShadow = 'none'
                      e.target.style.background = 'rgba(255,255,255,0.08)'
                    }}
                  />
                  <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Senha */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: 8, letterSpacing: 0.2 }}>
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 12,
                      padding: '14px 46px 14px 16px',
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      fontSize: 15,
                      color: '#FFFFFF',
                      outline: 'none',
                      transition: 'all 0.25s ease',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#E0B82E'
                      e.target.style.boxShadow = '0 0 0 3px rgba(224,184,46,0.15)'
                      e.target.style.background = 'rgba(255,255,255,0.1)'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.15)'
                      e.target.style.boxShadow = 'none'
                      e.target.style.background = 'rgba(255,255,255,0.08)'
                    }}
                  />
                  <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p style={{ fontSize: 13, color: '#F87171', marginBottom: 16 }}>{error}</p>
              )}

              {/* Options row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 16, height: 16, accentColor: '#CCA000', borderRadius: 4, cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Lembrar de mim</span>
                </label>
                <a href="#" style={{ fontSize: 13, color: '#E0B82E', textDecoration: 'none', fontWeight: 500 }}>
                  Esqueceu a senha?
                </a>
              </div>

              {/* Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#CCA000',
                  color: '#062C5D',
                  border: 'none',
                  borderRadius: 12,
                  padding: 14,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  boxShadow: '0 4px 16px rgba(204,160,0,0.25)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    (e.target as HTMLButtonElement).style.background = '#E0B82E'
                    ;(e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
                    ;(e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(204,160,0,0.35)'
                  }
                }}
                onMouseLeave={e => {
                  (e.target as HTMLButtonElement).style.background = '#CCA000'
                  ;(e.target as HTMLButtonElement).style.transform = 'translateY(0)'
                  ;(e.target as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(204,160,0,0.25)'
                }}
              >
                {loading ? 'Entrando...' : 'Entrar no Portal'}
              </button>
            </form>

            {/* Register */}
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                Primeiro acesso?{' '}
                <a href="#" style={{ color: '#E0B82E', textDecoration: 'none', fontWeight: 600 }}>
                  Solicite suas credenciais
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT — MISSAO / VISAO / VALORES ═══ */}
        <div style={{ background: '#232021', display: 'flex', flexDirection: 'column' }}>
          {[
            {
              label: 'Nossa Missão',
              title: 'Conectar o agro ao futuro',
              desc: 'Oferecer soluções logísticas e operacionais que impulsionam o agronegócio brasileiro com excelência, segurança e compromisso socioambiental.',
              img: '/missao.jpeg',
            },
            {
              label: 'Nossa Visão',
              title: 'Referência em logística agro',
              desc: 'Ser reconhecida como a principal parceira logística do agronegócio no Brasil, inovando continuamente para superar expectativas.',
              img: '/visao.jpg',
            },
            {
              label: 'Nossos Valores',
              title: 'O que nos move',
              desc: 'Integridade, trabalho em equipe, comprometimento com resultados e respeito às pessoas e ao meio ambiente.',
              img: '/valores.jpg',
            },
          ].map((card, i) => (
            <div key={i} style={{
              flex: 1, padding: 32,
              borderBottom: i < 2 ? '1px solid #3D3839' : 'none',
              display: 'flex', flexDirection: 'column',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#E0B82E', marginBottom: 6 }}>
                {card.label}
              </span>
              <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: '#FFFFFF', marginBottom: 6 }}>
                {card.title}
              </h3>
              <p style={{ fontSize: 13, color: '#948F90', lineHeight: 1.6, marginBottom: 14 }}>
                {card.desc}
              </p>
              <div style={{
                flex: 1, minHeight: 120, borderRadius: 14,
                backgroundSize: 'cover', backgroundPosition: 'center',
                backgroundImage: `url('${card.img}')`,
                border: '1px solid #3D3839',
                backgroundColor: '#2E2A2B',
              }} />
            </div>
          ))}
        </div>

        {/* ═══ SECURITY FOOTER ═══ */}
        <div style={{
          gridColumn: '1 / -1',
          background: '#1A1718',
          borderTop: '1px solid #3D3839',
          padding: '18px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" style={{ color: '#4A964E' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
              <span>Criptografia SSL 256-bit</span>
            </div>
            <span style={{ color: '#524D4E' }}>&bull;</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" style={{ color: '#3D8AD6' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 20h.01"/>
                <path d="M2 8.82a15 15 0 0 1 20 0"/>
                <path d="M5 12.859a10 10 0 0 1 14 0"/>
                <path d="M8.5 16.429a5 5 0 0 1 7 0"/>
              </svg>
              <span>Conexão segura</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            &copy; 2026 Grupo ALT. Todos os direitos reservados.
          </div>
        </div>

      </div>
    </div>
  )
}
