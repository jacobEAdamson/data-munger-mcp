import { registerTransform } from './registry.js';
import { jsonpathTransform } from './jsonpath.js';
import { concatTransform } from './concat.js';
import { templateTransform } from './template.js';
import { regexTransform } from './regex.js';
import { htmlToMdTransform } from './html_to_md.js';
import { upperTransform, lowerTransform, trimTransform } from './string.js';
import { toNumberTransform, toStringTransform, toDateTransform } from './cast.js';
import {
  formatNumberTransform,
  formatDateTransform,
  roundTransform,
  truncateTransform,
} from './format.js';

export { runValuePipeline } from './registry.js';

export function registerAllTransforms(): void {
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
}
