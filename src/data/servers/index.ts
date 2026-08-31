import type { ServerCourse, ServerModule } from './types'
import { dnsCourse } from './dns'
import { dhcpCourse } from './dhcp'
import { ftpCourse } from './ftp'
import { sshCourse } from './ssh'
import { nginxCourse } from './nginx'
import { apacheCourse } from './apache'
import { sambaCourse } from './samba'
import { nfsCourse } from './nfs'
import { vmCourse } from './vm'

export const SERVER_COURSES: ServerCourse[] = [
  vmCourse,
  sshCourse,
  nginxCourse,
  dnsCourse,
  dhcpCourse,
  ftpCourse,
  apacheCourse,
  sambaCourse,
  nfsCourse,
]

export const COURSE_MAP = new Map(SERVER_COURSES.map((c) => [c.id, c]))

export function getServerCourse(id?: string): ServerCourse | undefined {
  if (!id) return undefined
  return COURSE_MAP.get(id)
}

export function getServerModule(courseId: string, moduleId?: string) {
  const course = getServerCourse(courseId)
  if (!course || !moduleId) return undefined
  if (moduleId === 'laboratorio') return undefined // usar la ruta /lab
  return course.modules.find((m) => m.id === moduleId)
}

export function serverModuleDoneId(courseId: string, moduleId: string): string {
  return `srv:${courseId}/${moduleId}`
}

export function serverLabDoneId(courseId: string): string {
  return `srvlab:${courseId}`
}

/** los cursos incluyen un módulo-marcador 'laboratorio'; el contenido real vive en course.lab */
function isLabPlaceholder(m: ServerModule): boolean {
  return m.id === 'laboratorio'
}

export function realModules(course: ServerCourse): ServerModule[] {
  return course.modules.filter((m) => !isLabPlaceholder(m))
}

export function courseProgress(
  course: ServerCourse,
  isDone: (id: string) => boolean,
): { done: number; total: number; pct: number } {
  const mods = realModules(course)
  const total = mods.length + 1 // +1 laboratorio
  let done = 0
  for (const m of mods) if (isDone(serverModuleDoneId(course.id, m.id))) done++
  if (isDone(serverLabDoneId(course.id))) done++
  return { done, total, pct: Math.round((done / total) * 100) }
}

/** primer módulo sin completar; null si solo queda el laboratorio o todo está hecho */
export function nextPendingModule(course: ServerCourse, isDone: (id: string) => boolean) {
  for (const m of realModules(course)) {
    if (!isDone(serverModuleDoneId(course.id, m.id))) return m
  }
  return null
}
