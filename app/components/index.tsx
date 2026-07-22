'use client'
import Loading from '@/app/components/base/loading'
import type { AppTypeValue } from '@/config'
import { setLocaleOnClient } from '@/locales/client'
import { fetchAppParams } from '@/service'
import { difyLocaleToAppLocale } from '@/utils/resolve-app-type'
import React, { useCallback, useEffect, useState } from 'react'
import ChatGeneration from './chat-generation'
import ConversationSidebar from './conversation-sidebar'

const AppEntry: React.FC = () => {
  const [appParams, setAppParams] = useState<any>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [sidebarRefreshSignal, setSidebarRefreshSignal] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const triggerSidebarRefresh = useCallback(() => {
    setSidebarRefreshSignal(prev => prev + 1)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  const appType: AppTypeValue = 'chat'

  // Apply glass theme and auto-switch locale from Dify's default_language
  useEffect(() => {
    document.documentElement.dataset.theme = 'glass'
    let cancelled = false
    fetchAppParams().then((params) => {
      if (cancelled || !params) return
      setAppParams(params)
      const difyLang = (params as any)?.default_language
      if (difyLang) {
        const locale = difyLocaleToAppLocale(difyLang)
        if (locale)
          setLocaleOnClient(locale, /* notReload */ true)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (appParams === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
        <Loading type="area" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', background: 'var(--color-bg)' }}>
      <ConversationSidebar
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        refreshSignal={sidebarRefreshSignal}
        appType={appType}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <div style={{ flex: 1, overflow: 'hidden', background: 'var(--color-bg)' }}>
        <ChatGeneration
          conversationId={activeConversationId}
          appType={appType}
          appParams={appParams}
          onConversationCreated={(id) => {
            setActiveConversationId(id)
            triggerSidebarRefresh()
          }}
          onMessagesChange={triggerSidebarRefresh}
        />
      </div>
    </div>
  )
}

export default AppEntry

