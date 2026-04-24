import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const manifest = JSON.parse(readFileSync(join(root, 'route-manifest.json'), 'utf8'))
const appSource = readFileSync(join(root, 'src', 'App.tsx'), 'utf8')
const layoutSource = readFileSync(join(root, 'src', 'layouts', 'DashboardLayout.tsx'), 'utf8')

const problems = []

for (const route of manifest.routes) {
  const appToken = `path=\"${route.path}\"`
  if (!appSource.includes(appToken)) {
    problems.push(`App.tsx missing route path ${route.path}`)
  }

  const menuKeyToken = `key: '${route.path}'`
  if (!layoutSource.includes(menuKeyToken)) {
    problems.push(`DashboardLayout.tsx missing menu key ${route.path}`)
  }

  const menuLabelToken = `label: '${route.label}'`
  if (!layoutSource.includes(menuLabelToken)) {
    problems.push(`DashboardLayout.tsx missing menu label ${route.label}`)
  }

  const menuGroupToken = `key: '${route.group}'`
  if (!layoutSource.includes(menuGroupToken)) {
    problems.push(`DashboardLayout.tsx missing menu group ${route.group}`)
  }
}

const summary = {
  routeCount: manifest.routes.length,
  checkedPaths: manifest.routes.map((route) => route.path),
  problems,
}

console.log(JSON.stringify(summary, null, 2))

if (problems.length) {
  process.exit(1)
}
