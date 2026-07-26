import { registerAllNodes } from './nodes/index.js';
import { registerAllTransforms } from './transforms/index.js';

export function registerAll(): void {
  registerAllNodes();
  registerAllTransforms();
}
