import type { AppConfig } from '../config/config'
import type { Employee, Leave } from '../api/types'

export const testConfig: AppConfig = {
  region: 'us-east-1',
  apiUrl: 'https://api.example.test/prod',
  userPoolId: 'us-east-1_TEST',
  userPoolClientId: 'test-client-id',
  agentRuntimeArn: 'arn:aws:bedrock-agentcore:us-east-1:111111111111:runtime/hrAgent-test',
}

export const storageKeys = {
  PK: 'USER',
  SK: 'a1b2c3d4',
  GSI1PK: 'USER_BY_DATE',
  GSI1SK: '2026-01-15',
}

export const janeDoe: Employee = {
  employeeId: 'a1b2c3d4',
  name: 'Jane Doe',
  department: 'Finance',
  startDate: '2026-01-15',
  role: 'employee',
}

/** Employee item as the API returns it, storage keys included. */
export const janeDoeApiItem = { ...storageKeys, ...janeDoe }

export const decemberLeave: Leave = {
  employeeId: 'a1b2c3d4',
  startDate: '2026-12-01',
  endDate: '2026-12-05',
  note: '',
}

export const decemberLeaveApiItem = { PK: 'a1b2c3d4', SK: '2026-12-01', ...decemberLeave }

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function sseResponse(lines: string[], status = 200): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line))
      controller.close()
    },
  })
  return new Response(stream, { status, headers: { 'Content-Type': 'text/event-stream' } })
}

export function textDeltaEvent(text: string): string {
  return `data: ${JSON.stringify({ event: { contentBlockDelta: { delta: { text } } } })}\n\n`
}
