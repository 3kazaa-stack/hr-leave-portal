// Runtime configuration read from /config.json at start-up (FR7.3).
// The UI deployment stack writes this file next to the build, so one build works in any account.

export interface AppConfig {
  region: string
  apiUrl: string
  userPoolId: string
  userPoolClientId: string
  agentRuntimeArn: string
}

const REQUIRED_FIELDS: (keyof AppConfig)[] = [
  'region',
  'apiUrl',
  'userPoolId',
  'userPoolClientId',
  'agentRuntimeArn',
]

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

function isAllowedApiUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.hostname === 'localhost'
  } catch {
    return false
  }
}

export function parseConfig(raw: unknown): AppConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ConfigError('config.json must contain a JSON object.')
  }
  const record = raw as Record<string, unknown>
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = record[field]
    return typeof value !== 'string' || value.trim() === ''
  })
  if (missing.length > 0) {
    throw new ConfigError(`config.json is missing required field(s): ${missing.join(', ')}.`)
  }
  const apiUrl = (record.apiUrl as string).trim()
  if (!isAllowedApiUrl(apiUrl)) {
    throw new ConfigError('config.json field apiUrl must be an https:// URL.')
  }
  return {
    region: (record.region as string).trim(),
    apiUrl: apiUrl.replace(/\/+$/, ''),
    userPoolId: (record.userPoolId as string).trim(),
    userPoolClientId: (record.userPoolClientId as string).trim(),
    agentRuntimeArn: (record.agentRuntimeArn as string).trim(),
  }
}

export async function loadConfig(
  fetchImpl: typeof fetch = fetch,
  url = '/config.json',
): Promise<AppConfig> {
  let response: Response
  try {
    response = await fetchImpl(url, { cache: 'no-store' })
  } catch (error) {
    throw new ConfigError(`Could not download ${url}: ${(error as Error).message}`)
  }
  if (!response.ok) {
    throw new ConfigError(`Could not download ${url} (HTTP ${response.status}).`)
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ConfigError(`${url} is not valid JSON.`)
  }
  return parseConfig(body)
}

let activeConfig: AppConfig | null = null

export function setAppConfig(config: AppConfig): void {
  activeConfig = config
}

export function getAppConfig(): AppConfig {
  if (activeConfig === null) {
    throw new ConfigError('The app configuration has not been loaded yet.')
  }
  return activeConfig
}
