import { useEffect } from 'react'
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface RouteMapProps {
  coordinates: LatLngExpression[]
  height?: number
}

function InvalidateOnResize({ height }: { height?: number }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [map, height])
  return null
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

export function RouteMap({ coordinates, height }: RouteMapProps) {
  if (coordinates.length === 0) {
    return (
      <div
        className="route-map route-map--empty"
        style={height != null ? { height } : undefined}
      >
        暫不支援
      </div>
    )
  }

  const center = coordinates[Math.floor(coordinates.length / 2)]

  return (
    <div className="route-map" style={height != null ? { height } : undefined}>
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
        <InvalidateOnResize height={height} />
      </MapContainer>
    </div>
  )
}
