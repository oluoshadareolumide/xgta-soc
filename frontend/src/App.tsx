import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import LoginPage from '@/pages/LoginPage'

// Lazy-loaded pages (Batch 2 will add these)
// import DashboardPage from '@/pages/DashboardPage'
// import AlertsPage from '@/pages/AlertsPage'
// import ActorsPage from '@/pages/ActorsPage'
// import IOCPage from '@/pages/IOCPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  const { fetchMe, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) fetchMe()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                {/* Dashboard shell — full pages coming in Batch 2 */}
                <div style={{
                  minHeight: '100vh', background: '#070d1a',
                  fontFamily: "'Space Mono', monospace", color: '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
                }}>
                  <div style={{ fontSize: 48 }}>⬡</div>
                  <div style={{ fontSize: 20, color: '#c084fc' }}>XGTA-SOC — Batch 1 Complete</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>
                    Backend API running. Full UI coming in Batch 2.
                  </div>
                  <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: '#818cf8', marginTop: 8 }}>
                    → View API Docs at localhost:8000/docs
                  </a>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
