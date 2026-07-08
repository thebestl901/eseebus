import { useNavigate } from 'react-router-dom'
import { hasSeenOnboarding, markOnboardingSeen, useSettings } from '../hooks/useSettings'
import { useTranslation } from '../i18n/I18nContext'
import { LanguageSelector } from '../components/LanguageSelector'
import { APP_VERSION, GITHUB_REPO_URL } from '../constants/appInfo'

const STEP_KEYS = [
  { icon: '⭐', title: 'step1Title', desc: 'step1Desc' },
  { icon: '🏠', title: 'step2Title', desc: 'step2Desc' },
  { icon: '🔍', title: 'step3Title', desc: 'step3Desc' },
  { icon: '⚙️', title: 'step4Title', desc: 'step4Desc' },
  { icon: '📲', title: 'step5Title', desc: 'step5Desc' },
] as const

export function OnboardingPage() {
  const navigate = useNavigate()
  const seen = hasSeenOnboarding()
  const { settings, updateSettings } = useSettings()
  const { t } = useTranslation()

  const handleStart = () => {
    markOnboardingSeen()
    navigate('/home')
  }

  return (
    <div className="app-layout app-layout--no-nav onboarding">
      <div className="onboarding__hero">
        <h1 className="onboarding__title">{t('appName')}</h1>
        <p className="onboarding__subtitle">{t('appTagline')}</p>
      </div>

      <div className="onboarding__steps">
        {STEP_KEYS.map((step, i) => (
          <div key={i} className="onboarding-step">
            <span className="onboarding-step__icon" aria-hidden="true">
              {step.icon}
            </span>
            <div className="onboarding-step__content">
              <h2 className="onboarding-step__title">
                {i + 1}. {t(step.title)}
              </h2>
              <p className="onboarding-step__desc">{t(step.desc)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="onboarding__footer">
        <LanguageSelector
          locale={settings.locale}
          onChange={(locale) => updateSettings({ locale })}
          variant="onboarding"
        />
        <button className="onboarding__start-btn" onClick={handleStart}>
          {t('startUsing')}
        </button>
        {seen && (
          <button className="onboarding__skip-link" onClick={() => navigate('/home')}>
            {t('skipToHome')}
          </button>
        )}
      </div>

      <section className="onboarding__about" aria-label={t('about')}>
        <h2 className="onboarding__about-title">{t('about')}</h2>
        <div className="onboarding__about-list">
          <details className="onboarding-about">
            <summary className="onboarding-about__summary">{t('credit')}</summary>
            <div className="onboarding-about__body">
              <p>{t('creditP1')}</p>
              <p>{t('creditP2')}</p>
            </div>
          </details>
          <details className="onboarding-about">
            <summary className="onboarding-about__summary">{t('dataSources')}</summary>
            <div className="onboarding-about__body">
              <ul>
                <li>{t('sourceKmb')}</li>
                <li>{t('sourceCtb')}</li>
                <li>{t('sourceGmb')}</li>
                <li>{t('sourceMap')}</li>
              </ul>
              <p>{t('sourceNote')}</p>
            </div>
          </details>
          <details className="onboarding-about">
            <summary className="onboarding-about__summary">{t('privacyPolicy')}</summary>
            <div className="onboarding-about__body">
              <ul>
                <li>{t('privacy1')}</li>
                <li>{t('privacy2')}</li>
                <li>{t('privacy3')}</li>
                <li>{t('privacy4')}</li>
              </ul>
            </div>
          </details>
          <a
            className={`onboarding-about onboarding-about--link${GITHUB_REPO_URL ? '' : ' onboarding-about--link-disabled'}`}
            href={GITHUB_REPO_URL || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!GITHUB_REPO_URL}
            onClick={(e) => {
              if (!GITHUB_REPO_URL) e.preventDefault()
            }}
          >
            <span className="onboarding-about__summary onboarding-about__summary--link">
              {t('githubLink')}
            </span>
          </a>
        </div>
        <p className="onboarding__version">{t('versionLabel', { version: APP_VERSION })}</p>
      </section>
    </div>
  )
}
