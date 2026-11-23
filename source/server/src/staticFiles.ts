import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { acceptedEncodings } from './contentEncoding.js';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.hdr': 'application/octet-stream', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

/** Resolve only public build assets; reject traversal, hidden files and malformed URLs. */
export function resolvePublicFile(root: string, url: string): string | null {
  let pathname: string;
  try { pathname = decodeURIComponent(url.split('?')[0]); } catch { return null; }
  if (pathname.includes('\\') || pathname.includes('\0')) return null;
  if (pathname.split('/').some(part => part.startsWith('.') && part !== '')) return null;
  const base = resolve(root);
  const file = resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
  return file.startsWith(base + sep) ? file : null;
}

/** Serve the browser build from the multiplayer process, including audio byte ranges. */
export async function servePublicFile(req: IncomingMessage, res: ServerResponse, root: string): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
  }
  const file = resolvePublicFile(root, req.url || '/');
  if (!file) { res.writeHead(400); res.end('Invalid path'); return; }
  try {
    let info = await stat(file);
    if (!info.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    let servedFile = file;
    let encoding: 'br' | 'gzip' | undefined;
    // Byte ranges always describe the original representation, including streamed audio.
    if (!req.headers.range) {
      for (const candidate of acceptedEncodings(req.headers['accept-encoding'])) {
        const compressedFile = file + (candidate === 'br' ? '.br' : '.gz');
        const compressedInfo = await stat(compressedFile).catch(() => null);
        if (compressedInfo?.isFile()) { servedFile = compressedFile; info = compressedInfo; encoding = candidate; break; }
      }
    }
    const headers: Record<string, string | number> = {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': extname(file) === '.html' ? 'no-cache' : /[\\/]assets[\\/].+-[\w-]{8,}\.(js|css)$/.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
      'Vary': 'Accept-Encoding',
      ...(encoding ? { 'Content-Encoding': encoding } : {}),
    };
    let start = 0, end = info.size - 1, status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!match) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); res.end(); return; }
      start = Number(match[1]); end = match[2] ? Number(match[2]) : end;
      if (start > end || start >= info.size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
        res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); res.end(); return;
      }
      end = Math.min(end, info.size - 1); status = 206;
    }
    res.writeHead(status, { ...headers, 'Content-Length': end - start + 1,
      ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {}) });
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = createReadStream(servedFile, { start, end });
    stream.on('error', () => res.destroy());
    req.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch { res.writeHead(404); res.end('Not found'); }
}
