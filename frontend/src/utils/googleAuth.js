export const GOOGLE_REDIRECT_PATH = '/auth/google/callback'

export function getGoogleRedirectUri() {
  return `${window.location.origin}${GOOGLE_REDIRECT_PATH}`
}

export function startGoogleOAuth() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId || clientId === 'your_google_client_id') {
    throw new Error('Google OAuth is not configured. Set VITE_GOOGLE_CLIENT_ID in the project .env file.')
  }

  const redirectUri = getGoogleRedirectUri()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    access_type: 'online',
    prompt: 'select_account',
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}
