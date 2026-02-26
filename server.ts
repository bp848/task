import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// In-memory store for tokens (for preview purposes)
// In a real app, store this in a database linked to a session ID
const tokenStore: Record<string, any> = {};

const getOAuthClient = (redirectUri: string) => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

const getRedirectUri = (req: express.Request) => {
  // Use APP_URL from environment if available, otherwise construct from request
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  return `${appUrl}/auth/callback`;
};

// --- API Routes ---

app.get('/api/auth/status', (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId && tokenStore[sessionId]) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

app.get('/api/auth/url', (req, res) => {
  const redirectUri = getRedirectUri(req);
  const oauth2Client = getOAuthClient(redirectUri);

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/documents.readonly'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  res.json({ url: authUrl });
});

app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    res.status(400).send('Missing code');
    return;
  }

  try {
    const redirectUri = getRedirectUri(req);
    const oauth2Client = getOAuthClient(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    
    // Generate a simple session ID
    const sessionId = Math.random().toString(36).substring(2, 15);
    tokenStore[sessionId] = tokens;

    // Set cookie
    res.cookie('sessionId', sessionId, {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    delete tokenStore[sessionId];
    res.clearCookie('sessionId', {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
    });
  }
  res.json({ success: true });
});

// Middleware to check auth and attach oauth client
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const sessionId = req.cookies.sessionId;
  const tokens = tokenStore[sessionId];
  
  if (!tokens) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const oauth2Client = getOAuthClient(getRedirectUri(req));
  oauth2Client.setCredentials(tokens);
  (req as any).oauth2Client = oauth2Client;
  next();
};

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
  } catch (error) {
    console.error('Gmail API error:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

app.get('/api/calendar/events', requireAuth, async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: (req as any).oauth2Client });
    
    // Get events for today
    const now = new Date();
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
        projectId: 'p2', // Default to MTG project
        date: now.toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };
    });

    res.json(tasks);
  } catch (error) {
    console.error('Calendar API error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
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
  } catch (error) {
    console.error('Drive API error:', error);
    res.status(500).json({ error: 'Failed to fetch drive files' });
  }
});

// --- Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
