import type { ReactNode } from 'react'

interface HeaderProps {
  title: ReactNode
  leftAction?: ReactNode
  rightAction?: ReactNode
}

export function Header({ title, leftAction, rightAction }: HeaderProps) {
  return (
    <header className="header">
      {leftAction && <div className="header__left">{leftAction}</div>}
      <h1 className="header__title">{title}</h1>
      {rightAction && <div className="header__action">{rightAction}</div>}
    </header>
  )
}
