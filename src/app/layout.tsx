import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { ThemeHydrator } from '@/components/ThemeHydrator'
import './globals.css'

export const metadata: Metadata = {
  title: 'Portal Grupo ALT',
  description: 'Portal corporativo do Grupo ALT — BI cinematográfico para finanças e operações.',
}

/**
 * Inline script applies the persisted theme BEFORE first paint, so
 * the user never sees a flash of the wrong theme on hard reload.
 */
const themeBootstrap = `
(function () {
  try {
    var raw = localStorage.getItem('altmax-theme');
    var mode = 'dark';
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.state && parsed.state.mode) mode = parsed.state.mode;
    }
    var root = document.documentElement;
    if (mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = mode;
  } catch (e) { /* ignore */ }
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Step 10 — Fase 4: nonce gerado pelo middleware. O Next aplica
  // automaticamente em seus scripts internos quando o request header
  // `x-nonce` está presente; aqui propagamos para o nosso script inline
  // do bootstrap de tema. Usar `headers()` força o RootLayout a ser
  // dinâmico — trade-off aceito (portal autenticado/admin/BI).
  const nonce = headers().get('x-nonce') ?? undefined

  return (
    // suppressHydrationWarning: the boot script intentionally mutates
    // <html> classList before React hydrates, which would otherwise
    // trigger a hydration warning on every page load.
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeHydrator />
        {children}
      </body>
    </html>
  )
}
