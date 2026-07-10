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
  onStopSelect?: (seq: number) => void
}

function InvalidateOnResize({ height }: { height?: number }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [map, height])
  return null
}

function FitBounds({ coordinates, enabled }: { coordinates: LatLngExpression[]; enabled: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled || coordinates.length === 0) return
    map.fitBounds(coordinates as [number, number][], { padding: [30, 30] })
  }, [map, coordinates, enabled])
  return null
}

function FocusStop({ stop, neighbors }: { stop: RouteStopPoint | null; neighbors: RouteStopPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (!stop || stop.lat == null || stop.lng == null) return

    const nearby = neighbors
      .filter((n) => n.lat != null && n.lng != null)
      .map((n) => [n.lat!, n.lng!] as [number, number])

    const points: [number, number][] = [[stop.lat, stop.lng], ...nearby]

    if (points.length === 1) {
      map.flyTo(points[0], 16, { duration: 0.45 })
      return
    }

    map.flyToBounds(L.latLngBounds(points), {
      padding: [36, 36],
      maxZoom: 16,
      duration: 0.45,
    })
  }, [map, stop, neighbors])
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

export function RouteMap({ coordinates, stops = [], selectedSeq, height, onStopSelect }: RouteMapProps) {
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

  const selectedStop = useMemo(
    () => plottedStops.find((stop) => stop.seq === selectedSeq) ?? null,
    [plottedStops, selectedSeq],
  )

  const focusNeighbors = useMemo(() => {
    if (!selectedStop) return []
    const index = plottedStops.findIndex((stop) => stop.seq === selectedStop.seq)
    if (index < 0) return []
    return plottedStops.slice(Math.max(0, index - 1), index + 2).filter((stop) => stop.seq !== selectedStop.seq)
  }, [plottedStops, selectedStop])

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
            eventHandlers={{
              click: () => onStopSelect?.(stop.seq),
            }}
          />
        ))}
        <FitBounds
          enabled={selectedSeq == null}
          coordinates={
            coordinates.length > 0
              ? coordinates
              : plottedStops.map((stop) => [stop.lat!, stop.lng!] as LatLngExpression)
          }
        />
        <FocusStop stop={selectedStop} neighbors={focusNeighbors} />
        <InvalidateOnResize height={height} />
      </MapContainer>
    </div>
  )
}
