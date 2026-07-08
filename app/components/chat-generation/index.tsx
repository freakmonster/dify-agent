'use client'
import Loading from '@/app/components/base/loading'
import Toast from '@/app/components/base/toast'
import type { AppTypeValue } from '@/config'
import {
  fetchAppParams,
  fetchMessages,
  fetchSuggestedQuestions,
  sendChatMessage,
  stopChatMessage,
  updateFeedback,
} from '@/service'
import type { ChatMessage, MessageRating } from '@/types/app'
import { MessageRole } from '@/types/app'
import { stripThinkTags } from '@/utils'
import {
  ChatBubbleOvalLeftEllipsisIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  StopIcon
} from '@heroicons/react/24/solid'
import { useBoolean } from 'ahooks'
import cn from 'classnames'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import s from './chat-styles.module.css'

// ─── Types ────────────────────────────────────────────────────────────

type Props = {
  /** Active conversation ID (managed by parent / ConversationSidebar) */
  conversationId: string | null
  /** App type passed from parent (runtime-detected) */
  appType?: AppTypeValue
  /** Raw /v1/parameters response forwarded from AppEntry — avoids a second fetch */
  appParams?: any
  /** Called when first assistant reply arrives with new conversation ID */
  onConversationCreated?: (id: string) => void
  /** Called whenever messages change (e.g. to refresh sidebar) */
  onMessagesChange?: () => void
}

// ─── Component ────────────────────────────────────────────────────────

