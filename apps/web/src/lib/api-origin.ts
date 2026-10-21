import 'server-only';
export function apiOrigin(value=process.env.DOROB_API_URL ?? 'http://127.0.0.1:3001') {
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid API origin');
  return url.origin;
}
