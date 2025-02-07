/*
  # Add conversation support

  1. Changes
    - Add conversation_id column to messages table
    - Add index on conversation_id for better query performance

  2. Security
    - Maintain existing RLS policies
*/

-- Add conversation_id column
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id uuid DEFAULT gen_random_uuid();

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);