'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import styles from './login.module.css'

const PILLARS = [
  {
    label: 'Nossa Missão',
    title: 'Conectar o agro ao futuro',
    accent: 'futuro',
    desc: 'Soluções logísticas e operacionais que impulsionam o agronegócio brasileiro com excelência, segurança e compromisso socioambiental.',
    img: '/missao.jpeg',
  },
  {
    label: 'Nossa Visão',
    title: 'Referência em logística agro',
    accent: 'logística agro',
    desc: 'Ser reconhecida como a principal parceira logística do agronegócio no Brasil, inovando continuamente para superar expectativas.',
    img: '/visao.jpg',
  },
  {
    label: 'Nossos Valores',
    title: 'O que nos move todos os dias',
    accent: 'todos os dias',
    desc: 'Integridade, trabalho em equipe, comprometimento com resultados e respeito às pessoas e ao meio ambiente.',
    img: '/valores.jpg',
  },
] as const

const ROTATE_MS = 6000

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePillar, setActivePillar] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setActivePillar((prev) => (prev + 1) % PILLARS.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      const meRes = await api.get('/auth/me')
      const me = meRes.data

      setAuth(
        { id: me.id, nome: me.nome, email: me.email, is_admin: me.is_admin },
        me.empresas || [],
        me.grupos || [],
        me.permissoes || [],
      )
      router.push('/portal')
    } catch (err: any) {
      if (err?.response?.status === 400 || err?.response?.status === 401) {
        setError('E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.')
      } else if (err?.code === 'ERR_NETWORK') {
        setError('Erro de conexão com o servidor. Verifique sua internet.')
      } else {
        const detail =
          err?.response?.data?.detail || err?.message || 'Erro desconhecido'
        setError(`Erro ao fazer login: ${detail}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const pillar = PILLARS[activePillar]

  return (
    <main className={styles.shell}>
      {/* ─── Background canvas: aurora + grid ─── */}
      <div className={styles.bg} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orbA}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orbB}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orbC}`} aria-hidden="true" />
      <div className={styles.scanline} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />

      {/* ─── Cinematic frame corners ─── */}
      <div className={`${styles.corner} ${styles.cornerTL}`} aria-hidden="true" />
      <div className={`${styles.corner} ${styles.cornerTR}`} aria-hidden="true" />
      <div className={`${styles.corner} ${styles.cornerBL}`} aria-hidden="true" />
      <div className={`${styles.corner} ${styles.cornerBR}`} aria-hidden="true" />

      {/* ─── Header ─── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <div className={styles.brandMark} aria-hidden="true">
              A
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>Grupo ALT</span>
              <span className={styles.brandTag}>Portal Corporativo</span>
            </div>
          </div>

          <div className={styles.headerEyebrow}>
            <span className={styles.headerEyebrowDot} aria-hidden="true" />
            <span>Acesso seguro · v3.0</span>
          </div>
        </div>
      </header>

      {/* ─── Stage with main card ─── */}
      <section className={styles.stage}>
        <div className={styles.card}>
          {/* ── LEFT: form ── */}
          <div className={styles.formPane}>
            <div className={styles.formPaneGlow} aria-hidden="true" />

            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              <span>Identifique-se</span>
            </div>

            <h1 className={styles.headline}>
              Bem-vindo ao seu{' '}
              <span className={styles.headlineAccent}>portal profissional.</span>
            </h1>

            <p className={styles.subhead}>
              Acesse o ecossistema digital do <strong>Grupo ALT</strong> — indicadores em
              tempo real, operações, logística e tudo o que você precisa para conduzir suas
              frentes de negócio em um único lugar.
            </p>

            <form onSubmit={handleLogin} className={styles.form} noValidate>
              {/* Email */}
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="email">
                  E-mail corporativo
                </label>
                <div className={styles.inputBlock}>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="seu.nome@grupoalt.com.br"
                  />
                  <span className={styles.inputIcon} aria-hidden="true">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Senha */}
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="password">
                  Senha
                </label>
                <div className={styles.inputBlock}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={styles.inputAction}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className={styles.errorMsg} role="alert" aria-live="polite">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Meta row */}
              <div className={styles.formMeta}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span className={styles.checkboxBox} aria-hidden="true" />
                  <span className={styles.checkboxLabel}>Lembrar de mim</span>
                </label>
                <a href="#" className={styles.linkGhost}>
                  Esqueceu a senha?
                </a>
              </div>

              {/* Primary action */}
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? (
                  <>
                    <span className={styles.btnLabel}>Autenticando</span>
                    <span className={styles.btnDots} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </>
                ) : (
                  <>
                    <span className={styles.btnLabel}>Entrar no Portal</span>
                    <svg
                      className={styles.btnArrow}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className={styles.divider}>
              <span className={styles.dividerLine} aria-hidden="true" />
              <span className={styles.dividerText}>OU</span>
              <span className={styles.dividerLine} aria-hidden="true" />
            </div>

            <p className={styles.firstAccess}>
              <span>Primeiro acesso?</span>
              <a href="#" className={styles.linkGold}>
                Solicite suas credenciais
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            </p>
          </div>

          {/* ── RIGHT: brand showcase ── */}
          <aside className={styles.brandPane} aria-label="Identidade Grupo ALT">
            <div className={styles.brandHairline} aria-hidden="true" />

            <div className={styles.pillarStage} aria-hidden="true">
              {PILLARS.map((p, i) => (
                <div
                  key={p.label}
                  className={styles.pillar}
                  data-active={activePillar === i}
                  style={{ backgroundImage: `url('${p.img}')` }}
                />
              ))}
              <div className={styles.pillarOverlay} />
              <div className={styles.pillarGrid} />
            </div>

            {/* Pillar copy + nav */}
            <div className={styles.pillarContent}>
              <div className={styles.pillarEyebrow}>
                <span className={styles.eyebrowDot} aria-hidden="true" />
                {pillar.label}
              </div>
              <h2 className={styles.pillarTitle} key={pillar.title}>
                {pillar.title.split(pillar.accent)[0]}
                <span className={styles.accent}>{pillar.accent}</span>
                {pillar.title.split(pillar.accent)[1]}
              </h2>
              <p className={styles.pillarDesc} key={pillar.desc}>
                {pillar.desc}
              </p>

              <div
                className={styles.pillarNav}
                role="tablist"
                aria-label="Pilares institucionais"
              >
                {PILLARS.map((p, i) => (
                  <button
                    key={p.label}
                    type="button"
                    role="tab"
                    aria-selected={activePillar === i}
                    aria-label={`Mostrar ${p.label}`}
                    className={styles.pillarDot}
                    data-active={activePillar === i}
                    onClick={() => setActivePillar(i)}
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <span className={styles.footerItem}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#84C487"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              SSL/TLS 256-bit
            </span>
            <span className={styles.footerSep} aria-hidden="true">
              ·
            </span>
            <span className={styles.footerItem}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3D8AD6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="m7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              LGPD compliant
            </span>
            <span className={styles.footerSep} aria-hidden="true">
              ·
            </span>
            <span className={styles.footerItem}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EBCF5C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20h.01" />
                <path d="M2 8.82a15 15 0 0 1 20 0" />
                <path d="M5 12.859a10 10 0 0 1 14 0" />
                <path d="M8.5 16.429a5 5 0 0 1 7 0" />
              </svg>
              Conexão segura
            </span>
          </div>
          <div className={styles.footerRight}>
            <span>© 2026 Grupo ALT</span>
            <span className={styles.footerVersion}>
              v3.0 · cinematic
            </span>
          </div>
        </div>
      </footer>
    </main>
  )
}
