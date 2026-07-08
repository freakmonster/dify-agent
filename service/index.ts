import type { Feedbacktype } from '@/types/app'
import type { IOnAgentMessage, IOnAgentThought, IOnCompleted, IOnData, IOnError, IOnMessageEnd, IOnTaskId } from './base'
import { del, get, post, ssePost } from './base'

export const fetchAppParams = async () => {
  return get('parameters')
}

export const fetchAppMeta = async () => {
  return get('meta')
}

export const fetchMessages = async (conversationId: string) => {
  return get('messages', { params: { conversation_id: conversationId } })
}

export const updateFeedback = async ({ url, body }: { url: string; body: Feedbacktype }) => {
  return post(url, { body })
}

// ────────────────────────────────────────────────
// Chat / Agent APIs
// ────────────────────────────────────────────────

export const sendChatMessage = async (
  body: {
    query: string
    inputs?: Record<string, any>
    conversation_id?: string
    files?: any[]
  },
  {
    onData,
    onCompleted,
    onError,
    onTaskId,
    onMessageEnd,
    onAgentMessage,
    onAgentThought,
    abortController,
  }: {
    onData: IOnData
    onCompleted?: IOnCompleted
    onError?: IOnError
    onTaskId?: IOnTaskId
    onMessageEnd?: IOnMessageEnd
    onAgentMessage?: IOnAgentMessage
    onAgentThought?: IOnAgentThought
    abortController?: AbortController
  },
) => {
  return ssePost('chat-messages', {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onData, onCompleted, onError, onTaskId, onMessageEnd, onAgentMessage, onAgentThought, abortController })
}

export const stopChatMessage = async (taskId: string) => {
  return post(`chat-messages/${taskId}/stop`)
}

export const fetchSuggestedQuestions = async (messageId: string) => {
  return get(`messages/${messageId}/suggested`)
}

export const fetchConversations = async (params?: { first_id?: string; limit?: number }) => {
  const query: Record<string, string> = {}
  if (params?.first_id) query.first_id = params.first_id
  if (params?.limit) query.limit = String(params.limit)
  return get('conversations', { params: query })
}

export const deleteConversation = async (conversationId: string) => {
  return del(`conversations/${conversationId}`)
}

export const renameConversation = async (
  conversationId: string,
  name: string,
  autoGenerate = false,
) => {
  return post(`conversations/${conversationId}/name`, {
    body: { name, auto_generate: autoGenerate },
  })
}

