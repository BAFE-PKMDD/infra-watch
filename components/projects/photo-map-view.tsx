"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { useExtractExif } from "@/hooks/use-extract-exif";
import { useKmlLoader } from "@/hooks/use-kml-loader";
import { useMapLayers } from "@/hooks/use-map-layers";
import { GeoTag } from "@/types/photo.types";
import { cn } from "@/lib/utils";

interface PhotoMapViewProps {
  projectId: string;
  geotags: GeoTag[];
  projectCoordinates?: string;
  selectedIndex: number;
  onPhotoClick: (tag: GeoTag, index: number) => void;
  kmlLink?: string;
}

const INITIAL_LATITUDE = 12.8797;
const INITIAL_LONGITUDE = 121.774;
const INITIAL_ZOOM = 6;

const MAP_HEIGHT = "600px";
const FLY_DURATION = 1.5;
const FLY_EASE_LINEARITY = 0.25;
const MAP_PADDING = [50, 50];
const MAX_FLY_ZOOM = 16;
const BOUNDS_PADDING = 0.2;
const ANIMATION_TIMEOUT = 300;
const ANIMATION_END_TIMEOUT = 1600;

// Initial region - Philippines
const INITIAL_REGION = {
  latitude: INITIAL_LATITUDE,
  longitude: INITIAL_LONGITUDE,
  zoom: INITIAL_ZOOM,
};

type CoordinatePair = [number, number];

