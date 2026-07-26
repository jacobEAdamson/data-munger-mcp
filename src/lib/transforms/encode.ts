import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  base64_encode: { description: 'Base64 encode a string' },
  base64_decode: { description: 'Base64 decode a string' },
  url_encode: { description: 'URL-encode a string (encodeURIComponent)' },
  url_decode: { description: 'URL-decode a string (decodeURIComponent)' },
  html_escape: { description: 'Escape HTML entities in string' },
  html_unescape: { description: 'Unescape HTML entities in string' },
};

export const base64EncodeTransform: TransformFn = (value) => {
  return Buffer.from(String(value)).toString('base64');
};

export const base64DecodeTransform: TransformFn = (value) => {
  return Buffer.from(String(value), 'base64').toString('utf-8');
};

export const urlEncodeTransform: TransformFn = (value) => {
  return encodeURIComponent(String(value));
};

export const urlDecodeTransform: TransformFn = (value) => {
  return decodeURIComponent(String(value));
};

export const htmlEscapeTransform: TransformFn = (value) => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const htmlUnescapeTransform: TransformFn = (value) => {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};