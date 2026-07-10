import { useEffect, useState } from 'react'

const ROTATE_INTERVAL_MS = 5000

interface HeaderWeatherProps {
  items: string[]
}

export function HeaderWeather({ items }: HeaderWeatherProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [items])

  useEffect(() => {
    if (items.length <= 1) return
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % items.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [items])

  if (items.length === 0) return null

  return (
    <div className="header-weather" aria-live="polite">
      <span className="header-weather__text" key={index}>
        {items[index]}
      </span>
    </div>
  )
}
