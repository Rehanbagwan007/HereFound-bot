export interface MetaWebhookEntry {
  id: string;
  time: number;
  changes?: Array<{
    field: string;
    value: Record<string, any>;
  }>;
  messaging?: Array<DirectMessageValue>;
}

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

export interface CommentMentionValue {
  comment_id: string;
  from: {
    id: string;
    name?: string;
    username?: string;
  };
  message?: string;
  text?: string;
  post_id?: string;
  media_id?: string;
  id?: string;
}

export interface DirectMessageValue {
  sender: {
    id: string;
    username?: string;
  };
  message: {
    mid?: string;
    text?: string;
    attachments?: Array<{
      type: string;
      payload: {
        url: string;
      };
    }>;
  };
}
