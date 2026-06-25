export const GITHUB_REDIRECT_PATH = '/auth/github/callback'

export function isGitHubOAuthConfigured() {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  return clientId && clientId !== 'your_github_client_id'
}

export function getGitHubRedirectUri() {
  return `${window.location.origin}${GITHUB_REDIRECT_PATH}`
}

export function startGitHubOAuth() {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  if (!clientId || clientId === 'your_github_client_id') {
    throw new Error('GitHub OAuth is not configured. Set VITE_GITHUB_CLIENT_ID in the project .env file.')
  }

  const redirectUri = getGitHubRedirectUri()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'user:email',
  })

  window.location.href = `https://github.com/login/oauth/authorize?${params}`
}
