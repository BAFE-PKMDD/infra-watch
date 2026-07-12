export function useMapLayers() {
  return {
    layers: [],
    loading: false,
    visibleLayers: new Set<string>(),
    toggleLayer: (id: string) => {},
  };
}
