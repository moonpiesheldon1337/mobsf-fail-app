export type Severity = 'high' | 'warning' | 'info'
export type Verdict = 'true_positive' | 'likely_fp' | 'needs_review'
export type Status = 'pending' | 'analyzing' | 'done' | 'error'

export type Category =
  | 'code_analysis'      // MobSF code-pattern rules (logging, crypto, etc.)
  | 'manifest'           // AndroidManifest.xml issues
  | 'network_security'   // Network Security Config
  | 'permissions'        // App-declared permissions
  | 'secrets'            // Hardcoded secrets / API keys
  | 'trackers'           // Third-party trackers detected
  | 'binary_analysis'    // Native binary protections
  | 'certificate'        // Signing certificate issues
  | 'urls_emails'        // Extracted URL/email strings
  | 'generic'

export interface MobSFFinding {
  id: string
  category: Category
  ruleId: string          // e.g. "android_logging", "android:exported"
  title: string
  description: string
  severity: Severity
  cwe?: string
  owaspMobile?: string
  masvs?: string
  cvss?: number
  evidence: string        // file paths, manifest snippets, permission name, etc.
  fileLocation?: string
}

export interface AppMetadata {
  appName: string
  packageName: string
  versionName: string
  fileName: string
  appType: string         // "java" | "kotlin" | "ios" | etc.
  mobsfVersion: string
}

export interface AIVerdict {
  fp_score: number        // 0-100, higher = more likely false positive
  verdict: Verdict
  reason: string
}

export interface AnalyzedFinding extends MobSFFinding {
  status: Status
  verdict?: AIVerdict
  userOverride?: Verdict
  error?: string
}
