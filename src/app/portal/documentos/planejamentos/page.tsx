'use client'
import { redirect } from 'next/navigation'
export default function PlanejamentosPage() {
  redirect('/portal/documentos?categoria=planejamento')
}
