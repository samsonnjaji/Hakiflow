import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CasePage } from './pages/CasePage'
import { DashboardPage } from './pages/DashboardPage'
import { IntakePage } from './pages/IntakePage'
import { LoginPage } from './pages/LoginPage'
import { ParalegalPage } from './pages/ParalegalPage'
import { SecurityPage } from './pages/SecurityPage'

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const ContractPage = lazy(() => import('./pages/ContractPage').then((module) => ({ default: module.ContractPage })))
const PlatformPage = lazy(() => import('./pages/PlatformPage').then((module) => ({ default: module.PlatformPage })))

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="route-loading" role="status"><span className="spinner" /> Loading workspace…</div>}>{children}</Suspense>
}

function ProtectedLayout() {
  const { user } = useAuth()
  return user ? <AppShell /> : <Navigate to="/" replace />
}

function RoleHome() {
  const { user } = useAuth()
  return user?.role !== 'claimant' ? <Navigate to="/app/review" replace /> : <DashboardPage />
}

function PublicHome() {
  const { user } = useAuth()
  return user ? <Navigate to={user.role !== 'claimant' ? '/app/review' : '/app'} replace /> : <LoginPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/app" element={<ProtectedLayout />}>
            <Route index element={<RoleHome />} />
            <Route path="new" element={<IntakePage />} />
            <Route path="cases/:id" element={<CasePage />} />
            <Route path="review" element={<ParalegalPage />} />
            <Route path="analytics" element={<LazyPage><AnalyticsPage /></LazyPage>} />
            <Route path="contracts" element={<LazyPage><ContractPage /></LazyPage>} />
            <Route path="platform" element={<LazyPage><PlatformPage /></LazyPage>} />
            <Route path="security" element={<SecurityPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
