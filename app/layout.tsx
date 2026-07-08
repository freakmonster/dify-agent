import { getLocaleOnServer } from '@/i18n/server'

import './styles/globals.css'
import './styles/markdown.scss'

const LocaleLayout = async ({
  children,
}: {
  children: React.ReactNode
}) => {
  const locale = await getLocaleOnServer()
  return (
    <html lang={locale ?? 'en'} className="h-full" suppressHydrationWarning>
      <head>
        {/* Inline SVG favicon — AI chat bubble icon */}
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%238B5CF6'/%3E%3Cstop offset='100%25' stop-color='%233B82F6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='6' fill='url(%23g)'/%3E%3Cpath d='M8 12a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2h-8l-4 3v-3a2 2 0 01-2-2v-6z' fill='white' opacity='0.95'/%3E%3Ccircle cx='12' cy='15' r='1.2' fill='%238B5CF6'/%3E%3Ccircle cx='16' cy='15' r='1.2' fill='%238B5CF6'/%3E%3Ccircle cx='20' cy='15' r='1.2' fill='%238B5CF6'/%3E%3C/svg%3E" />
        {/* Inline script: read saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('app-theme');
            if(t) document.documentElement.dataset.theme = t;
          })();
        ` }} />
      </head>
      <body className="h-full">
        {children}
      </body>
    </html>
  )
}

export default LocaleLayout
