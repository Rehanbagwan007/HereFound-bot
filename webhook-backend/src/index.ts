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

async function getDmShareUrl(mid: string): Promise<string | null> {
  try {
    const response = await axios.get(`https://graph.facebook.com/v17.0/${mid}`, {
      params: { fields: 'shares,attachments,message', access_token: pageAccessToken }
    });
    console.log(`Graph API response for mid ${mid}:`, JSON.stringify(response.data, null, 2));
    
    const shares = response.data.shares?.data;
    if (shares && shares.length > 0) {
      const share = shares[0];
      if (share.link) return share.link;
      if (share.id) {
        // sometimes shares only have IDs, we can try to fetch permalink
        console.log(`Fallback: Getting permalink for shared media ID ${share.id}`);
        return await getMediaPermalink(share.id);
      }
    }
    return null;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(`Failed to get DM share URL for ${mid}. Status: ${err.response?.status}, Data:`, err.response?.data);
    } else {
      console.error(`Failed to get DM share URL for ${mid}`, err);
    }
    return null;
  }
}

const recentProcessedItems = new Set<string>();

async function processWebhookInBackground(payload: MetaWebhookPayload) {
  console.log('Incoming Webhook Payload:', JSON.stringify(payload, null, 2));

  if (!payload || payload.object !== 'instagram') {
    console.log('Ignored non-instagram object');
    return;
  }

  const entry = payload.entry?.[0];
  if (!entry) {
    console.log('Ignored missing payload entry');
    return;
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
    console.log('Ignored missing payload content');
    return;
  }

  const uniqueId = isDm ? value.message?.mid : isMention ? value.comment_id : null;
  if (uniqueId) {
    if (recentProcessedItems.has(uniqueId)) {
      console.log(`Duplicate webhook detected for ID: ${uniqueId}, suppressing to avoid Meta retry loops and Gemini API quota exhaustion.`);
      return; 
    }
    // Mark as processing
    recentProcessedItems.add(uniqueId);
    // Cleanup cache after 5 minutes
    setTimeout(() => recentProcessedItems.delete(uniqueId), 5 * 60 * 1000);
  }

  console.log(`Detected type: ${isDm ? 'DM' : isMention ? 'Mention' : 'Unknown'}`);

  // Handle Meta's Webhook Test Payload
  if (!value.message && !value.text && !value.from && !value.sender && !isDm && !isMention) {
    console.log('Received structural Meta test webhook payload.');
    return;
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

    // Fallback: If attachments were empty (e.g. empty 'template' element), check Graph API shares
    if (!reelUrl && msg.mid) {
      console.log(`Checking Graph API for share link using message mid: ${msg.mid}`);
      reelUrl = await getDmShareUrl(msg.mid);
      if (reelUrl) {
        console.log(`Found reel URL via Graph API shares: ${reelUrl}`);
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
    console.log('Unable to parse reel URL or reporter username Debug Info:', {
      reelUrl,
      reporterUsername,
      rawMessage,
      valueKeys: Object.keys(value),
      value
    });
    
    // Auto-reply to let the user know Instagram blocked the link
    if (isDm && value.sender?.id) {
      await sendMetaMessage(
        value.sender.id, 
        "⚠️ We couldn't instantly process the Reel you shared because of your account's privacy settings or Instagram API restrictions. \n\nTo report this Reel, please **Copy Link** from the Instagram post and **Paste the text link** here in the chat!"
      ).catch(err => console.error('Failed to send fallback instructions', err));
    }
    
    return;
  }

  try {
    console.log('Sending request to AI Engine at:', aiEngineUrl);
    const aiResponse = await axios.post(aiEngineUrl as string, { reel_url: reelUrl });
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
      return;
    }

    const reportId = data?.[0]?.id;
    const publicReportUrl = `${process.env.PUBLIC_DASHBOARD_URL || 'https://herefound.example.com'}/public-report/${reportId}`;

    if (isDm && value.sender?.id) {
      let replyMessage: string;

      if (analysis.is_violation) {
        replyMessage =
          `🚨 *Violation Detected!*\n\n` +
          `📋 *Type:* ${analysis.violation_type || 'N/A'}\n` +
          `⚖️ *IT Act Section:* ${analysis.it_act_section || 'N/A'}\n` +
          `📊 *Confidence:* ${analysis.confidence ?? 'N/A'}%\n\n` +
          `📝 *Complaint Draft:*\n${analysis.cyber_police_draft || 'N/A'}\n\n` +
          `🔗 *Full Report:* ${publicReportUrl}`;
      } else {
        replyMessage =
          `✅ *No Violation Found*\n\n` +
          `The Reel you shared appears to be clean based on our analysis.\n` +
          `📊 *Confidence:* ${analysis.confidence ?? 'N/A'}%\n\n` +
          `🔗 *Full Report:* ${publicReportUrl}`;
      }

      await sendMetaMessage(value.sender.id, replyMessage);
    } else if (isMention) {
      await replyToComment(value.comment_id, `@${reporterUsername} ${analysis.is_violation ? '🚨 A potential violation has been detected.' : '✅ No violation found.'} View the full report here: ${publicReportUrl}`);
    }

    console.log(`Webhook processing completed successfully for reportId: ${reportId}`);
    console.log('=== ANALYSIS REPORT ===');
    console.log(`Reel URL: ${reelUrl}`);
    console.log(`Reporter: ${reporterUsername}`);
    console.log(`Status: ${analysis.is_violation ? '🚨 VIOLATION' : '✅ CLEAN'}`);
    console.log(`Violation Type: ${analysis.violation_type || 'N/A'}`);
    console.log(`IT Act Section: ${analysis.it_act_section || 'N/A'}`);
    console.log(`Confidence: ${analysis.confidence ?? 'N/A'}%`);
    console.log(`DB Record ID: ${reportId}`);
    console.log('=======================');
  } catch (err) {
    console.error('Webhook processing error', err);
  }
}

app.post('/webhook', async (req: Request, res: Response) => {
  const payload = req.body as MetaWebhookPayload;
  
  // Vercel immediately freezes background logic the moment we call res.send().
  // Therefore, we MUST await the AI processing before returning the HTTP response.
  // Because we switched to `gemini-1.5-flash-latest`, it should be fast enough to avoid Meta's 20-second timeout.
  try {
    await processWebhookInBackground(payload);
  } catch (err) {
    console.error('Unhandled error in webhook processing:', err);
  }

  // Acknowledge the webhook to Meta
  res.status(200).send('EVENT_RECEIVED');
});

app.listen(port, () => {
  console.log(`HereFound webhook backend listening on port ${port}`);
});
