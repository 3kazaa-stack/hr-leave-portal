// Shared fake Cognito session for tests that mock 'aws-amplify/auth'.

export const TEST_ID_TOKEN = 'test-id-token'
export const TEST_ACCESS_TOKEN = 'test-access-token'
export const TEST_USER = { username: 'hr.user@example.test', userId: 'sub-123' }

export function fakeAuthSession() {
  return {
    tokens: {
      idToken: { toString: () => TEST_ID_TOKEN },
      accessToken: { toString: () => TEST_ACCESS_TOKEN },
    },
  }
}
