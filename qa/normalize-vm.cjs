/* Normaliza goals anidados (['x'], 'y']]) → plano, y level posicional → opts.
   Uso único para vm-mods-a/b. */
const fs = require('fs')

for (const p of ['src/data/servers/vm-mods-a.ts', 'src/data/servers/vm-mods-b.ts']) {
  let s = fs.readFileSync(p, 'utf8')
  // ['algo'],  |  ['algo']],  dentro de listas de goals → 'algo',
  s = s.replace(/^(\s*)\['([^'\]]+)'\]\],/gm, "$1'$2',")
  // último goal antes de ]]: 'texto']] → 'texto',
  s = s.replace(/'([^']*)'\]\]/gm, "'$1',")
  // level posicional final antes de ),  → opts
  s = s.replace(/,\n(\s*)'(beginner|intermediate|expert)'\),/g, ",\n$1{ level: '$2' }),")
  fs.writeFileSync(p, s)
  console.log('ok', p)
}
