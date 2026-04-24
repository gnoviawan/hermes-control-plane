import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const manifest = JSON.parse(readFileSync(join(root, 'route-manifest.json'), 'utf8'))
const appSource = readFileSync(join(root, 'src', 'App.tsx'), 'utf8')
const layoutSource = readFileSync(join(root, 'src', 'layouts', 'DashboardLayout.tsx'), 'utf8')
const registrySource = readFileSync(join(root, 'src', 'routeRegistry.tsx'), 'utf8')

const componentMapMatch = registrySource.match(/const componentByKey:[\s\S]*?=\s*\{([\s\S]*?)\n\}/)
const iconMapMatch = registrySource.match(/const iconByKey:[\s\S]*?=\s*\{([\s\S]*?)\n\}/)
const extractKeys = (block) => Array.from(block?.matchAll(/['"]?([\w-]+)['"]?\s*:/g) ?? []).map((match) => match[1])
const componentKeys = new Set(extractKeys(componentMapMatch?.[1]))
const iconKeys = new Set(extractKeys(iconMapMatch?.[1]))
const manifestKeys = manifest.routes.map((route) => route.key)
const missingComponentKeys = manifestKeys.filter((key) => !componentKeys.has(key))
const missingIconKeys = manifestKeys.filter((key) => key !== 'overview' && !iconKeys.has(key))

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

if (missingComponentKeys.length) {
  problems.push(`routeRegistry.tsx missing component mappings for: ${missingComponentKeys.join(', ')}`)
}

if (missingIconKeys.length) {
  problems.push(`routeRegistry.tsx missing icon mappings for: ${missingIconKeys.join(', ')}`)
}

const summary = {
  routeCount: manifest.routes.length,
  checkedPaths: manifest.routes.map((route) => route.path),
  missingComponentKeys,
  missingIconKeys,
  problems,
}

console.log(JSON.stringify(summary, null, 2))

if (problems.length) {
  process.exit(1)
}
