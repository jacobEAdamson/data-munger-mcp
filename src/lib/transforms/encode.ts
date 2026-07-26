import type { TransformFn } from './registry.js';

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