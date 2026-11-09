import { beforeEach, describe, expect, it, vi } from 'vitest'
import { agentInvocationUrl, SESSION_HEADER, streamAgentReply } from './agentClient'
import { newSessionId } from './session'
import { setAppConfig } from '../config/config'
import { jsonResponse, sseResponse, testConfig, textDeltaEvent } from '../test/fixtures'
import { TEST_ACCESS_TOKEN } from '../test/amplifyMock'

vi.mock('aws-amplify/auth', async () => {
  const { fakeAuthSession } = await import('../test/amplifyMock')
  return { fetchAuthSession: vi.fn(async () => fakeAuthSession()) }
})

async function collect(stream: AsyncGenerator<string>): Promise<string[]> {
  const chunks: string[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

describe('hrAgent client', () => {
  beforeEach(() => {
    setAppConfig(testConfig)
    vi.restoreAllMocks()
  })

  it('yields streamed text chunks in order and sends the token and session id (FR5.2)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        textDeltaEvent('Hel'),
        'data: {"event":{"messageStart":{"role":"assistant"}}}\n\n',
        textDeltaEvent('lo'),
        textDeltaEvent(' Jane'),
      ]),
    )
    const sessionId = newSessionId()

    const chunks = await collect(streamAgentReply({ prompt: 'Hi', sessionId }))

    expect(chunks).toEqual(['Hel', 'lo', ' Jane'])
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(agentInvocationUrl(testConfig))
    expect(url).toContain(encodeURIComponent(testConfig.agentRuntimeArn))
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer ${TEST_ACCESS_TOKEN}`)
    expect(headers[SESSION_HEADER]).toBe(sessionId)
    expect(sessionId.length).toBeGreaterThanOrEqual(33)
    expect(JSON.parse(init?.body as string)).toEqual({ prompt: 'Hi' })
  })

  it('raises a typed http error on a 500 (FR5.4)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ message: 'boom' }, 500))

    await expect(
      collect(streamAgentReply({ prompt: 'Hi', sessionId: newSessionId() })),
    ).rejects.toMatchObject({ name: 'AgentError', kind: 'http', status: 500 })
  })

  it('raises a typed network error when the request cannot be sent (FR5.4)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(
      collect(streamAgentReply({ prompt: 'Hi', sessionId: newSessionId() })),
    ).rejects.toMatchObject({ kind: 'network' })
  })
})
