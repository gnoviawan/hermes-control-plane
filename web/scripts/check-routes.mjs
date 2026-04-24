import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const manifest = JSON.parse(readFileSync(join(root, 'route-manifest.json'), 'utf8'))
const appSource = readFileSync(join(root, 'src', 'App.tsx'), 'utf8')
const layoutSource = readFileSync(join(root, 'src', 'layouts', 'DashboardLayout.tsx'), 'utf8')
const registrySource = readFileSync(join(root, 'src', 'routeRegistry.tsx'), 'utf8')

const problems = []

if (!registrySource.includes("from '../route-manifest.json'") && !registrySource.includes('from "../route-manifest.json"')) {
  problems.push('routeRegistry.tsx missing route-manifest.json import')
}

if (!appSource.includes('dashboardRoutes')) {
  problems.push('App.tsx missing dashboardRoutes registry usage')
}

if (!layoutSource.includes('navigationItems')) {
  problems.push('DashboardLayout.tsx missing navigationItems registry usage')
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
