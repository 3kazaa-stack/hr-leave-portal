import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatPanel } from './ChatPanel'
import { SESSION_HEADER } from '../agent/agentClient'
import { onDataChanged } from '../api/dataEvents'
import { setAppConfig } from '../config/config'
import { sseResponse, testConfig, textDeltaEvent } from '../test/fixtures'
import { renderWithProviders } from '../test/render'

vi.mock('aws-amplify/auth', async () => {
  const { fakeAuthSession } = await import('../test/amplifyMock')
  return { fetchAuthSession: vi.fn(async () => fakeAuthSession()) }
})

function controlledStream() {
  const encoder = new TextEncoder()
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const stream = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value
    },
  })
  return {
    response: new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }),
    push: (line: string) => controller.enqueue(encoder.encode(line)),
    close: () => controller.close(),
  }
}

function sessionIdOf(call: Parameters<typeof fetch>): string {
  return (call[1]?.headers as Record<string, string>)[SESSION_HEADER]
}

async function sendMessage(text: string) {
  await userEvent.type(screen.getByTestId('chat-input'), text)
  await userEvent.click(screen.getByTestId('chat-send-button'))
}

describe('ChatPanel', () => {
  beforeEach(() => {
    setAppConfig(testConfig)
    vi.restoreAllMocks()
  })

  it('FR5.2/FR5.6: shows streamed text before the reply ends, then signals a data change', async () => {
    const stream = controlledStream()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(stream.response)
    const dataChanged = vi.fn()
    const unsubscribe = onDataChanged(dataChanged)
    renderWithProviders(<ChatPanel open onClose={() => {}} />)

    await sendMessage('Who joined in January?')
    stream.push(textDeltaEvent('Jane Doe '))

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByTestId('chat-pending')).toBeInTheDocument()
    expect(dataChanged).not.toHaveBeenCalled()

    stream.push(textDeltaEvent('joined on 15 January.'))
    stream.close()

    expect(await screen.findByText('Jane Doe joined on 15 January.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('chat-pending')).not.toBeInTheDocument())
    expect(dataChanged).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('FR5.3: "New conversation" clears the panel and uses a new session id', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => sseResponse([textDeltaEvent('Done.')]))
    renderWithProviders(<ChatPanel open onClose={() => {}} />)

    await sendMessage('First question')
    await screen.findByText('Done.')
    await sendMessage('Second question')
    await waitFor(() => expect(screen.getAllByText('Done.')).toHaveLength(2))

    await userEvent.click(screen.getByTestId('chat-new-conversation-button'))
    expect(screen.queryByText('First question')).not.toBeInTheDocument()
    await sendMessage('Third question')
    await screen.findByText('Done.')

    const [first, second, third] = fetchSpy.mock.calls.map(sessionIdOf)
    expect(second).toBe(first)
    expect(third).not.toBe(first)
    expect(third.length).toBeGreaterThanOrEqual(33)
  })

  it('FR5.4: shows an error with Retry when the agent call fails', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 502 }))
      .mockResolvedValueOnce(sseResponse([textDeltaEvent('Recovered.')]))
    renderWithProviders(<ChatPanel open onClose={() => {}} />)

    await sendMessage('Hello')
    expect(await screen.findByTestId('chat-error')).toHaveTextContent('The HR assistant returned an error (502).')

    await userEvent.click(screen.getByTestId('chat-retry-button'))

    expect(await screen.findByText('Recovered.')).toBeInTheDocument()
    expect(screen.queryByTestId('chat-error')).not.toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
