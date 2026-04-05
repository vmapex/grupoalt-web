'use client'
import { redirect } from 'next/navigation'
export default function ProcessosPage() {
  redirect('/portal/documentos?categoria=processo')
}
