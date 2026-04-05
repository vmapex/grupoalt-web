'use client'
import { redirect } from 'next/navigation'
export default function PoliticasPage() {
  redirect('/portal/documentos?categoria=politica')
}
