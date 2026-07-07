export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? 'https://localhost:7117' : 'https://api.classclick.com.ar'),
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  vapidPublicKey: 'BAv2aj3EGwE3vGwmhR7krlAy6abZXzD2pXlNZXPCqcBGBoP9IAvtAZt4jaqCqVq5hf1gAJ6CbZB9HVf9E9sOMz0',
}
