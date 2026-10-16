export function getWmsUrl(geoserverUrl: string, workspace: string) {
  const url = new URL(geoserverUrl);
  url.search = "";
  url.hash = "";
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = /\/(wms|ows)$/i.test(path)
    ? path
    : `${path}/${encodeURIComponent(workspace)}/wms`;
  return url.toString();
}
