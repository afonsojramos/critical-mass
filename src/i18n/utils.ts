export function getRouteFromUrl(url: URL) {
  const [, , ...rest] = url.pathname.split("/");
  return rest.join("/");
}
