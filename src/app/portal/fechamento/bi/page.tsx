import { redirect } from 'next/navigation'

/* Fase D: o BI do Motor ganhou shell dedicado (validação 2026-07-22) —
   esta rota viveu por um dia dentro do módulo do Motor; redireciona
   permanentemente pra casa nova. */
export default function BiMotorRedirect() {
  redirect('/bi/motor')
}
