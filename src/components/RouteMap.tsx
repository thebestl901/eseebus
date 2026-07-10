import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { LatLngExpression } from 'leaflet'
import type { RouteStopPoint } from '../types/transport'
import 'leaflet/dist/leaflet.css'

interface RouteMapProps {
  coordinates: LatLngExpression[]
  stops?: RouteStopPoint[]
  selectedSeq?: number | null
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

function createStopIcon(seq: number, selected: boolean) {
  return L.divIcon({
    className: 'route-map-marker-wrap',
    html: `<span class="route-map-marker${selected ? ' route-map-marker--selected' : ''}">${seq}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export function RouteMap({ coordinates, stops = [], selectedSeq, height }: RouteMapProps) {
  const plottedStops = useMemo(
    () =>
      stops.filter(
        (stop) =>
          stop.lat != null &&
          stop.lng != null &&
          !Number.isNaN(stop.lat) &&
          !Number.isNaN(stop.lng),
      ),
    [stops],
  )

  if (coordinates.length === 0 && plottedStops.length === 0) {
    return (
      <div
        className="route-map route-map--empty"
        style={height != null ? { height } : undefined}
      >
        暫不支援
      </div>
    )
  }

  const center =
    coordinates[Math.floor(coordinates.length / 2)] ??
    ([plottedStops[0]!.lat!, plottedStops[0]!.lng!] as LatLngExpression)

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
        {coordinates.length > 0 && (
          <Polyline positions={coordinates} color="var(--accent-color)" weight={4} />
        )}
        {plottedStops.map((stop) => (
          <Marker
            key={`${stop.seq}-${stop.stopId}`}
            position={[stop.lat!, stop.lng!]}
            icon={createStopIcon(stop.seq, selectedSeq === stop.seq)}
            zIndexOffset={selectedSeq === stop.seq ? 1000 : stop.seq}
          />
        ))}
        <FitBounds
          coordinates={
            coordinates.length > 0
              ? coordinates
              : plottedStops.map((stop) => [stop.lat!, stop.lng!] as LatLngExpression)
          }
        />
        <InvalidateOnResize height={height} />
      </MapContainer>
    </div>
  )
}
