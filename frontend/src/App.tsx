import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import LoginPage from '@/pages/LoginPage'
import AppShell from '@/components/layout/AppShell'
import { Spinner } from '@/components/ui'
import OverviewPage from '@/pages/OverviewPage'
import AlertsPage from '@/pages/AlertsPage'
import ActorsPage from '@/pages/ActorsPage'
import IOCPage from '@/pages/IOCPage'
import GraphPage from '@/pages/GraphPage'
import PlaybooksPage from '@/pages/PlaybooksPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <AppShell>{children}</AppShell>
}

function App() {
  const { fetchMe, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) fetchMe()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: #0f172a; }
          ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
          @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
          @keyframes spin { to { transform: rotate(360deg); } }
          select option { background: #111827; color: #e2e8f0; }
        `}</style>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedLayout><OverviewPage /></ProtectedLayout>} />
          <Route path="/alerts" element={<ProtectedLayout><AlertsPage /></ProtectedLayout>} />
          <Route path="/graph" element={<ProtectedLayout><GraphPage /></ProtectedLayout>} />
          <Route path="/actors" element={<ProtectedLayout><ActorsPage /></ProtectedLayout>} />
          <Route path="/iocs" element={<ProtectedLayout><IOCPage /></ProtectedLayout>} />
          <Route path="/playbooks" element={<ProtectedLayout><PlaybooksPage /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
