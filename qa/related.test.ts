/* QA RECOMENDACIONES CONTEXTUALES: relaciones reales, enlaces válidos, sin ruido. */
import * as fsMod from 'fs'
import { SERVER_COURSES } from '../src/data/servers'
import { SECTIONS } from '../src/data/sections'

let fails = 0
const ok = (cond: boolean, label: string): void => {
  if (!cond) fails++
  console.log(`${cond ? 'ok  ' : 'FALLO'} ${label}`)
}

const courseIds = new Set(SERVER_COURSES.map((c) => c.id))
const sectionIds = new Set(SECTIONS.map((s) => s.id))

let total = 0
for (const c of SERVER_COURSES) {
  const rel = c.related ?? []
  total += rel.length
  ok(rel.length >= 2, `[${c.id}] tiene recomendaciones (${rel.length})`)
  for (const r of rel) {
    if (r.kind === 'course' && !courseIds.has(r.to)) { fails++; console.log(`FALLO [${c.id}] curso inexistente: ${r.to}`) }
    if (r.kind === 'section' && !sectionIds.has(r.to)) { fails++; console.log(`FALLO [${c.id}] sección inexistente: ${r.to}`) }
    if (r.kind === 'course' && r.to === c.id) { fails++; console.log(`FALLO [${c.id}] autorreferencia`) }
  }
  ok(true, `[${c.id}] enlaces verificados`)
  // sin duplicados
  const keys = rel.map((r) => `${r.kind}:${r.to}`)
  ok(new Set(keys).size === keys.length, `[${c.id}] sin duplicados`)
}
ok(total >= 25, `densidad de recomendaciones razonable (${total} enlaces en ${SERVER_COURSES.length} cursos)`)

/* bidireccionalidad real de pares obvios (no aleatorio): DNS↔DHCP, Samba↔NFS, Nginx↔Apache */
{
  const has = (id: string, to: string): boolean =>
    SERVER_COURSES.find((c) => c.id === id)?.related?.some((r) => r.to === to && r.kind === 'course') ?? false
  ok(has('dns', 'dhcp') && has('dhcp', 'dns'), 'DNS ↔ DHCP se recomiendan mutuamente')
  ok(has('samba', 'nfs') && has('nfs', 'samba'), 'Samba ↔ NFS se recomiendan mutuamente')
  ok(has('nginx', 'apache') && has('apache', 'nginx'), 'Nginx ↔ Apache se recomiendan mutuamente')
  ok(has('ftp', 'ssh'), 'FTP → SSH (alternativa SFTP enseñada en el curso)')
}

/* el bloque UI existe y solo se muestra con datos */
{
  const page = fsMod.readFileSync('src/pages/ServersPage.tsx', 'utf8')
  ok(page.includes('También te puede interesar'), 'bloque «💡 También te puede interesar» presente')
  ok(page.includes("if (!items.length) return null"), 'sin datos → no renderiza nada (cero ruido)')
  ok(page.includes('<RelatedBox items={course.related ?? []} />'), 'visible al final del curso')
  ok(page.includes("{result?.pass && <RelatedBox"), 'aparece justo tras superar el laboratorio')
}

console.log(fails === 0 ? '\nQA RECOMENDACIONES: TODO OK' : `\nQA RECOMENDACIONES: ${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
