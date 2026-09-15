import type { Challenge } from './types'

/* Un reto por categoría, con preguntas en dificultad progresiva.
   Completar = acertar todas al menos una vez (se deriva del registro). */

export const CHALLENGES: Challenge[] = [
  { id: 'ch-linux', title: 'Fundamentos Linux', cat: 'linux', sectionId: 'terminal', questions: ['lx-01', 'lx-02', 'lx-03', 'lx-04'] },
  { id: 'ch-bash', title: 'Pipes y shell', cat: 'bash', sectionId: 'bash', questions: ['sh-01', 'sh-02', 'sh-04', 'sh-03'] },
  { id: 'ch-redes', title: 'Cómo se mueve un paquete', cat: 'redes', sectionId: 'net-fundamentos', questions: ['net-02', 'net-03', 'net-01', 'net-04'] },
  { id: 'ch-ipv4', title: 'Leer direcciones IPv4', cat: 'ipv4', sectionId: 'net-ipv4', questions: ['ip4-01', 'ip4-02', 'ip4-03', 'ip4-04'] },
  { id: 'ch-subnet', title: 'Subnetting esencial', cat: 'subnetting', sectionId: 'net-ipv4', questions: ['sub-01', 'sub-02', 'sub-05', 'sub-03', 'sub-04'] },
  { id: 'ch-vlsm', title: 'Diseño VLSM', cat: 'vlsm', sectionId: 'net-ipv4', questions: ['vlsm-01', 'vlsm-02', 'vlsm-03'] },
  { id: 'ch-ipv6', title: 'IPv6 sin miedo', cat: 'ipv6', sectionId: 'net-ipv6', questions: ['ip6-01', 'ip6-02', 'ip6-03'] },
  { id: 'ch-vlan', title: 'VLAN y trunks', cat: 'vlan', sectionId: 'net-switching', questions: ['vlan-01', 'vlan-02', 'vlan-03'] },
  { id: 'ch-stp', title: 'Spanning Tree', cat: 'stp', sectionId: 'net-stp', questions: ['stp-01', 'stp-02', 'stp-03', 'stp-04'] },
  { id: 'ch-routing', title: 'Tablas y rutas', cat: 'routing', sectionId: 'net-routing', questions: ['rt-04', 'rt-01', 'rt-02', 'rt-03'] },
  { id: 'ch-ospf', title: 'OSPF por dentro', cat: 'ospf', sectionId: 'net-ospf', questions: ['ospf-01', 'ospf-02', 'ospf-03', 'ospf-04'] },
  { id: 'ch-bgp', title: 'BGP decide', cat: 'bgp', sectionId: 'net-bgp', questions: ['bgp-04', 'bgp-03', 'bgp-01', 'bgp-02'] },
  { id: 'ch-nat', title: 'NAT y PAT', cat: 'nat', sectionId: 'net-nat', questions: ['nat-03', 'nat-01', 'nat-02'] },
  { id: 'ch-databases', title: 'Fundamentos BD', cat: 'databases', sectionId: 'db-fundamentos', questions: ['db-01', 'db-02', 'db-03', 'db-05', 'db-04'] },
  { id: 'ch-sql', title: 'SQL esencial', cat: 'sql', sectionId: 'db-sql', questions: ['sql-01', 'sql-02', 'sql-03', 'sql-05', 'sql-04'] },
  { id: 'ch-modeling', title: 'Modelar y normalizar', cat: 'modeling', sectionId: 'db-modelado', questions: ['mod-04', 'mod-01', 'mod-02', 'mod-03', 'mod-05'] },
  { id: 'ch-postgres', title: 'PostgreSQL práctico', cat: 'postgresql', sectionId: 'db-postgresql', questions: ['pg-01', 'pg-02', 'pg-03', 'pg-04', 'pg-05'] },
  { id: 'ch-mariadb', title: 'MariaDB práctico', cat: 'mariadb', sectionId: 'db-mariadb', questions: ['ma-04', 'ma-01', 'ma-02', 'ma-03', 'ma-05'] },
  { id: 'ch-dbsec', title: 'Blindar la BD', cat: 'dbsec', sectionId: 'db-seguridad', questions: ['dbs-04', 'dbs-05', 'dbs-01', 'dbs-02', 'dbs-03'] },
]

export const CHALLENGE_MAP = new Map(CHALLENGES.map((c) => [c.id, c]))
