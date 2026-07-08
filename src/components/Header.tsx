import type { ReactNode } from 'react'

interface HeaderProps {
  title: string
  rightAction?: ReactNode
}

export function Header({ title, rightAction }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="header__title">{title}</h1>
      {rightAction && <div className="header__action">{rightAction}</div>}
    </header>
  )
}
