import express from 'express';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// リクエストログ（デバッグ用）
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.path} host=${req.headers.host}`);
  next();
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// --- Middleware: Authenticate via Supabase JWT ---
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Verify the JWT and get the user
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Fetch Google tokens from DB
  const { data: tokenData, error: tokenError } = await supabase
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (tokenError || !tokenData?.access_token) {
    res.status(401).json({ error: 'Google tokens not found. Please reconnect Google.' });
    return;
  }

  // Check Google OAuth config
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('[AUTH] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
    res.status(500).json({ error: 'Server Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
    return;
  }

  // Create OAuth2 client with the stored tokens
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || undefined,
    expiry_date: tokenData.expires_at ? new Date(tokenData.expires_at).getTime() : undefined,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    console.log('[TOKEN] Auto-refresh triggered, updating DB...');
    const updates: Record<string, string> = { updated_at: new Date().toISOString() };
    if (tokens.access_token) updates.access_token = tokens.access_token;
    if (tokens.refresh_token) updates.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) updates.expires_at = new Date(tokens.expiry_date).toISOString();
    await supabase.from('user_google_tokens').update(updates).eq('user_id', user.id);
  });

  // Force refresh if token is expired
  const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at).getTime() : 0;
  if (expiresAt < Date.now() && tokenData.refresh_token) {
    try {
      console.log('[TOKEN] Token expired, forcing refresh...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      // Save refreshed token
      const updates: Record<string, string> = { updated_at: new Date().toISOString() };
      if (credentials.access_token) updates.access_token = credentials.access_token;
      if (credentials.expiry_date) updates.expires_at = new Date(credentials.expiry_date).toISOString();
      await supabase.from('user_google_tokens').update(updates).eq('user_id', user.id);
      console.log('[TOKEN] Token refreshed successfully');
    } catch (refreshErr: any) {
      console.error('[TOKEN] Refresh failed:', refreshErr?.message);
      res.status(401).json({ error: 'Google token expired and refresh failed. Please re-login with Google.' });
      return;
    }
  }

  (req as any).oauth2Client = oauth2Client;
  (req as any).userId = user.id;
  next();
};

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    config: {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!(supabaseServiceKey || supabaseAnonKey),
      googleClientId: !!process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    },
  });
});

// --- API Routes ---

app.get('/api/gmail/messages', requireAuth, async (req, res) => {
  try {
    const gmail = google.gmail({ version: 'v1', auth: (req as any).oauth2Client });
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'is:unread'
    });

    const messages = response.data.messages || [];
    const detailedMessages = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!
        });

        const headers = detail.data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const sender = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
        const date = headers.find(h => h.name === 'Date')?.value || '';

        return {
          id: detail.data.id,
          subject,
          sender,
          snippet: detail.data.snippet,
          date: new Date(date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          isRead: !detail.data.labelIds?.includes('UNREAD')
        };
      })
    );

    res.json(detailedMessages);
  } catch (error: any) {
    console.error('Gmail API error:', error?.message || error);
    if (error?.code === 401 || error?.response?.status === 401) {
      res.status(401).json({ error: 'Google token expired. Please reconnect.' });
    } else {
      res.status(500).json({ error: 'Failed to fetch emails' });
    }
  }
});

app.get('/api/calendar/events', requireAuth, async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: (req as any).oauth2Client });

    const dateParam = req.query.date as string;
    const now = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay,
      timeMax: endOfDay,
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    const tasks = events.map(event => {
      const start = event.start?.dateTime || event.start?.date;
      const end = event.end?.dateTime || event.end?.date;

      let startTimeStr = '';
      let estimatedTime = 3600;

      if (start && start.includes('T')) {
        const startDate = new Date(start);
        startTimeStr = startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

        if (end && end.includes('T')) {
          const endDate = new Date(end);
          estimatedTime = (endDate.getTime() - startDate.getTime()) / 1000;
        }
      }

      return {
        id: event.id,
        title: event.summary || 'No Title',
        details: event.description || '',
        completed: false,
        timeSpent: 0,
        estimatedTime,
        startTime: startTimeStr,
        tags: ['Calendar'],
        projectId: 'p2',
        date: now.toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };
    });

    res.json(tasks);
  } catch (error: any) {
    console.error('Calendar API error:', error?.message || error);
    if (error?.code === 401 || error?.response?.status === 401) {
      res.status(401).json({ error: 'Google token expired. Please reconnect.' });
    } else {
      res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
  }
});

app.get('/api/drive/files', requireAuth, async (req, res) => {
  try {
    const drive = google.drive({ version: 'v3', auth: (req as any).oauth2Client });
    const response = await drive.files.list({
      pageSize: 10,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
      orderBy: 'modifiedTime desc'
    });
    res.json(response.data.files || []);
  } catch (error: any) {
    console.error('Drive API error:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch drive files' });
  }
});

// --- Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('[STARTUP] Vite not available, falling back to static:', e);
      app.use(express.static('dist'));
    }
  } else {
    const path = await import('path');
    app.use(express.static('dist'));
    // SPA fallback
    app.get('*', (_req, res) => {
      res.sendFile(path.default.resolve('dist', 'index.html'));
    });
  }

  // Startup config check
  console.log('[CONFIG] GOOGLE_CLIENT_ID:', !!process.env.GOOGLE_CLIENT_ID);
  console.log('[CONFIG] GOOGLE_CLIENT_SECRET:', !!process.env.GOOGLE_CLIENT_SECRET);
  console.log('[CONFIG] SUPABASE_URL:', !!supabaseUrl);
  console.log('[CONFIG] SUPABASE_KEY:', !!(supabaseServiceKey || supabaseAnonKey));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
