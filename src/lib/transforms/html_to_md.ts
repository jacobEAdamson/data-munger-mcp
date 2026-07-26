import { NodeHtmlMarkdown } from 'node-html-markdown';
import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  html_to_md: { description: 'Convert HTML string to markdown' },
};

export const htmlToMdTransform: TransformFn = (value) => {
  return NodeHtmlMarkdown.translate(String(value));
};
