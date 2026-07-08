import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { OnboardingPage } from './routes/OnboardingPage'
import { HomePage } from './routes/HomePage'
import { SearchPage } from './routes/SearchPage'
import { RouteDetailPage } from './routes/RouteDetailPage'
import { hasSeenOnboarding, SettingsProvider } from './hooks/useSettings'
import { I18nProvider } from './i18n/I18nContext'

function OnboardingRedirect() {
  if (hasSeenOnboarding()) {
    return <Navigate to="/home" replace />
  }
  return <OnboardingPage />
}

export default function App() {
  return (
    <SettingsProvider>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<OnboardingRedirect />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/route/:operator/:route/:direction" element={<RouteDetailPage />} />
            <Route path="/route/:route/:direction" element={<RouteDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </SettingsProvider>
  )
}
