"use client";

import { MapPin, Camera } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { GeoTag } from "@/types/photo.types";

interface PhotoMarkerProps {
  tag: GeoTag;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

// Create premium photo marker with glassmorphism
const createPhotoMarker = (photoUrl: string, isSelected: boolean) => {
  if (typeof window === 'undefined') return null;
  const L = require("leaflet");

  const markerHtml = `
    <div class="relative group cursor-pointer">
      <!-- Pulse animation ring for selected marker -->
      ${isSelected ? `
        <div class="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
        <div class="absolute inset-0 rounded-full bg-emerald-400/30 animate-pulse"></div>
      ` : ''}
      
      <!-- Main marker container with glassmorphism -->
      <div class="relative w-14 h-14 rounded-full ${isSelected
      ? "ring-4 ring-emerald-400 ring-offset-2 ring-offset-white/50 shadow-2xl shadow-emerald-500/50"
      : "ring-2 ring-white/80 shadow-xl hover:ring-emerald-300 hover:shadow-2xl"
    } overflow-hidden backdrop-blur-sm bg-white/95 transition-all duration-300 transform ${isSelected ? "scale-110" : "hover:scale-105"
    }">
        <!-- Photo -->
        <img
          src="${photoUrl}"
          alt="Photo marker"
          class="w-full h-full object-cover"
          onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600\\\'><svg class=\\'w-6 h-6 text-white\\' fill=\\'none\\' stroke=\\'currentColor\\' viewBox=\\'0 0 24 24\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z\\'></path><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M15 13a3 3 0 11-6 0 3 3 0 016 0z\\'></path></svg></div>'"
        />
        
        <!-- Gradient overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <!-- Camera icon badge -->
        <div class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
          <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
      </div>
      
      <!-- Premium pointer with gradient -->
      <div class="absolute -bottom-3 left-1/2 -translate-x-1/2">
        <div class="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] ${isSelected ? "border-t-emerald-400" : "border-t-white/95"
    } drop-shadow-lg"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: markerHtml,
    className: "photo-marker-premium",
    iconSize: [56, 68],
    iconAnchor: [28, 68],
    popupAnchor: [0, -68],
  });
};

// Premium fallback marker for photos without URLs
const createDefaultMarker = (isSelected: boolean) => {
  if (typeof window === 'undefined') return null;
  const L = require("leaflet");

  const iconMarkup = renderToStaticMarkup(
    <MapPin className="w-6 h-6 text-white" strokeWidth={2.5} />
  );

  const markerHtml = `
    <div class="relative group cursor-pointer">
      <!-- Pulse animation ring for selected marker -->
      ${isSelected ? `
        <div class="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
        <div class="absolute inset-0 rounded-full bg-emerald-400/30 animate-pulse"></div>
      ` : ''}
      
      <!-- Main marker with gradient -->
      <div class="relative w-14 h-14 rounded-full ${isSelected
      ? "ring-4 ring-emerald-400 ring-offset-2 ring-offset-white/50 shadow-2xl shadow-emerald-500/50"
      : "ring-2 ring-white/80 shadow-xl hover:ring-emerald-300 hover:shadow-2xl"
    } overflow-hidden backdrop-blur-sm transition-all duration-300 transform ${isSelected ? "scale-110" : "hover:scale-105"
    }">
        <!-- Gradient background -->
        <div class="w-full h-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center relative">
          <!-- Animated gradient overlay -->
          <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <!-- Icon -->
          <div class="relative z-10">
            ${iconMarkup}
          </div>
        </div>
        
        <!-- Location badge -->
        <div class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
          <svg class="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
          </svg>
        </div>
      </div>
      
      <!-- Premium pointer -->
      <div class="absolute -bottom-3 left-1/2 -translate-x-1/2">
        <div class="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] ${isSelected ? "border-t-emerald-400" : "border-t-emerald-500"
    } drop-shadow-lg"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: markerHtml,
    className: "photo-marker-premium",
    iconSize: [56, 68],
    iconAnchor: [28, 68],
    popupAnchor: [0, -68],
  });
};

export function PhotoMarker({ tag, index, isSelected, onClick }: PhotoMarkerProps) {
  const { Marker, Popup } = require("react-leaflet");
  const L = require("leaflet");

  const lat = parseFloat(tag.latitude || "0");
  const lng = parseFloat(tag.longitude || "0");

  if (!tag.latitude || !tag.longitude || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  const icon = tag.url
    ? createPhotoMarker(tag.url, isSelected)
    : createDefaultMarker(isSelected);

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Popup className="premium-popup">
        <div className="min-w-[280px] max-w-[320px]">
          {/* Photo Preview */}
          {tag.url && (
            <div className="relative mb-3 rounded-xl overflow-hidden shadow-lg group">
              <img
                src={tag.url}
                alt={tag.photo_name || "Photo"}
                className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Camera icon */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Camera className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          )}

          {/* Photo Info */}
          <div className="space-y-2">
            {/* Title */}
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {tag.photo_name || `Photo ${index + 1}`}
            </h3>

            {/* Coordinates */}
            <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">GPS Coordinates</p>
                <p className="text-xs font-mono text-slate-900 dark:text-white">
                  {parseFloat(tag.latitude!).toFixed(6)}, {parseFloat(tag.longitude!).toFixed(6)}
                </p>
              </div>
            </div>

            {/* Timestamp */}
            {tag.timestamp && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{new Date(tag.timestamp).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
