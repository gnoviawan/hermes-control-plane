import { allowedRouteGroups as sharedAllowedRouteGroups, collectRouteManifestProblems as sharedCollectRouteManifestProblems, countDuplicates as sharedCountDuplicates } from './routeManifestValidator.shared.js'

export const allowedRouteGroups = sharedAllowedRouteGroups
export const countDuplicates = sharedCountDuplicates
export const collectRouteManifestProblems = sharedCollectRouteManifestProblems

export const sharedRouteManifestProblemKeys = [
  'duplicateRouteKeys',
  'duplicateRoutePaths',
  'invalidRouteGroups',
  'missingComponentKeys',
  'missingIconKeys',
]
