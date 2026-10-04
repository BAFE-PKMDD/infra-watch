"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Tooltip, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { EvidenceBasemapLayer } from "@/components/shared/evidence-basemap";
import { Button } from "@/components/ui/button";
import type { LocatedSmsRecord } from "@/lib/sms-grievance/location";
import styles from "./sms-grievance-map.module.css";

const markerIcon = L.divIcon({
  className: styles.marker,
  html: '<span aria-hidden="true"></span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});
const selectedIcon = L.divIcon({
  className: `${styles.marker} ${styles.selected}`,
  html: '<span aria-hidden="true"></span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

function Viewport({ records, selectedId, fitRequest }: {
  records: LocatedSmsRecord[];
  selectedId: string | null;
  fitRequest: number;
}) {
  const map = useMap();
  const geometry = records.map(({ coordinates: { lat, lng } }) => `${lat},${lng}`).join("|");
  const selected = records.find((record) => record.id === selectedId)?.coordinates;
  const lat = selected?.lat;
  const lng = selected?.lng;

  useEffect(() => {
    const points = geometry.split("|").map((pair) => pair.split(",").map(Number) as [number, number]);
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13, animate: false });
  }, [map, geometry, fitRequest]);

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    if (map.getZoom() < 13 || !map.getBounds().pad(-0.1).contains([lat, lng])) {
      map.setView([lat, lng], Math.max(map.getZoom(), 13), { animate: false });
    }
  }, [map, selectedId, lat, lng]);

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function SmsGrievanceMapCanvas({ records, selectedId, onSelect, fitRequest, singleMessage = false }: {
  records: LocatedSmsRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  fitRequest: number;
  singleMessage?: boolean;
}) {
  const [tileError, setTileError] = useState(false);
  const [revision, setRevision] = useState(0);

  return (
    <div className={styles.map}>
      {tileError && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p>Some map tiles could not load. Message coordinates are still available below.</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => {
            setTileError(false);
            setRevision((value) => value + 1);
          }}>Retry map</Button>
        </div>
      )}
      <div role="region" aria-label="Approximate SMS grievance locations" className={`relative isolate bg-slate-100 ${singleMessage ? "h-80 sm:h-96" : "h-96 sm:h-[28rem]"}`}>
        <MapContainer center={[12.8797, 121.774]} zoom={5} maxZoom={20} scrollWheelZoom={false} zoomControl={false} zoomAnimation={false} className="h-full w-full">
          <EvidenceBasemapLayer basemapId="satellite" revision={revision} onTileError={() => setTileError(true)} />
          <ZoomControl position="bottomleft" />
          <Viewport records={records} selectedId={selectedId} fitRequest={fitRequest} />
          {records.map((record) => (
            <Marker
              key={record.id}
              position={[record.coordinates.lat, record.coordinates.lng]}
              icon={record.id === selectedId ? selectedIcon : markerIcon}
              zIndexOffset={record.id === selectedId ? 1000 : 0}
              title={`${record.externalMessageId}: approximate location`}
              alt={`Select ${record.externalMessageId}`}
              eventHandlers={{
                click: () => onSelect(record.id),
                keydown: (event) => {
                  if (event.originalEvent.key === "Enter" || event.originalEvent.key === " ") {
                    L.DomEvent.stop(event.originalEvent);
                    onSelect(record.id);
                  }
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>{record.externalMessageId}</Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
