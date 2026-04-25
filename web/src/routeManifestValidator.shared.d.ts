export const allowedRouteGroups: string[]
export function countDuplicates(values: string[]): string[]
export function collectRouteManifestProblems(input: {
  manifestRoutes: Array<{ key: string; path: string; group: string }>
  componentKeys: string[]
  iconKeys: string[]
}): {
  duplicateRouteKeys: string[]
  duplicateRoutePaths: string[]
  invalidRouteGroups: string[]
  missingComponentKeys: string[]
  missingIconKeys: string[]
  problems: string[]
}
