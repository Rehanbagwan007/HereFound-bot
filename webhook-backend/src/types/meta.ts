export interface MetaWebhookEntry {
  id: string;
  time: number;
  changes: Array<{
    field: string;
    value: Record<string, any>;
  }>;
}

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

export interface CommentMentionValue {
  comment_id: string;
  from: {
    id: string;
    name: string;
    username?: string;
  };
  message: string;
  post_id: string;
}

export interface DirectMessageValue {
  sender: {
    id: string;
    username: string;
  };
  message: string;
}
