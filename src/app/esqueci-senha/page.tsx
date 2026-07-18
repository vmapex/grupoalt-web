'use client'
/* ═══════════════════════════════════════════════════════════════
   /esqueci-senha — solicita o link de redefinição por e-mail
   (2026-07-16, companion do api#151).

   Página pública. O backend responde SEMPRE 200 com mensagem genérica
   (anti-enumeração) — a UI reflete isso: depois do envio, mostra a
   mesma confirmação exista o e-mail ou não.

   Visual (2026-07-18): alinhado à identidade do login (Daylight —
   fundo claro com grid/aurora, dourado, labels mono uppercase) via
   senha.module.css compartilhado. Lógica/contrato inalterados.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react'
import Image from 'next/image'
import { AlertCircle, ArrowLeft, Loader2, Mail, MailCheck } from 'lucide-react'
import api from '@/lib/api'
import styles from '@/components/auth/senha.module.css'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || !email.trim()) return
    setLoading(true)
    setErro('')
    try {
      await api.post('/auth/esqueci-senha', { email: email.trim() })
      setEnviado(true)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setErro(
        status === 429
          ? 'Muitas tentativas. Aguarde um minuto e tente de novo.'
          : 'Não foi possível processar agora. Tente novamente em instantes.',
      )
    } finally {
      setLoading(false)
    }
  }

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
              <span>Recuperar acesso</span>
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

          {enviado ? (
            <div role="status">
              <div className={styles.successIcon}>
                <MailCheck size={24} />
              </div>
              <h1 className={styles.title}>Verifique seu e-mail</h1>
              <p className={styles.subtext}>
                Se <strong>{email.trim()}</strong> estiver cadastrado, você receberá as
                instruções de redefinição em instantes. O link vale por{' '}
                <strong>60 minutos</strong>.
              </p>
              <div className={styles.backRow}>
                <a href="/login" className={styles.linkGold}>
                  <ArrowLeft size={14} /> Voltar ao login
                </a>
              </div>
            </div>
          ) : (
            <>
              <h1 className={styles.title}>Esqueceu sua senha?</h1>
              <p className={styles.subtext}>
                Informe o e-mail cadastrado e enviaremos um link para você escolher uma
                nova senha.
              </p>

              <form onSubmit={handleSubmit} className={styles.form} noValidate>
                <div className={styles.field}>
                  <label htmlFor="email" className={styles.fieldLabel}>
                    E-mail corporativo
                  </label>
                  <div className={styles.inputBlock}>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="seu.nome@grupoalt.agr.br"
                    />
                    <span className={styles.inputIcon} aria-hidden="true">
                      <Mail size={17} />
                    </span>
                  </div>
                </div>

                {erro && (
                  <div role="alert" aria-live="polite" className={styles.errorMsg}>
                    <AlertCircle size={15} />
                    <span>{erro}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className={styles.btnPrimary}
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>

              <div className={styles.backRow}>
                <a href="/login" className={styles.linkGold}>
                  <ArrowLeft size={14} /> Voltar ao login
                </a>
              </div>
            </>
          )}
        </div>
      </section>

      <footer className={styles.footer}>© 2026 Grupo ALT</footer>
    </main>
  )
}
