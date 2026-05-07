'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import styles from './login.module.css'

type Pillar = {
  label: string
  title: string
  accent: string
  img: string
  desc?: string
  bullets?: { name: string; desc: string }[]
}

const PILLARS: Pillar[] = [
  {
    label: 'Nossa Missão',
    title: 'Gerar valor em toda a cadeia bovina',
    accent: 'cadeia bovina',
    desc: 'Da alimentação à biotecnologia — levando excelência e inovação ao mercado global.',
    img: '/missao.jpeg',
  },
  {
    label: 'Nossa Visão',
    title: 'Ultrapassar R$ 150 milhões em 2 anos',
    accent: 'R$ 150 milhões',
    desc: 'Em faturamento — construindo uma operação sólida, sustentável e em crescimento consistente.',
    img: '/visao.jpg',
  },
  {
    label: 'Nossos Valores',
    title: 'O que nos move todos os dias',
    accent: 'todos os dias',
    img: '/valores.jpg',
    bullets: [
      {
        name: 'Respeito',
        desc: 'Trato todos com respeito — colegas, motoristas, gestores e clientes — independente de cargo ou função.',
      },
      {
        name: 'Cabeça de Dono',
        desc: 'Ajo como se a empresa fosse minha — cuido, decido bem e não espero alguém mandar.',
      },
      {
        name: 'Ética',
        desc: 'Ajo com integridade e transparência, cumpro o que prometo e construo relações sólidas baseadas no que é certo — sempre.',
      },
    ],
  },
]

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

      {/* ─── Stage with main card ─── */}
      <section className={styles.stage}>
        <div className={styles.card}>
          {/* ── LEFT: form ── */}
          <div className={styles.formPane}>
            <div className={styles.formPaneGlow} aria-hidden="true" />

            <div className={styles.formHeader}>
              <div className={styles.eyebrow}>
                <span className={styles.eyebrowDot} aria-hidden="true" />
                <span>Identifique-se</span>
              </div>
              <img
                src="/logo_grupo_alt.png"
                alt="Grupo ALT — Portal Corporativo"
                className={styles.brandLogo}
              />
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

              {pillar.bullets ? (
                <ul className={styles.pillarValues} key={pillar.label}>
                  {pillar.bullets.map((b, idx) => (
                    <li key={b.name} className={styles.valueItem}>
                      <span className={styles.valueIndex} aria-hidden="true">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className={styles.valueBody}>
                        <h3 className={styles.valueName}>{b.name}</h3>
                        <p className={styles.valueDesc}>{b.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.pillarDesc} key={pillar.desc}>
                  {pillar.desc}
                </p>
              )}

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

      {/* ─── Footer (apenas copyright) ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>© 2026 Grupo ALT</span>
        </div>
      </footer>
    </main>
  )
}
