import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { collectRouteManifestProblems } from '../src/routeManifestValidator.shared.js'

const root = process.cwd()
const manifest = JSON.parse(readFileSync(join(root, 'route-manifest.json'), 'utf8'))
const appSource = readFileSync(join(root, 'src', 'App.tsx'), 'utf8')
const layoutSource = readFileSync(join(root, 'src', 'layouts', 'DashboardLayout.tsx'), 'utf8')
const registrySource = readFileSync(join(root, 'src', 'routeRegistry.tsx'), 'utf8')

const componentMapMatch = registrySource.match(/const componentByKey:[\s\S]*?=\s*\{([\s\S]*?)\n\}/)
const iconMapMatch = registrySource.match(/const iconByKey:[\s\S]*?=\s*\{([\s\S]*?)\n\}/)
const extractKeys = (block) => Array.from(block?.matchAll(/['"]?([\w-]+)['"]?\s*:/g) ?? []).map((match) => match[1])
const componentKeys = extractKeys(componentMapMatch?.[1])
const iconKeys = extractKeys(iconMapMatch?.[1])
const { duplicateRouteKeys, duplicateRoutePaths, invalidRouteGroups, missingComponentKeys, missingIconKeys, problems } = collectRouteManifestProblems({
  manifestRoutes: manifest.routes,
  componentKeys,
  iconKeys,
})

if (!registrySource.includes("from '../route-manifest.json'") && !registrySource.includes('from "../route-manifest.json"')) {
  problems.push('routeRegistry.tsx missing route-manifest.json import')
}

if (!appSource.includes('dashboardRoutes')) {
  problems.push('App.tsx missing dashboardRoutes registry usage')
}

if (!layoutSource.includes('navigationItems')) {
  problems.push('DashboardLayout.tsx missing navigationItems registry usage')
}

if (duplicateRouteKeys.length) {
  problems.push(`route-manifest.json has duplicate route keys: ${duplicateRouteKeys.join(', ')}`)
}

if (duplicateRoutePaths.length) {
  problems.push(`route-manifest.json has duplicate route paths: ${duplicateRoutePaths.join(', ')}`)
}

if (invalidRouteGroups.length) {
  problems.push(`route-manifest.json has invalid route groups: ${invalidRouteGroups.join(', ')}`)
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
  duplicateRouteKeys,
  duplicateRoutePaths,
  invalidRouteGroups,
  missingComponentKeys,
  missingIconKeys,
  problems,
}

console.log(JSON.stringify(summary, null, 2))

if (problems.length) {
  process.exit(1)
}
