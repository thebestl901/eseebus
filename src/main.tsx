import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { applySettingsOnLoad } from './hooks/useSettings'
import { preloadWeatherIcons } from './services/weatherIconCache'
import './styles/theme.css'
import './styles/accessibility.css'
import './components/components.css'

applySettingsOnLoad()
preloadWeatherIcons()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
