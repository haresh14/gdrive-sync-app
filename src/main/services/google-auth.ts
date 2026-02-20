/**
 * Google OAuth & token management
 * Uses localhost redirect - works with Desktop client credentials (no custom URI config)
 */

import * as http from 'http';
import { shell } from 'electron';
import Store from 'electron-store';
import { GoogleAccount } from '../../shared/types';

const CALLBACK_PORT = 34567;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

// Track active server so we can close it before starting a new auth flow
let activeServer: http.Server | null = null;
let activeTimeout: ReturnType<typeof setTimeout> | null = null;

function closeActiveAuthServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!activeServer) {
      resolve();
      return;
    }
    if (activeTimeout) {
      clearTimeout(activeTimeout);
      activeTimeout = null;
    }
    const server = activeServer;
    activeServer = null;
    server.close(() => resolve());
  });
}

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
  scope?: string;
}

interface StoredAccount {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  tokens: TokenData;
}

const store = new Store<{ accounts: StoredAccount[] }>({
  name: 'gdrive-sync-auth',
});

const CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  'YOUR_CLIENT_ID.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

/** Get auth URL for manual use (legacy) */
export function getAuthUrl(accountId: string): string {
  const state = Buffer.from(JSON.stringify({ accountId })).toString('base64');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export interface AddAccountResult {
  success: boolean;
  account?: GoogleAccount;
  error?: string;
}

/**
 * Run full OAuth flow: start local server, open browser, wait for callback, exchange tokens.
 * Works with "Desktop" client credentials (localhost is allowed by default).
 */
export async function addAccount(
  accountId: string
): Promise<AddAccountResult> {
  if (!CLIENT_SECRET) {
    return {
      success: false,
      error:
        'GOOGLE_CLIENT_SECRET not set. Add it to .env (get it from your OAuth client in Google Cloud Console).',
    };
  }

  // Close any previous auth server (e.g. user cancelled and clicked Add again)
  await closeActiveAuthServer();

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      closeActiveAuthServer();
      resolve({ success: false, error: 'Timed out waiting for sign-in' });
    }, 5 * 60 * 1000); // 5 min
    activeTimeout = timeout;

    const server = http.createServer(
      async (req: http.IncomingMessage, res: http.ServerResponse) => {
        const url = req.url || '/';
        if (!url.startsWith('/callback')) {
          res.writeHead(404).end();
          return;
        }

        const parsed = new URL(url, `http://localhost:${CALLBACK_PORT}`);
        const code = parsed.searchParams.get('code');
        const state = parsed.searchParams.get('state');
        const error = parsed.searchParams.get('error');

        const html = (message: string, isError = false) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>GDrive Sync</title></head>
<body style="font-family:system-ui;padding:2rem;text-align:center;">
  <p style="color:${isError ? '#c53030' : '#2f855a'};font-size:1.2rem;">${message}</p>
  <p style="color:#666;font-size:0.9rem;">You can close this tab.</p>
</body></html>`;

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html(`Sign-in failed: ${error}`, true));
          clearTimeout(timeout);
          activeTimeout = null;
          activeServer = null;
          server.close();
          resolve({ success: false, error });
          return;
        }

        if (!code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html('No authorization code received', true));
          clearTimeout(timeout);
          activeTimeout = null;
          activeServer = null;
          server.close();
          resolve({ success: false, error: 'No code received' });
          return;
        }

        // Verify state matches
        let expectedState: { accountId: string };
        try {
          expectedState = JSON.parse(
            Buffer.from(state || '', 'base64').toString()
          );
        } catch {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html('Invalid state', true));
          clearTimeout(timeout);
          server.close();
          resolve({ success: false, error: 'Invalid state' });
          return;
        }

        // Exchange code for tokens
        try {
          const tokens = await exchangeCodeForTokens(code);
          const userInfo = await fetchUserInfo(tokens.access_token);

          const account: StoredAccount = {
            id: expectedState.accountId || accountId,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            tokens: {
              ...tokens,
              expiry_date: Date.now() + (tokens.expires_in || 3600) * 1000,
            },
          };
          saveAccount(account);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html('Success! Account added.'));

          clearTimeout(timeout);
          activeTimeout = null;
          activeServer = null;
          server.close();
          resolve({
            success: true,
            account: {
              id: account.id,
              email: account.email,
              name: account.name,
              picture: account.picture,
            },
          });
        } catch (err) {
          const msg = (err as Error).message;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html(`Token exchange failed: ${msg}`, true));
          clearTimeout(timeout);
          activeTimeout = null;
          activeServer = null;
          server.close();
          resolve({ success: false, error: msg });
        }
      }
    );

    server.on('error', (err) => {
      if (activeTimeout) clearTimeout(activeTimeout);
      activeTimeout = null;
      activeServer = null;
      resolve({
        success: false,
        error: `Server error: ${err.message}. Is port ${CALLBACK_PORT} in use?`,
      });
    });

    server.listen(CALLBACK_PORT, '127.0.0.1', () => {
      activeServer = server;
      const url = getAuthUrl(accountId);
      shell.openExternal(url);
    });
  });
}

async function exchangeCodeForTokens(code: string): Promise<
  TokenData & { expires_in?: number }
> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    throw new Error(
      err.error_description || err.error || `HTTP ${res.status}`
    );
  }
  return (await res.json()) as TokenData & { expires_in?: number };
}

async function fetchUserInfo(accessToken: string): Promise<{
  email: string;
  name?: string;
  picture?: string;
}> {
  const res = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo?alt=json',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error('Failed to fetch user info');
  return (await res.json()) as {
    email: string;
    name?: string;
    picture?: string;
  };
}

export function getAccounts(): GoogleAccount[] {
  const accounts = store.get('accounts', []);
  return accounts.map((a) => ({
    id: a.id,
    email: a.email,
    name: a.name,
    picture: a.picture,
  }));
}

export function getTokens(accountId: string): TokenData | null {
  const accounts = store.get('accounts', []);
  const acc = accounts.find((a) => a.id === accountId);
  return acc?.tokens ?? null;
}

function saveAccount(account: StoredAccount): void {
  const accounts = store.get('accounts', []);
  const idx = accounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) accounts[idx] = account;
  else accounts.push(account);
  store.set('accounts', accounts);
}

export function removeAccount(accountId: string): void {
  const accounts = store.get('accounts', []).filter((a) => a.id !== accountId);
  store.set('accounts', accounts);
}

export function setTokens(
  accountId: string,
  email: string,
  name: string | undefined,
  picture: string | undefined,
  tokens: TokenData
): void {
  const account: StoredAccount = {
    id: accountId,
    email,
    name,
    picture,
    tokens,
  };
  saveAccount(account);
}

export function isAuthenticated(accountId: string): boolean {
  return getTokens(accountId) != null;
}
