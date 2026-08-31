const fs = require('fs')

// hash: related → which (que está en busqueda, no en el set porque which está en bash-shell)
{
  const p = 'src/data/cmdcenter/entries-extra.ts'
  let s = fs.readFileSync(p, 'utf8')
  s = s.replace("related: ['command', 'which'] }", "related: ['command'] }")
  s = s.replace("related: ['which', 'command'] }", "related: ['command'] }")
  // nmcli: resolvectl no es un comando de la cheatsheet → quitar
  s = s.replace("    related: ['ip', 'resolvectl'],\n", "")
  fs.writeFileSync(p, s)
}

// whereis: related → which (que sí existe como id en entries-more)
{
  const p2 = 'src/data/cmdcenter/entries-more.ts'
  let m = fs.readFileSync(p2, 'utf8')
  if (!m.includes("id: 'whereis'")) {
    // whereis ya está en extra, no en more
  }
  fs.writeFileSync(p2, m)
}
console.log('done')
