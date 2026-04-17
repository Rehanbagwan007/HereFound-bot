import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { supabase } from './supabaseClient.js';
import { MetaWebhookPayload } from './types/meta.js';

dotenv.config();

const app = express();
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

function parseReelData(message: string): { reelUrl: string | null; reporterUsername: string | null } {
  const urlMatch = message.match(/https?:\/\/[^(\s)]+/i);
  const reelUrl = urlMatch ? urlMatch[0] : null;

  const usernameMatch = message.match(/@([a-zA-Z0-9._-]+)/);
  const reporterUsername = usernameMatch ? usernameMatch[1] : null;

  return { reelUrl, reporterUsername };
}

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
    `https://graph.facebook.com/v17.0/${commentId}/comments`,
    { message: text },
    { params: { access_token: pageAccessToken } }
  );
}

app.post('/webhook', async (req: Request, res: Response) => {
  const payload = req.body as MetaWebhookPayload;

  if (!payload || payload.object !== 'instagram') {
    return res.status(400).json({ error: 'Unsupported webhook object' });
  }

  const entry = payload.entry?.[0];
  if (!entry) {
    return res.status(400).json({ error: 'Missing payload entry' });
  }

  const change = entry.changes?.[0];
  const value = change?.value;

  if (!value) {
    return res.status(400).json({ error: 'Missing change value' });
  }

  const isDm = !!value.sender;
  const isMention = !!value.comment_id;

  const rawMessage = value.message || '';
  const { reelUrl, reporterUsername } = parseReelData(rawMessage);

  if (!reelUrl || !reporterUsername) {
    return res.status(422).json({ error: 'Unable to parse reel URL or reporter username' });
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
