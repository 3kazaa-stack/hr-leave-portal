import { describe, expect, it, vi } from 'vitest'
import { ConfigError, loadConfig, parseConfig } from './config'
import { jsonResponse, testConfig } from '../test/fixtures'

describe('runtime config (FR7.3)', () => {
  it('loads a valid config.json', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ ...testConfig, apiUrl: `${testConfig.apiUrl}/` }),
    )

    const config = await loadConfig(fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith('/config.json', { cache: 'no-store' })
    expect(config).toEqual(testConfig)
  })

  it('throws a readable error naming a missing field', () => {
    const withoutPool: Record<string, string> = { ...testConfig }
    delete withoutPool.userPoolId

    expect(() => parseConfig(withoutPool)).toThrow(ConfigError)
    expect(() => parseConfig(withoutPool)).toThrow(/missing required field\(s\): userPoolId/)
  })

  it('reports a config.json that cannot be downloaded', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 404 }))

    await expect(loadConfig(fetchImpl)).rejects.toThrow(/HTTP 404/)
  })
})
