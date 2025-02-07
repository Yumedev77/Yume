/*
  # Create messages table for chat history

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `user_id` (uuid, references auth.users)
      - `content` (text)
      - `role` (text)

  2. Security
    - Enable RLS on `messages` table
    - Add policies for authenticated users to:
      - Read their own messages
      - Create new messages
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users (id)
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);