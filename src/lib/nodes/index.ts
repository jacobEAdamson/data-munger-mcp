import { registerNodeHandler } from '../engine.js';
import { loadNode } from './load.js';
import { loadStringNode } from './load_string.js';
import { recordsNode } from './records.js';
import { mapNode } from './map.js';
import { sortNode } from './sort.js';
import { limitNode } from './limit.js';
import { joinNode } from './join.js';
import { groupNode } from './group.js';
import { templateNode } from './template.js';
import { outputNode } from './output.js';

export function registerAllNodes(): void {
  registerNodeHandler('load', loadNode);
  registerNodeHandler('load_string', loadStringNode);
  registerNodeHandler('records', recordsNode);
  registerNodeHandler('map', mapNode);
  registerNodeHandler('sort', sortNode);
  registerNodeHandler('limit', limitNode);
  registerNodeHandler('join', joinNode);
  registerNodeHandler('group', groupNode);
  registerNodeHandler('template', templateNode);
  registerNodeHandler('output', outputNode);
}
