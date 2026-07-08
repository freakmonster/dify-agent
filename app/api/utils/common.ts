import { API_KEY, API_URL, APP_ID } from '@/config'
import { ChatClient } from 'dify-client'
import { type NextRequest } from 'next/server'
import { v4 } from 'uuid'

const userPrefix = `user_${APP_ID}:`

export const getInfo = (request: NextRequest) => {
  const sessionId = request.cookies.get('session_id')?.value || v4()
  const user = userPrefix + sessionId
  return {
    sessionId,
    user,
  }
}

export const setSession = (sessionId: string) => {
  return { 'Set-Cookie': `session_id=${sessionId}` }
}

export const chatClient = new ChatClient(API_KEY, API_URL || undefined)
