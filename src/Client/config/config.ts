export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  hubUrl: import.meta.env.VITE_HUB_URL || 'http://localhost:5000/chatHub',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:5000/chatHub',
} as const;

// Validate required environment variables
const requiredEnvVars = ['VITE_API_URL', 'VITE_HUB_URL', 'VITE_WS_URL'] as const;

if (import.meta.env.PROD) {
  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}
