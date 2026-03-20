'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { ChevronDown, LogOut } from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { href: '/dashboard/caixa',       label: 'Caixa Realizado' },
  { href: '/dashboard/extrato',      label: 'Extrato' },
  { href: '/dashboard/cp',           label: 'A Pagar' },
  { href: '/dashboard/fluxo',        label: 'Fluxo de Caixa' },
  { href: '/dashboard/conciliacao',  label: 'Conciliação' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, user, empresas, empresaAtiva, setEmpresaAtiva, logout } = useAuthStore()
  const [showEmpresas, setShowEmpresas] = useState(false)

  useEffect(() => {
    if (!token) router.push('/login')
    else if (pathname === '/dashboard') router.push('/dashboard/caixa')
  }, [token, router, pathname])

  if (!token) return null

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#05091A', color:'#F1F5F9' }}>
      {/* Top nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px', borderBottom:'1px solid rgba(255,255,255,.07)', background:'rgba(5,9,26,.97)', position:'sticky', top:0, zIndex:30 }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontFamily:'DM Mono, monospace', fontSize:13, color:'#fff', letterSpacing:2 }}>ALT MAX</span>
          <span style={{ fontSize:8, color:'#38BDF8', letterSpacing:3 }}>PORTAL BI</span>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,.04)', borderRadius:8, padding:3 }}>
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} style={{
              padding:'4px 12px', borderRadius:6, fontSize:10,
              color: pathname === href ? '#38BDF8' : '#64748B',
              background: pathname === href ? 'rgba(56,189,248,.12)' : 'transparent',
              fontWeight: pathname === href ? 600 : 400,
              textDecoration:'none', transition:'all .2s',
            }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Empresa + logout */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowEmpresas(!showEmpresas)}
              style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.07)', color:'#F1F5F9', fontSize:10, padding:'4px 10px', borderRadius:7, cursor:'pointer', fontFamily:'inherit' }}>
              {empresaAtiva?.nome || 'Empresa'}
              <ChevronDown size={11} style={{ transform: showEmpresas ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}/>
            </button>
            {showEmpresas && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 4px)', background:'#0a1128', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, overflow:'hidden', zIndex:50, minWidth:160 }}>
                {empresas.map(e => (
                  <button key={e.id} onClick={() => { setEmpresaAtiva(e); setShowEmpresas(false) }}
                    style={{ width:'100%', textAlign:'left', padding:'8px 12px', fontSize:10, color: empresaAtiva?.id === e.id ? '#38BDF8' : '#94A3B8', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                    {e.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { logout(); router.push('/login') }}
            style={{ display:'flex', alignItems:'center', gap:5, background:'transparent', border:'1px solid rgba(255,255,255,.07)', color:'#64748B', fontSize:10, padding:'4px 10px', borderRadius:7, cursor:'pointer', fontFamily:'inherit' }}>
            <LogOut size={11}/> Sair
          </button>
        </div>
      </nav>

      {/* Conteúdo — fullscreen sem padding para preservar o layout dos HTMLs */}
      <main style={{ flex:1, overflow:'hidden' }}>
        {children}
      </main>
    </div>
  )
}
