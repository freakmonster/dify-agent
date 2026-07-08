import type { Locale } from '@/i18n'


export type AppInfo = {
  title: string
  description: string
  default_language: Locale
  copyright?: string
  privacy_policy?: string
}

export type MessageRating = 'like' | 'dislike' | null

export type Feedbacktype = {
  rating: MessageRating
  content?: string | null
}

// ────────────────────────────────────────────────
// Chat / Agent types
// ────────────────────────────────────────────────

export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
}

export type AgentThought = {
  id: string
  message_id: string
  position: number
  thought: string
  observation: string
  tool: string
  tool_input: string
  created_at: number
  message_files: string[]
}

export type ChatMessage = {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  isStreaming?: boolean
  feedback?: Feedbacktype
  agent_thoughts?: AgentThought[]
  receivedFiles?: Array<{
    type: string
    transfer_method: string
    url: string
    remote_url?: string
    related_id?: string
    filename?: string
    extension?: string
    mime_type?: string
    size?: number
  }>
  created_at: number
}

export type Conversation = {
  id: string
  name: string
  inputs: Record<string, any>
  introduction: string
  created_at: number
  updated_at: number
}
