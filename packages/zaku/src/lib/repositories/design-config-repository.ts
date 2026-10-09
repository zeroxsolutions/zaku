import { injectable } from 'tsyringe';
import { TOKENS } from '../constants/tokens.js';
import { zakuConfigSchema, type ZakuConfig } from '../schema/zaku-config.js';
import { readDesignFile, readOptionalDesignFile } from './design-file.js';
import { designPaths } from './design-paths.js';

export interface IDesignConfigRepository {
  read(root: string): Promise<ZakuConfig>;
  readOptional(root: string): Promise<ZakuConfig | null>;
}

/** zaku.yaml in the design directory. */
@injectable({ token: TOKENS.DESIGN_CONFIG_REPOSITORY })
export class DesignConfigRepository implements IDesignConfigRepository {
  read(root: string): Promise<ZakuConfig> {
    return readDesignFile(designPaths(root).config, zakuConfigSchema);
  }

  readOptional(root: string): Promise<ZakuConfig | null> {
    return readOptionalDesignFile(designPaths(root).config, zakuConfigSchema);
  }
}
