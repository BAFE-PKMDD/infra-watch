export type MapOverlayLayer = {
  id: string;
  name: string;
  description: string | null;
  geoserverUrl: string;
  workspace: string;
  layerName: string;
  styleName: string | null;
  opacity: number;
  legendShape: string;
  legendColor: string;
  displayOrder: number;
};
