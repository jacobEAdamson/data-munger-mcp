import { registerTransform, registerTransformMeta } from './registry.js';
import { jsonpathTransform, transformMeta as jsonpathMeta } from './jsonpath.js';
import { concatTransform, transformMeta as concatMeta } from './concat.js';
import { templateTransform, transformMeta as templateMeta } from './template.js';
import { regexTransform, transformMeta as regexMeta } from './regex.js';
import { htmlToMdTransform, transformMeta as htmlToMdMeta } from './html_to_md.js';
import { upperTransform, lowerTransform, trimTransform, transformMeta as stringMeta } from './string.js';
import { toNumberTransform, toStringTransform, toDateTransform, transformMeta as castMeta } from './cast.js';
import {
  formatNumberTransform,
  formatDateTransform,
  roundTransform,
  truncateTransform,
  transformMeta as formatMeta,
} from './format.js';
import {
  base64EncodeTransform,
  base64DecodeTransform,
  urlEncodeTransform,
  urlDecodeTransform,
  htmlEscapeTransform,
  htmlUnescapeTransform,
  transformMeta as encodeMeta,
} from './encode.js';
import {
  dateAddTransform,
  dateDiffTransform,
  dateTruncateTransform,
  dateTzTransform,
  transformMeta as datesMeta,
} from './dates.js';

export { runValuePipeline, getAllTransformMetas } from './registry.js';

export function registerAllTransforms(): void {
  // Register transform functions
  registerTransform('jsonpath', jsonpathTransform);
  registerTransform('concat', concatTransform);
  registerTransform('template', templateTransform);
  registerTransform('regex', regexTransform);
  registerTransform('html_to_md', htmlToMdTransform);
  registerTransform('upper', upperTransform);
  registerTransform('lower', lowerTransform);
  registerTransform('trim', trimTransform);
  registerTransform('to_number', toNumberTransform);
  registerTransform('to_string', toStringTransform);
  registerTransform('to_date', toDateTransform);
  registerTransform('format_number', formatNumberTransform);
  registerTransform('format_date', formatDateTransform);
  registerTransform('round', roundTransform);
  registerTransform('truncate', truncateTransform);
  registerTransform('base64_encode', base64EncodeTransform);
  registerTransform('base64_decode', base64DecodeTransform);
  registerTransform('url_encode', urlEncodeTransform);
  registerTransform('url_decode', urlDecodeTransform);
  registerTransform('html_escape', htmlEscapeTransform);
  registerTransform('html_unescape', htmlUnescapeTransform);
  registerTransform('date_add', dateAddTransform);
  registerTransform('date_diff', dateDiffTransform);
  registerTransform('date_truncate', dateTruncateTransform);
  registerTransform('date_tz', dateTzTransform);

  // Register transform metadata from static constants
  const allMetas = [jsonpathMeta, concatMeta, templateMeta, regexMeta, htmlToMdMeta, stringMeta, castMeta, formatMeta, encodeMeta, datesMeta];
  for (const metas of allMetas) {
    for (const [name, meta] of Object.entries(metas)) {
      registerTransformMeta(name, meta);
    }
  }
}
