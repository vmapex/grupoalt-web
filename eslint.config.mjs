// Flat config (ESLint 9 + eslint-config-next 16). Substitui o
// .eslintrc.json legado (removido no PR-4 / Next 16). `next lint`
// foi removido no Next 16 — o script `lint` agora chama `eslint .`.
//
// Espalhamos APENAS o array nativo `eslint-config-next/core-web-vitals`,
// espelhando o .eslintrc.json original (que estendia SOMENTE
// "next/core-web-vitals"). NÃO adotamos `eslint-config-next/typescript`
// aqui: o repo nunca aplicou as regras typescript-eslint (no-explicit-any,
// no-require-imports etc.) — ligá-las agora seria um escopo próprio
// (cleanup dedicado), não parte do upgrade de framework. Preservamos o
// comportamento de lint pré-existente: só warnings, CI verde.
//
// O objeto de regras customizadas vem DEPOIS (flat config: objetos
// posteriores sobrescrevem) para preservar o ban do barrel @/hooks/useAPI.
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // exhaustive-deps já era 'warn' na baseline (~47 warnings). Mantido.
      'react-hooks/exhaustive-deps': 'warn',
      // Regras NOVAS do React Compiler trazidas pelo eslint-plugin-react-hooks@7
      // (via core-web-vitals do config-next@16). São advisory de performance /
      // prontidão p/ o compiler, não bugs de correção. Ficam em 'warn' (CI não
      // falha em warnings) p/ tratamento incremental — mesmo critério do
      // exhaustive-deps. `react-hooks/rules-of-hooks` (correção real) permanece
      // 'error' (herdado do core-web-vitals, não rebaixado aqui).
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/use-memo': 'warn',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/hooks/useAPI', '@/hooks/useAPI/*', '**/hooks/useAPI', '**/hooks/useAPI/*'],
              message:
                'O barrel @/hooks/useAPI foi removido em 2026-05-24 (PR #154). Importe direto do dominio em @/hooks/api/<modulo> (useExtrato, useCPCR, useFluxo, useConciliacao, useNotificacoes, useCategoriasAPI, useContasBancarias, useOrbitAudit, useAdminEmpresas, _core, useSaldos).',
            },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', '.next/dev/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts']),
])

export default eslintConfig
