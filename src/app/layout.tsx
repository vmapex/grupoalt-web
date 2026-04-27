import type { Metadata } from 'next'
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
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
