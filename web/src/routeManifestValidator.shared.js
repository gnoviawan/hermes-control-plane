export const allowedRouteGroups = ['control-group', 'settings-group']

export const countDuplicates = (values) =>
  values.filter((value, index) => values.indexOf(value) !== index).filter((value, index, items) => items.indexOf(value) === index)

export const collectRouteManifestProblems = ({ manifestRoutes, componentKeys, iconKeys }) => {
  const duplicateRouteKeys = countDuplicates(manifestRoutes.map((route) => route.key))
  const duplicateRoutePaths = countDuplicates(manifestRoutes.map((route) => route.path))
  const invalidRouteGroups = manifestRoutes
    .map((route) => route.group)
    .filter((group, index, groups) => !allowedRouteGroups.includes(group) && groups.indexOf(group) === index)
  const missingComponentKeys = manifestRoutes.filter((route) => !componentKeys.includes(route.key)).map((route) => route.key)
  const missingIconKeys = manifestRoutes.filter((route) => route.key !== 'overview' && !iconKeys.includes(route.key)).map((route) => route.key)

  return {
    duplicateRouteKeys,
    duplicateRoutePaths,
    invalidRouteGroups,
    missingComponentKeys,
    missingIconKeys,
    problems: [
      ...(duplicateRouteKeys.length ? [`duplicate route keys: ${duplicateRouteKeys.join(', ')}`] : []),
      ...(duplicateRoutePaths.length ? [`duplicate route paths: ${duplicateRoutePaths.join(', ')}`] : []),
      ...(invalidRouteGroups.length ? [`invalid route groups: ${invalidRouteGroups.join(', ')}`] : []),
      ...(missingComponentKeys.length ? [`missing component mappings for: ${missingComponentKeys.join(', ')}`] : []),
      ...(missingIconKeys.length ? [`missing icon mappings for: ${missingIconKeys.join(', ')}`] : []),
    ],
  }
}
