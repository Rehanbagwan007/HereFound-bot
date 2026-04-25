import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { supabase } from './supabaseClient.js';
import { MetaWebhookPayload } from './types/meta.js';

// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv');
  dotenv.config();
}

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const verifyToken = process.env.META_VERIFY_TOKEN;
const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
const aiEngineUrl = process.env.AI_ENGINE_URL;
const orgId = process.env.SUPABASE_ORG_ID;

if (!verifyToken || !pageAccessToken || !aiEngineUrl || !orgId) {
  throw new Error('META_VERIFY_TOKEN, META_PAGE_ACCESS_TOKEN, AI_ENGINE_URL, and SUPABASE_ORG_ID are required');
}

app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.status(403).send('Verification failed');
});


async function sendMetaMessage(recipientId: string, text: string) {
  await axios.post(
    `https://graph.facebook.com/v17.0/${recipientId}/messages`,
    {
      message: { text },
    },
    {
      params: { access_token: pageAccessToken },
    }
  );
}

async function replyToComment(commentId: string, text: string) {
  await axios.post(
    `https://graph.facebook.com/v17.0/${commentId}/replies`,
    { message: text },
    { params: { access_token: pageAccessToken } }
  );
}

async function getMediaPermalink(mediaId: string): Promise<string | null> {
  try {
    const response = await axios.get(`https://graph.facebook.com/v17.0/${mediaId}`, {
      params: { fields: 'permalink_url', access_token: pageAccessToken }
    });
    return response.data.permalink_url || null;
  } catch (err) {
    console.error(`Failed to get media permalink for ${mediaId}`, err);
    return null;
  }
}

app.post('/webhook', async (req: Request, res: Response) => {
  const payload = req.body as MetaWebhookPayload;

  if (!payload || payload.object !== 'instagram') {
    return res.status(200).json({ success: true, message: 'Ignored non-instagram object' });
  }

  const entry = payload.entry?.[0];
  if (!entry) {
    return res.status(200).json({ success: true, message: 'Ignored missing payload entry' });
  }

  const change = entry.changes?.[0];
  const value = change?.value;

  if (!value) {
    return res.status(200).json({ success: true, message: 'Ignored missing change value' });
  }

  const isDm = !!value.sender;
  const isMention = !!value.comment_id;

  // Handle Meta's Webhook Test Payload (which has no message or sender/from)
  if (!value.message && !value.from && !value.sender) {
    console.log('Received structural Meta test webhook payload. Acknowledging with 200.');
    return res.status(200).json({ success: true, test: true });
  }

  const rawMessage = value.message || '';
  // Parse Reel URL from text
  const urlMatch = rawMessage.match(/https?:\/\/[^\s]+/i);
  let reelUrl = urlMatch ? urlMatch[0] : null;

  if (!reelUrl) {
    const mediaId = value.media_id || value.post_id;
    if (mediaId) {
      reelUrl = await getMediaPermalink(mediaId);
    }
  }

  // Extract reporter username natively from DM payload, mention payload, or fallback to regex in message text
  let reporterUsername = value.from?.username || value.from?.id || value.sender?.username || value.sender?.id;
  if (!reporterUsername) {
    const usernameMatch = rawMessage.match(/@([a-zA-Z0-9._-]+)/);
    reporterUsername = usernameMatch ? usernameMatch[1] : null;
  }

  if (!reelUrl || !reporterUsername) {
    return res.status(422).json({ error: 'Unable to parse reel URL or reporter username', details: { reelUrl, reporterUsername, rawMessage } });
  }

  try {
    const aiResponse = await axios.post(aiEngineUrl, { reel_url: reelUrl });
    const analysis = aiResponse.data;

    const insertPayload = {
      org_id: orgId,
      reel_url: reelUrl,
      reporter_username: reporterUsername,
      status: analysis.is_violation ? 'flagged' : 'cleared',
      violation_type: analysis.violation_type,
      it_act_section: analysis.it_act_section,
      confidence: analysis.confidence,
      cyber_police_draft: analysis.cyber_police_draft,
    };

    const { data, error } = await supabase.from('flagged_violations').insert(insertPayload).select('id');
    if (error) {
      console.error('Supabase insert failed', error);
      return res.status(500).json({ error: 'Database insert failed' });
    }

    const reportId = data?.[0]?.id;
    const publicReportUrl = `${process.env.PUBLIC_DASHBOARD_URL || 'https://herefound.example.com'}/public-report/${reportId}`;

    if (isDm) {
      await sendMetaMessage(value.sender.id, `Analysis result:\n${JSON.stringify(analysis, null, 2)}`);
    } else if (isMention) {
      await replyToComment(value.comment_id, `@${reporterUsername} A potential violation has been detected. View your drafted complaint here: ${publicReportUrl}`);
    }

    return res.status(200).json({ success: true, analysis, reportId });
  } catch (err) {
    console.error('Webhook processing error', err);
    return res.status(500).json({ error: 'Internal webhook error' });
  }
});

app.listen(port, () => {
  console.log(`HereFound webhook backend listening on port ${port}`);
});
