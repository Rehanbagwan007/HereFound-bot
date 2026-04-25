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

async function getCommentDetails(commentId: string): Promise<{ username: string | null, text: string | null }> {
  try {
    const response = await axios.get(`https://graph.facebook.com/v17.0/${commentId}`, {
      params: { fields: 'from,text', access_token: pageAccessToken }
    });
    return {
      username: response.data.from?.username || response.data.from?.id || null,
      text: response.data.text || null
    };
  } catch (err) {
    console.error(`Failed to get comment details for ${commentId}`, err);
    return { username: null, text: null };
  }
}

app.post('/webhook', async (req: Request, res: Response) => {
  const payload = req.body as MetaWebhookPayload;
  console.log('Incoming Webhook Payload:', JSON.stringify(payload, null, 2));

  if (!payload || payload.object !== 'instagram') {
    return res.status(200).json({ success: true, message: 'Ignored non-instagram object' });
  }

  const entry = payload.entry?.[0];
  if (!entry) {
    return res.status(200).json({ success: true, message: 'Ignored missing payload entry' });
  }

  let value: any = null;
  let isDm = false;
  let isMention = false;
  let changeField = '';

  if (entry.messaging?.[0]) {
    value = entry.messaging[0];
    isDm = true;
  } else if (entry.changes?.[0]) {
    const change = entry.changes[0];
    value = change.value;
    changeField = change.field;
    isMention = changeField === 'mentions' || changeField === 'comments' || !!value.comment_id;
  }

  if (!value) {
    return res.status(200).json({ success: true, message: 'Ignored missing payload content' });
  }

  console.log(`Detected type: ${isDm ? 'DM' : isMention ? 'Mention' : 'Unknown'}`);

  // Handle Meta's Webhook Test Payload
  if (!value.message && !value.from && !value.sender && !isDm) {
    console.log('Received structural Meta test webhook payload. Acknowledging with 200.');
    return res.status(200).json({ success: true, test: true });
  }

  // Extract raw message and reel URL
  let rawMessage = '';
  let reelUrl: string | null = null;

  if (isDm) {
    // DM Payload structure
    const msg = value.message || {};
    rawMessage = msg.text || '';
    
    // Check for Reel URL in attachments
    const attachments = msg.attachments || [];
    console.log('DM Attachments:', JSON.stringify(attachments, null, 2));
    
    for (const attachment of attachments) {
      // Check multiple possible locations for the Reel URL in different attachment types
      const url = 
        attachment.payload?.url || 
        attachment.payload?.link || 
        attachment.payload?.share?.link ||
        attachment.payload?.share?.url ||
        attachment.payload?.video_share?.link ||
        attachment.payload?.video_share?.url;

      if (url) {
        reelUrl = url;
        console.log(`Found reel URL in attachment (type: ${attachment.type}): ${reelUrl}`);
        break;
      }
    }
  } else {
    // Mention/Comment Payload structure
    rawMessage = value.message || value.text || '';
    
    // Fetch comment details if text is missing and it's a mention with a comment_id
    if (isMention && value.comment_id && (!rawMessage || !value.from)) {
      console.log(`Fetching details for comment ${value.comment_id}`);
      const commentDetails = await getCommentDetails(value.comment_id);
      if (commentDetails.text) {
        rawMessage = commentDetails.text;
      }
      if (commentDetails.username) {
        value.from = { ...value.from, username: commentDetails.username, id: value.from?.id || commentDetails.username };
      }
    }
  }

  // Fallback to regex for Reel URL in text if not found in attachments
  if (!reelUrl) {
    const urlMatch = rawMessage.match(/https?:\/\/[^\s]+/i);
    reelUrl = urlMatch ? urlMatch[0] : null;
  }

  // Fallback to media_id if still no URL
  if (!reelUrl) {
    const mediaId = value.media_id || value.post_id || value.id;
    if (mediaId && !isDm) { // Only use getMediaPermalink for mentions/comments
      reelUrl = await getMediaPermalink(mediaId);
    }
  }

  // Extract reporter username
  let reporterUsername = value.from?.username || value.from?.id || value.sender?.username || value.sender?.id;
  if (!reporterUsername) {
    const usernameMatch = rawMessage.match(/@([a-zA-Z0-9._-]+)/);
    reporterUsername = usernameMatch ? usernameMatch[1] : null;
  }

  if (!reelUrl || !reporterUsername) {
    console.log('422 Error Debug Info:', {
      reelUrl,
      reporterUsername,
      rawMessage,
      valueKeys: Object.keys(value),
      value
    });
    return res.status(422).json({ error: 'Unable to parse reel URL or reporter username', details: { reelUrl, reporterUsername, rawMessage } });
  }

  try {
    console.log('Sending request to AI Engine at:', aiEngineUrl);
    const aiResponse = await axios.post(aiEngineUrl, { reel_url: reelUrl });
    console.log('Received response from AI Engine:', JSON.stringify(aiResponse.data, null, 2));
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
