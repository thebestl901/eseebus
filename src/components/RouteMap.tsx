import { useEffect } from 'react'
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface RouteMapProps {
  coordinates: LatLngExpression[]
}

function FitBounds({ coordinates }: { coordinates: LatLngExpression[] }) {
  const map = useMap()
  useEffect(() => {
    if (coordinates.length > 0) {
      map.fitBounds(coordinates as [number, number][], { padding: [30, 30] })
    }
  }, [map, coordinates])
  return null
}

export function RouteMap({ coordinates }: RouteMapProps) {
  if (coordinates.length === 0) {
    return <div className="route-map route-map--empty">暫不支援</div>
  }

  const center = coordinates[Math.floor(coordinates.length / 2)]

  return (
    <div className="route-map">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={coordinates} color="var(--accent-color)" weight={4} />
        <FitBounds coordinates={coordinates} />
      </MapContainer>
    </div>
  )
}
