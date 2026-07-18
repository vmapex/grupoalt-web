'use client'
/* ═══════════════════════════════════════════════════════════════
   /redefinir-senha?token=...[&convite=1] — define a nova senha
   (2026-07-16, companion do api#151).

   Página pública que serve DOIS fluxos com o mesmo endpoint
   (POST /auth/redefinir-senha):
   - convite=1: primeiro acesso de usuário convidado ("Defina sua senha")
   - sem convite: redefinição via "Esqueci minha senha"

   Token é single-use com TTL — 400 do backend vira mensagem com CTA
   pra pedir um novo link.

   useSearchParams exige <Suspense> no App Router (build falha sem).

   Visual (2026-07-18): alinhado à identidade do login (Daylight —
   fundo claro com grid/aurora, dourado, labels mono uppercase) via
   senha.module.css compartilhado + checklist de requisitos ao vivo
   e mostrar/ocultar em cada campo. Lógica/contrato inalterados.
   ═══════════════════════════════════════════════════════════════ */

import { Suspense, useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, Check, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import styles from '@/components/auth/senha.module.css'

const MIN_SENHA = 8

function RedefinirSenhaForm() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const isConvite = params.get('convite') === '1'

  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirma, setMostrarConfirma] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const titulo = isConvite ? 'Defina sua senha de acesso' : 'Escolha uma nova senha'
  const subtitulo = isConvite
    ? 'Bem-vindo ao Portal do Grupo ALT! Crie a senha que você usará para entrar.'
    : 'Digite a nova senha da sua conta do Portal.'

  const temMinimo = senha.length >= MIN_SENHA
  const senhasCoincidem = senha.length > 0 && senha === confirma

  const podeEnviar = !loading && temMinimo && senha === confirma && token !== ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeEnviar) return
    setLoading(true)
    setErro('')
    try {
      await api.post('/auth/redefinir-senha', { token, nova_senha: senha })
      setSucesso(true)
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response
      const detail = typeof resp?.data?.detail === 'string' ? resp.data.detail : null
      setErro(
        detail ||
          (resp?.status === 429
            ? 'Muitas tentativas. Aguarde um minuto e tente de novo.'
            : 'Não foi possível redefinir agora. Tente novamente em instantes.'),
      )
    } finally {
      setLoading(false)
    }
  }

  const requisitos = [
    { ok: temMinimo, label: `Mínimo de ${MIN_SENHA} caracteres` },
    { ok: senhasCoincidem, label: 'As senhas coincidem' },
  ]

  return (
    <main className={styles.shell}>
      {/* ─── Background canvas: aurora + grid ─── */}
      <div className={styles.bg} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orbA}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orbB}`} aria-hidden="true" />
      <div className={styles.scanline} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />

      <section className={styles.stage}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              <span>{isConvite ? 'Primeiro acesso' : 'Acesso seguro'}</span>
            </div>
            <Image
              src="/logo_grupo_alt.png"
              alt="Grupo ALT"
              className={styles.brandLogo}
              width={180}
              height={48}
              priority
            />
          </div>

          {sucesso ? (
            <div role="status">
              <div className={styles.successIcon}>
                <CheckCircle2 size={24} />
              </div>
              <h1 className={styles.title}>Senha definida!</h1>
              <p className={styles.subtext}>
                Tudo certo. Agora é só entrar com o seu e-mail e a nova senha.
              </p>
              <a href="/login" className={styles.btnPrimary} style={{ textDecoration: 'none' }}>
                Ir para o login
              </a>
            </div>
          ) : !token ? (
            <div role="alert">
              <h1 className={styles.title}>Link incompleto</h1>
              <p className={styles.subtext}>
                Este endereço não contém um código de redefinição. Abra o link exatamente
                como veio no e-mail — ou peça um novo em &quot;Esqueceu a senha?&quot;.
              </p>
              <a href="/esqueci-senha" className={styles.linkGold}>
                Pedir novo link
              </a>
            </div>
          ) : (
            <>
              <h1 className={styles.title}>{titulo}</h1>
              <p className={styles.subtext}>{subtitulo}</p>

              <form onSubmit={handleSubmit} className={styles.form} noValidate>
                {/* Nova senha */}
                <div className={styles.field}>
                  <label htmlFor="senha" className={styles.fieldLabel}>
                    Nova senha
                  </label>
                  <div className={styles.inputBlock}>
                    <input
                      id="senha"
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      className={styles.inputAction}
                      aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={mostrarSenha}
                    >
                      {mostrarSenha ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar senha */}
                <div className={styles.field}>
                  <label htmlFor="confirma" className={styles.fieldLabel}>
                    Confirmar senha
                  </label>
                  <div className={styles.inputBlock}>
                    <input
                      id="confirma"
                      type={mostrarConfirma ? 'text' : 'password'}
                      value={confirma}
                      onChange={(e) => setConfirma(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Repita a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirma((v) => !v)}
                      className={styles.inputAction}
                      aria-label={
                        mostrarConfirma ? 'Ocultar confirmação' : 'Mostrar confirmação'
                      }
                      aria-pressed={mostrarConfirma}
                    >
                      {mostrarConfirma ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Checklist de requisitos ao vivo */}
                <ul className={styles.checklist} aria-label="Requisitos da senha">
                  {requisitos.map((req) => (
                    <li
                      key={req.label}
                      className={`${styles.checkItem} ${req.ok ? styles.checkOk : ''}`}
                    >
                      <span className={styles.checkIcon} aria-hidden="true">
                        <Check size={11} strokeWidth={3} />
                      </span>
                      {req.label}
                    </li>
                  ))}
                </ul>

                {confirma.length > 0 && confirma !== senha && (
                  <p className={styles.mismatch} role="alert">
                    As senhas não coincidem.
                  </p>
                )}

                {erro && (
                  <div role="alert" aria-live="polite" className={styles.errorMsg}>
                    <AlertCircle size={15} />
                    <span>
                      {erro}
                      {!isConvite && (
                        <>
                          {' '}
                          <a href="/esqueci-senha">Pedir novo link</a>
                        </>
                      )}
                    </span>
                  </div>
                )}

                <button type="submit" disabled={!podeEnviar} className={styles.btnPrimary}>
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading
                    ? 'Salvando...'
                    : isConvite
                      ? 'Definir senha e continuar'
                      : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <footer className={styles.footer}>© 2026 Grupo ALT</footer>
    </main>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaForm />
    </Suspense>
  )
}