function parseProjectCoordinates(projectCoordinates?: string): CoordinatePair | null {
  if (!projectCoordinates) return null;

  const [lat, lng] = projectCoordinates.split(",").map((value) => Number.parseFloat(value.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return [lat, lng];
}

export function PhotoMapView({
  projectId,
  geotags,
  projectCoordinates,
  selectedIndex,
  onPhotoClick,
  kmlLink,
}: PhotoMapViewProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Extract EXIF coordinates from photos
  const { geotags: extractedGeotags, loading: extractingExif, progress } = useExtractExif({
    geotags,
    projectId,
  });

  const { geoJsonData, loading: loadingKml } = useKmlLoader({ projectId });
  const {
    layers: mapLayers,
    loading: loadingLayers,
    visibleLayers,
    toggleLayer,
  } = useMapLayers();

  // Use extracted geotags or fall back to original
  const validGeotags = extractedGeotags.filter(
    (tag) => tag.latitude && tag.longitude && !isNaN(parseFloat(tag.latitude)) && !isNaN(parseFloat(tag.longitude))
  );

  // Only load map components on client side
  useEffect(() => {
    setMapReady(true);
  }, []);

  // Show loading state while extracting EXIF or loading map
  if (!mapReady || extractingExif || loadingKml) {
    return (
      <div
        className={cn("relative w-full rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-transparent overflow-hidden")}
        style={{ height: MAP_HEIGHT }}
      >
        {/* Transparent overlay with loading indicator */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center px-6 py-4 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
            <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm font-semibold text-white">
              {extractingExif ? 'Extracting GPS data from photos...' : loadingKml ? 'Loading KML alignment...' : 'Loading map...'}
            </p>
            <p className="text-xs text-white/80 mt-1">
              {extractingExif ? 'Processing images in batch' : loadingKml ? 'Parsing road path data' : 'Preparing satellite view'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <MapContent
    geotags={geotags}
    validGeotags={validGeotags}
    projectCoordinates={projectCoordinates}
    selectedIndex={selectedIndex}
    onPhotoClick={onPhotoClick}
    hasAnimated={hasAnimated}
    setHasAnimated={setHasAnimated}
    isAnimating={isAnimating}
    setIsAnimating={setIsAnimating}
    geoJsonData={geoJsonData}
    kmlLink={kmlLink}
    mapLayers={mapLayers}
    visibleLayers={visibleLayers}
    toggleLayer={toggleLayer}
    loadingLayers={loadingLayers}
  />;
}

// Component to handle map animation (module scope for stable identity)
function MapAnimator({
  hasAnimated,
  setHasAnimated,
  setIsAnimating,
  projectCoordinates,
  validGeotags,
  geoJsonData,
  kmlLink,
}: {
  hasAnimated: boolean;
  setHasAnimated: (value: boolean) => void;
  setIsAnimating: (value: boolean) => void;
  projectCoordinates?: string;
  validGeotags: GeoTag[];
  geoJsonData: any;
  kmlLink?: string;
}) {
  const { useMap } = require("react-leaflet");
  const L = require("leaflet");
  const map = useMap();

  useEffect(() => {
    if (hasAnimated) return;

    // If we have a kmlLink but data isn't ready yet, wait for it
    if (kmlLink && !geoJsonData) return;

    const timer = setTimeout(() => {
      try {
        setIsAnimating(true);

        // Parse project coordinates
        let targetLat = INITIAL_REGION.latitude;
        let targetLng = INITIAL_REGION.longitude;

        if (projectCoordinates) {
          const [lat, lng] = projectCoordinates.split(",").map((s: string) => parseFloat(s.trim()));
          if (!isNaN(lat) && !isNaN(lng)) {
            targetLat = lat;
            targetLng = lng;
          }
        }

        // Calculate bounds from geotags
        const validCoords = validGeotags
          .map((tag) => [parseFloat(tag.latitude!), parseFloat(tag.longitude!)] as [number, number]);

        let bounds = validCoords.length > 0 ? L.latLngBounds(validCoords) : null;

        // Extend bounds with KML data if available
        if (geoJsonData) {
          try {
            const geoJsonLayer = L.geoJSON(geoJsonData);
            const kmlBounds = geoJsonLayer.getBounds();
            if (kmlBounds.isValid()) {
              if (bounds) {
                bounds.extend(kmlBounds);
              } else {
                bounds = kmlBounds;
              }
            }
          } catch (e) {
            console.error("Error calculating KML bounds:", e);
          }
        }

        if (bounds) {
          const paddedBounds = bounds.pad(BOUNDS_PADDING); // Add 20% padding

          // Animate to the bounds
          map.flyToBounds(paddedBounds, {
            duration: FLY_DURATION,
            easeLinearity: FLY_EASE_LINEARITY,
            padding: MAP_PADDING,
            maxZoom: MAX_FLY_ZOOM,
          });
        } else {
          // Fallback: fly to project coordinates
          map.flyTo([targetLat, targetLng], INITIAL_ZOOM + 8, {
            duration: FLY_DURATION,
            easeLinearity: FLY_EASE_LINEARITY,
          });
        }

        setTimeout(() => {
          setIsAnimating(false);
          setHasAnimated(true);
        }, ANIMATION_END_TIMEOUT);
      } catch (error) {
        console.error("Map animation error:", error);
        setIsAnimating(false);
        setHasAnimated(true);
      }
    }, ANIMATION_TIMEOUT);

    return () => clearTimeout(timer);
  }, [hasAnimated, map, geoJsonData, kmlLink, setIsAnimating, setHasAnimated, projectCoordinates, validGeotags]);

  return null;
}

// Removed WmsLayerRenderer since WMS layers are not used in InfraWatch

// Separate component for map content that uses leaflet
function MapContent({
  geotags,
  validGeotags,
  projectCoordinates,
  selectedIndex,
  onPhotoClick,
  hasAnimated,
  setHasAnimated,
  isAnimating,
  setIsAnimating,
  geoJsonData,
  kmlLink,
  mapLayers,
  visibleLayers,
  toggleLayer,
  loadingLayers,
}: {
  geotags: GeoTag[];
  validGeotags: GeoTag[];
  projectCoordinates?: string;
  selectedIndex: number;
  onPhotoClick: (tag: GeoTag, index: number) => void;
  hasAnimated: boolean;
  setHasAnimated: (value: boolean) => void;
  isAnimating: boolean;
  setIsAnimating: (value: boolean) => void;
  geoJsonData: any;
  kmlLink?: string;
  mapLayers: any[];
  visibleLayers: Set<string>;
  toggleLayer: (id: string) => void;
  loadingLayers: boolean;
}) {
  const { MapContainer, TileLayer, GeoJSON } = require("react-leaflet");
  const { PhotoMarker } = require("./photo-marker");
  const projectPoint = parseProjectCoordinates(projectCoordinates);
  const hasProjectPoint = projectPoint !== null;

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
      <MapContainer
        center={[INITIAL_REGION.latitude, INITIAL_REGION.longitude]}
        zoom={INITIAL_REGION.zoom}
        className="w-full h-full z-0"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
          url="http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}"
          className="map-tiles"
        />

        <MapAnimator
          hasAnimated={hasAnimated}
          setHasAnimated={setHasAnimated}
          setIsAnimating={setIsAnimating}
          projectCoordinates={projectCoordinates}
          validGeotags={validGeotags}
          geoJsonData={geoJsonData}
          kmlLink={kmlLink}
        />


        {geoJsonData && (
          <GeoJSON
            data={geoJsonData}
            style={{
              color: "#3b82f6",
              weight: 6,
              opacity: 1,
            }}
          />
        )}

        {validGeotags.map((tag, index) => (
          <PhotoMarker
            key={tag.id || index}
            tag={tag}
            index={index}
            isSelected={selectedIndex === index}
            onClick={() => onPhotoClick(tag, index)}
          />
        ))}

        {validGeotags.length === 0 && projectPoint && (
          <ProjectLocationMarker position={projectPoint} geotagCount={geotags.length} />
        )}
      </MapContainer>

      {validGeotags.length === 0 && !geoJsonData && !hasProjectPoint && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center max-w-md px-6 py-4 bg-black/40 backdrop-blur-md rounded-lg shadow-lg border border-white/10 pointer-events-auto">
            <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-3">
              <MapPin className="size-7 text-white" />
            </div>
            <p className="text-sm font-semibold text-white">
              No GPS data found
            </p>
            <p className="text-xs text-white/80 mt-1">
              {geotags.length > 0
                ? 'The photos were checked for GPS coordinates but none were found in the EXIF metadata.'
                : 'No photos available to display on map.'}
            </p>
          </div>
        </div>
      )}

      {validGeotags.length === 0 && hasProjectPoint && (
        <div className="absolute left-4 top-4 z-10 max-w-sm rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white shadow-lg backdrop-blur-md">
          <p className="text-sm font-semibold">Showing project location</p>
          <p className="mt-1 text-xs text-white/80">
            Photo-level GPS was not found, so the map is centered on the project coordinates.
          </p>
        </div>
      )}

      {/* BAFE Logo - Bottom Left */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <img
          src="/bafe-logo.png"
          alt="BAFE Logo"
          className="h-20 w-auto drop-shadow-lg"
        />
      </div>
    </div>
  );
}

function ProjectLocationMarker({ position, geotagCount }: { position: CoordinatePair; geotagCount: number }) {
  const { Marker, Popup } = require("react-leaflet");
  const L = require("leaflet");
  const iconMarkup = renderToStaticMarkup(<MapPin className="size-5 text-white" strokeWidth={2.5} />);
  const icon = L.divIcon({
    html: `
      <div class="relative">
        <div class="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-emerald-600 shadow-xl shadow-emerald-900/30">
          ${iconMarkup}
        </div>
        <div class="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-white bg-emerald-600"></div>
      </div>
    `,
    className: "project-location-marker",
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -52],
  });

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-900">Project location</p>
          <p className="text-xs text-slate-600">
            {geotagCount} photo{geotagCount === 1 ? "" : "s"} linked to this project
          </p>
          <p className="font-mono text-xs text-slate-500">
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}