const ChatGeneration: React.FC<Props> = ({
  conversationId,
  appType,
  appParams,
  onConversationCreated,
  onMessagesChange,
}) => {
  const { t } = useTranslation()
  const isAgentApp = appType === 'agent'

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isResponding, { setTrue: startResponding, setFalse: stopResponding }] = useBoolean(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Refs
  const abortControllerRef = useRef<AbortController>(new AbortController())
  const messageListRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messageCountRef = useRef<number>(0)
  const currentTaskIdRef = useRef<string | null>(null)
  // Set to true when a new conversation ID is assigned during an active stream,
  // so the conversationId-change effect doesn't abort the stream or clear messages.
  const skipNextResetRef = useRef(false)

  // ── Scroll to bottom ───────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (messageListRef.current)
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    })
  }, [])

  useEffect(() => {
    if (messages.length !== messageCountRef.current) {
      messageCountRef.current = messages.length
      scrollToBottom()
    }
  }, [messages.length, scrollToBottom])

  // ── Reset when switching conversation ──────────────────────────────
  useEffect(() => {
    // When a new conversation is created mid-stream, the parent updates
    // conversationId from null → real ID. We must NOT abort or clear in that case.
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false
      return
    }

    // Abort any in-flight request from the previous conversation
    abortControllerRef.current.abort()
    abortControllerRef.current = new AbortController()

    setMessages([])
    setSuggestedQuestions([])
    currentTaskIdRef.current = null
    stopResponding()
    messageCountRef.current = 0

    if (!conversationId) return

    const loadConversationHistory = async () => {
      setLoadingHistory(true)
      try {
        const res: any = await fetchMessages(conversationId)
        if (res?.code) {
          Toast.notify({ type: 'error', message: res.message || t('app.chat.historyLoadFailed') })
          return
        }

        if (res?.data && Array.isArray(res.data)) {
          // Map Dify response fields to frontend format.
          // Each Dify message contains both query (user) and answer (assistant),
          // so we reconstruct both sides of the conversation.
          const normalizedMessages = res.data.map((m: any) => {
            const assistantMsg: ChatMessage = {
              id: m.id,
              conversation_id: m.conversation_id,
              role: MessageRole.Assistant,
              content: stripThinkTags(m.answer || m.content || ''),
              isStreaming: false,
              feedback: m.feedback,
              agent_thoughts: m.agent_thoughts || [],
              receivedFiles: m.files || undefined,
              created_at: m.created_at,
            }

            if (m.query && m.query.trim().length > 0) {
              const userMsg: ChatMessage = {
                id: `user-${m.id}`,
                conversation_id: m.conversation_id,
                role: MessageRole.User,
                content: m.query,
                isStreaming: false,
                agent_thoughts: [],
                created_at: m.created_at - 1,
              }
              return [userMsg, assistantMsg]
            }

            return assistantMsg
          })
          setMessages((normalizedMessages as (ChatMessage | ChatMessage[])[]).flat() as ChatMessage[])
        }
      }
      catch (e: any) {
        Toast.notify({ type: 'error', message: e.message || t('app.chat.historyLoadFailed') })
      }
      finally {
        setLoadingHistory(false)
      }
    }

    loadConversationHistory()
  }, [conversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle suggested questions (with pre-flight validation) ────────
  const [suggestEnabled, setSuggestEnabled] = useState(false)
  const [suggestChecking, setSuggestChecking] = useState(false)

  const handleSuggestToggle = useCallback(async () => {
    if (suggestEnabled) {
      setSuggestEnabled(false)
      return
    }

    setSuggestChecking(true)
    try {
      // Use params forwarded from parent to avoid a redundant fetch
      const enabled = appParams?.suggested_questions_after_answer?.enabled
        // If parent params not yet available, fall back to a one-time fetch
        ?? await fetchAppParams().then((res: any) => res?.data?.suggested_questions_after_answer?.enabled).catch(() => false)
      if (enabled) {
        setSuggestEnabled(true)
      }
      else {
        Toast.notify({ type: 'error', message: t('app.chat.suggestionsNotEnabled') })
      }
    }
    catch {
      Toast.notify({ type: 'error', message: t('app.chat.suggestionsCheckFailed') })
    }
    finally {
      setSuggestChecking(false)
    }
  }, [suggestEnabled, appParams])

  // ── Textarea auto-resize ───────────────────────────────────────────
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }, [])

  // ── Send message ───────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const query = inputValue.trim()
    if (!query || isResponding) return

    setInputValue('')
    if (textareaRef.current)
      textareaRef.current.style.height = 'auto'
    setSuggestedQuestions([])

    // Batch both optimistic messages into a single setState call
    const placeholderId = `assistant-${Date.now()}`
    const now = Math.floor(Date.now() / 1000)
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        conversation_id: conversationId || '',
        role: MessageRole.User,
        content: query,
        isStreaming: false,
        agent_thoughts: [],
        created_at: now,
      } as ChatMessage,
      {
        id: placeholderId,
        conversation_id: conversationId || '',
        role: MessageRole.Assistant,
        content: '',
        isStreaming: true,
        agent_thoughts: [],
        created_at: now,
      } as ChatMessage,
    ])

    startResponding()

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Track the real message ID once the server assigns one
    let resolvedMsgId = placeholderId
    let resolvedConvId = conversationId

    // Shared handler for both onData (chat) and onAgentMessage (agent app)
    const handleStreamChunk = (text: string, _isFirst: boolean, { conversationId: cid, messageId, files }: { conversationId?: string; messageId?: string; files?: any[] }) => {
      if (cid && !resolvedConvId) {
        resolvedConvId = cid
        skipNextResetRef.current = true
        onConversationCreated?.(cid)
      }
      if (messageId)
        resolvedMsgId = messageId

      setMessages(prev =>
        prev.map((m) => {
          if (m.id !== placeholderId && m.id !== resolvedMsgId)
            return m
          const updates: Partial<ChatMessage> = { id: resolvedMsgId, content: stripThinkTags(m.content + text), isStreaming: true }
          if (files && files.length > 0)
            updates.receivedFiles = files
          return { ...m, ...updates }
        }),
      )
      scrollToBottom()
    }

    await sendChatMessage(
      {
        query,
        inputs: {},
        conversation_id: conversationId || undefined,
      },
      {
        onData: handleStreamChunk,
        onAgentMessage: handleStreamChunk,

        onAgentThought: (thought) => {
          setMessages(prev =>
            prev.map((m) => {
              if (m.id !== placeholderId && m.id !== resolvedMsgId) return m
              const existing = m.agent_thoughts || []
              const idx = existing.findIndex((t: any) => t.id === thought.data?.id)
              const newThoughts
                = idx === -1
                  ? [...existing, thought.data]
                  : existing.map((t: any, i: number) => (i === idx ? thought.data : t))
              return { ...m, agent_thoughts: newThoughts }
            }),
          )
        },

        onMessageEnd: (messageId, cid, _metadata, files) => {
          if (cid && !resolvedConvId) {
            resolvedConvId = cid
            skipNextResetRef.current = true
            onConversationCreated?.(cid)
          }
          resolvedMsgId = messageId

          setMessages(prev =>
            prev.map((m) => {
              if (m.id !== placeholderId && m.id !== resolvedMsgId)
                return m
              const updates: Partial<ChatMessage> = { id: messageId, isStreaming: false }
              if (files && files.length > 0)
                updates.receivedFiles = files
              return { ...m, ...updates }
            }),
          )
          onMessagesChange?.()

          if (suggestEnabled && messageId) {
            fetchSuggestedQuestions(messageId)
              .then((res: any) => {
                if (Array.isArray(res?.data))
                  setSuggestedQuestions(res.data)
              })
              .catch(() => { /* silently ignore */ })
          }
        },

        onCompleted: () => {
          setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m))
          stopResponding()
        },

        onError: (msg) => {
          Toast.notify({ type: 'error', message: msg })
          setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m))
          stopResponding()
        },

        onTaskId: (taskId) => {
          currentTaskIdRef.current = taskId
        },

        abortController,
      },
    )
  }, [
    inputValue,
    isResponding,
    conversationId,
    suggestEnabled,
    startResponding,
    stopResponding,
    scrollToBottom,
    onConversationCreated,
    onMessagesChange,
  ])

  // ── Stop responding ────────────────────────────────────────────────
  const handleStop = useCallback(async () => {
    abortControllerRef.current.abort()
    const taskId = currentTaskIdRef.current
    if (taskId) {
      try { await stopChatMessage(taskId) }
      catch (_) { }
    }
    setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m))
    stopResponding()
  }, [stopResponding])

  // ── Message feedback (like / dislike) ─────────────────────────────
  const handleFeedback = useCallback(async (msgId: string, currentRating: MessageRating, action: 'like' | 'dislike') => {
    // Clicking the active rating again → revoke (set to null)
    const newRating: MessageRating = currentRating === action ? null : action

    // Optimistic update
    setMessages(prev =>
      prev.map(m => m.id === msgId ? { ...m, feedback: { rating: newRating } } : m),
    )

    try {
      await updateFeedback({
        url: `messages/${msgId}/feedbacks`,
        body: { rating: newRating },
      })
    }
    catch {
      // Revert on failure
      setMessages(prev =>
        prev.map(m => m.id === msgId ? { ...m, feedback: { rating: currentRating } } : m),
      )
      Toast.notify({ type: 'error', message: t('app.chat.feedbackFailed') })
    }
  }, [t])

  // ── Keyboard: Enter to send, Shift+Enter for newline ──────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className={cn(s.chatContainer, 'flex flex-col h-full')}>
      {/* Message list */}
      <div ref={messageListRef} className={cn(s.messageList, 'grow')}>
        {loadingHistory && (
          <div className="flex justify-center items-center h-full">
            <Loading type="area" />
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className={s.emptyState}>
            <ChatBubbleOvalLeftEllipsisIcon className={s.emptyStateIcon} />
            <div className={s.emptyStateTitle}>{t('app.chat.emptyTitle')}</div>
            <div className={s.emptyStateDesc}>
              {t('app.chat.emptyDesc')}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              s.messageRow,
              msg.role === MessageRole.User ? s.messageRowUser : s.messageRowAssistant,
            )}
          >
            {/* Avatar */}
            <div className={cn(s.avatar, msg.role === MessageRole.User ? s.avatarUser : s.avatarAssistant)}>
              {msg.role === MessageRole.User ? 'U' : 'AI'}
            </div>

            {/* Bubble content */}
            <div className={s.messageBody}>
              {/* Agent thoughts */}
              {isAgentApp && msg.agent_thoughts && msg.agent_thoughts.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.agent_thoughts.map((thought: any) => (
                    <div key={thought.id} className={s.agentThought}>
                      <div className={s.agentThoughtLabel}>{t('app.chat.thinkingLabel')}</div>
                      <div>{thought.thought}</div>
                      {thought.tool && (
                        <div className="mt-1 text-xs">
                          🔧 <strong>{thought.tool}</strong>
                          {thought.tool_input && ` — ${thought.tool_input}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Main bubble */}
              <div
                className={cn(
                  s.bubble,
                  msg.role === MessageRole.User ? s.bubbleUser : s.bubbleAssistant,
                  msg.isStreaming && s.cursor,
                )}
              >
                {msg.role === MessageRole.Assistant
                  ? (
                    <>
                      <ReactMarkdown className="prose prose-sm max-w-none break-words">
                        {msg.content || (msg.isStreaming ? ' ' : '')}
                      </ReactMarkdown>
                      {msg.receivedFiles && msg.receivedFiles.length > 0 && (
                        <div className={s.receivedMediaList}>
                          {msg.receivedFiles
                            .filter((f: any) => (f.type === 'image' || f.type === 'video') && f.url)
                            .map((f: any, i: number) => {
                              const src = f.remote_url || f.url
                              if (f.type === 'video') {
                                return (
                                  // eslint-disable-next-line jsx-a11y/media-has-caption
                                  <video
                                    key={f.related_id || i}
                                    src={src}
                                    controls
                                    className={s.receivedVideo}
                                  />
                                )
                              }
                              return (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={f.related_id || i}
                                  src={src}
                                  alt={f.filename || `image-${i}`}
                                  className={s.receivedImage}
                                />
                              )
                            })}
                        </div>
                      )}
                    </>
                  )
                  : (
                    <>
                      {msg.content}
                    </>
                  )}
              </div>

              {/* Feedback (like / dislike) — only for completed assistant messages with a real Dify ID */}
              {msg.role === MessageRole.Assistant && !msg.isStreaming && msg.content && !msg.id.startsWith('assistant-') && (
                <div className={s.messageActions}>
                  <button
                    className={s.feedbackBtn}
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content)
                        .then(() => Toast.notify({ type: 'success', message: 'Copied to clipboard' }))
                        .catch(() => Toast.notify({ type: 'error', message: 'Failed to copy' }))
                    }}
                    title="Copy"
                  >
                    <span className="text-xs">复制</span>
                  </button>
                  <button
                    className={cn(s.feedbackBtn, msg.feedback?.rating === 'like' && s.feedbackBtnActive)}
                    onClick={() => handleFeedback(msg.id, msg.feedback?.rating ?? null, 'like')}
                    title={t('app.chat.likeTitle') as string}
                  >
                    <HandThumbUpIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className={cn(s.feedbackBtn, msg.feedback?.rating === 'dislike' && s.feedbackBtnActiveDislike)}
                    onClick={() => handleFeedback(msg.id, msg.feedback?.rating ?? null, 'dislike')}
                    title={t('app.chat.dislikeTitle') as string}
                  >
                    <HandThumbDownIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Suggested questions — outside the scroll area */}
      {suggestEnabled && suggestedQuestions.length > 0 && !isResponding && (
        <div className="px-10 pb-3">
          <div className={s.suggestedList}>
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                className={s.suggestedItem}
                onClick={() => {
                  setInputValue(q)
                  textareaRef.current?.focus()
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div
        className={s.inputArea}
      >
        {/* Toolbar */}
        <div className={s.inputToolbar} style={{ display: 'none' }}>
          <button
            className={cn(s.suggestToggle, suggestEnabled && s.suggestToggleActive)}
            onClick={handleSuggestToggle}
            disabled={suggestChecking}
            title={suggestEnabled ? t('app.chat.suggestionsDisableTitle') as string : t('app.chat.suggestionsEnableTitle') as string}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>{t('app.chat.suggestions')}</span>
          </button>
        </div>

        <div className={s.inputWrapper}>
          <textarea
            ref={textareaRef}
            className={s.inputTextarea}
            placeholder={t('app.chat.inputPlaceholder') as string}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isResponding}
          />

          {isResponding
            ? (
              <button className={s.stopButton} onClick={handleStop}>
                <StopIcon className="w-3.5 h-3.5" />
                <span>{t('app.chat.stopBtn')}</span>
              </button>
            )
            : (
              <button
                className={s.sendButton}
                onClick={handleSend}
                disabled={!inputValue.trim()}
                title="Send"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            )}
        </div>

        <div className={s.inputHint}>{t('app.chat.inputHint')}</div>
      </div>
    </div>
  )
}

export default React.memo(ChatGeneration)
