#!/usr/bin/env node
/**
 * Verifica que nenhuma credencial sensível vazou para o bundle client-side.
 * Roda após `next build` para inspecionar os arquivos em .next/static/
 */

const fs = require('fs')
const path = require('path')

const SENSITIVE_PATTERNS = [
  // Credenciais Omie
  { pattern: /OMIE_APP_KEY/gi, label: 'OMIE_APP_KEY' },
  { pattern: /OMIE_APP_SECRET/gi, label: 'OMIE_APP_SECRET' },
  { pattern: /app_secret_enc/gi, label: 'app_secret_enc' },
  // Chaves de criptografia
  { pattern: /FERNET_KEY/gi, label: 'FERNET_KEY' },
  { pattern: /ENCRYPTION_KEY/gi, label: 'ENCRYPTION_KEY' },
  { pattern: /SECRET_KEY/gi, label: 'SECRET_KEY' },
  // Database
  { pattern: /DATABASE_URL/gi, label: 'DATABASE_URL' },
  { pattern: /REDIS_URL/gi, label: 'REDIS_URL' },
  // Patterns de credenciais genéricas
  { pattern: /postgresql(\+asyncpg)?:\/\/[^"'\s]+/gi, label: 'PostgreSQL connection string' },
  { pattern: /redis:\/\/[^"'\s]+/gi, label: 'Redis connection string' },
]

// Patterns que são falsos positivos (referências em código, não valores)
const FALSE_POSITIVE_PATTERNS = [
  /NEXT_PUBLIC_/,
  /process\.env\./,
]

function getAllJsFiles(dir) {
  const results = []
  if (!fs.existsSync(dir)) return results

  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      results.push(...getAllJsFiles(fullPath))
    } else if (item.name.endsWith('.js')) {
      results.push(fullPath)
    }
  }
  return results
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const findings = []

  for (const { pattern, label } of SENSITIVE_PATTERNS) {
    const matches = content.match(pattern)
    if (matches) {
      // Filtrar falsos positivos
      const realMatches = matches.filter(m =>
        !FALSE_POSITIVE_PATTERNS.some(fp => fp.test(m))
      )
      if (realMatches.length > 0) {
        findings.push({ label, count: realMatches.length, file: filePath })
      }
    }
  }

  return findings
}

// Main
const buildDir = path.join(process.cwd(), '.next', 'static')

if (!fs.existsSync(buildDir)) {
  console.error('Diretorio .next/static nao encontrado. Execute "next build" primeiro.')
  process.exit(1)
}

const jsFiles = getAllJsFiles(buildDir)
console.log(`Verificando ${jsFiles.length} arquivos JS no bundle...`)

const allFindings = []
for (const file of jsFiles) {
  allFindings.push(...checkFile(file))
}

if (allFindings.length > 0) {
  console.error('\nCREDENCIAIS ENCONTRADAS NO BUNDLE:')
  for (const f of allFindings) {
    const relPath = path.relative(process.cwd(), f.file)
    console.error(`  ${f.label} (${f.count}x) em ${relPath}`)
  }
  console.error('\nO bundle contem credenciais sensiveis que serao expostas ao cliente!')
  process.exit(1)
} else {
  console.log('Nenhuma credencial exposta no bundle.')
}
