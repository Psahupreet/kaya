export function resolveAssetUrl(assetPath, apiBase) {
  if (!assetPath) return '';

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const baseUrl = (apiBase || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${baseUrl}${assetPath}`;
}
