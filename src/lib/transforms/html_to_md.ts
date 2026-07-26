import { NodeHtmlMarkdown } from 'node-html-markdown';
import type { TransformFn } from './registry.js';

export const htmlToMdTransform: TransformFn = (value) => {
  return NodeHtmlMarkdown.translate(String(value));
};
