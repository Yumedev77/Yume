export interface Message {
  id?: string;
  content: string;
  role: 'user' | 'assistant';
  created_at?: string;
  conversation_id?: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  user_id: string;
  title?: string;
  last_message?: string;
}