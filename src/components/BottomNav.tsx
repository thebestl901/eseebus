import { NavLink } from 'react-router-dom'
import { useTranslation } from '../i18n/I18nContext'

export function BottomNav() {
  const { t } = useTranslation()
  const navItems = [
    { to: '/home', label: t('navHome'), icon: '🏠' },
    { to: '/search', label: t('navSearch'), icon: '🔍' },
  ]

  return (
    <nav className="bottom-nav" aria-label={t('mainNav')}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
