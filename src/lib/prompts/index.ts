import type { MobSFFinding, AppMetadata } from '../../types'
import { codeAnalysisSystem, codeAnalysisUser } from './codeAnalysis'
import { manifestSystem, manifestUser } from './manifest'
import { permissionsSystem, permissionsUser } from './permissions'
import { secretsSystem, secretsUser } from './secrets'
import { networkSecuritySystem, networkSecurityUser } from './networkSecurity'
import { genericSystem, genericUser } from './generic'

export interface PromptPair {
  system: string
  user: string
}

/**
 * Returns the system + user prompt pair for this finding's category.
 * Some prompts use app metadata (e.g. permissions needs to know what
 * the app does to judge whether a permission is justified).
 */
export function buildPrompt(
  finding: MobSFFinding,
  metadata: AppMetadata
): PromptPair {
  switch (finding.category) {
    case 'code_analysis':
      return { system: codeAnalysisSystem, user: codeAnalysisUser(finding) }
    case 'manifest':
      return { system: manifestSystem, user: manifestUser(finding) }
    case 'permissions':
      return {
        system: permissionsSystem,
        user: permissionsUser(finding, metadata.appName, metadata.packageName),
      }
    case 'secrets':
      return { system: secretsSystem, user: secretsUser(finding) }
    case 'network_security':
      return { system: networkSecuritySystem, user: networkSecurityUser(finding) }
    default:
      return { system: genericSystem, user: genericUser(finding) }
  }
}
