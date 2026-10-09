import { join } from 'node:path';

export interface DesignPaths {
  root: string;
  config: string;
  maps: string;
  outline: string;
  unmapped: string;
  library: string;
  tokens: string;
  recipe: string;
}

export function designPaths(root: string): DesignPaths {
  return {
    root,
    config: join(root, 'zaku.yaml'),
    maps: join(root, 'map'),
    outline: join(root, 'outline'),
    unmapped: join(root, 'outline', 'unmapped.yaml'),
    library: join(root, 'library.json'),
    tokens: join(root, 'tokens.json'),
    recipe: join(root, 'recipe.json'),
  };
}
