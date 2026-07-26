import { registerNodeHandler, registerNodeMeta } from '../engine.js';
import { loadNode, nodeMeta as loadMeta } from './load.js';
import { loadStringNode, nodeMeta as loadStringMeta } from './load_string.js';
import { recordsNode, nodeMeta as recordsMeta } from './records.js';
import { mapNode, nodeMeta as mapMeta } from './map.js';
import { sortNode, nodeMeta as sortMeta } from './sort.js';
import { limitNode, nodeMeta as limitMeta } from './limit.js';
import { joinNode, nodeMeta as joinMeta } from './join.js';
import { groupNode, nodeMeta as groupMeta } from './group.js';
import { templateNode, nodeMeta as templateMeta } from './template.js';
import { outputNode, nodeMeta as outputMeta } from './output.js';

export function registerAllNodes(): void {
  registerNodeHandler('load', loadNode);
  registerNodeMeta('load', loadMeta);
  registerNodeHandler('load_string', loadStringNode);
  registerNodeMeta('load_string', loadStringMeta);
  registerNodeHandler('records', recordsNode);
  registerNodeMeta('records', recordsMeta);
  registerNodeHandler('map', mapNode);
  registerNodeMeta('map', mapMeta);
  registerNodeHandler('sort', sortNode);
  registerNodeMeta('sort', sortMeta);
  registerNodeHandler('limit', limitNode);
  registerNodeMeta('limit', limitMeta);
  registerNodeHandler('join', joinNode);
  registerNodeMeta('join', joinMeta);
  registerNodeHandler('group', groupNode);
  registerNodeMeta('group', groupMeta);
  registerNodeHandler('template', templateNode);
  registerNodeMeta('template', templateMeta);
  registerNodeHandler('output', outputNode);
  registerNodeMeta('output', outputMeta);
}
