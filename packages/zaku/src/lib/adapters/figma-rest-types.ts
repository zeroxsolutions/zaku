/** The fields of Figma's REST file and nodes responses that the outline reads. */
export interface RestPaint {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: { r: number; g: number; b: number; a?: number };
  boundVariables?: { color?: { id: string } };
}

export interface RestAlias {
  id: string;
}

export interface RestAction {
  type: string;
  destinationId?: string | null;
  navigation?: string;
}

export interface RestNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: RestNode[];
  componentId?: string;
  componentProperties?: Record<string, { type: string; value: string | boolean }>;
  overrides?: { id: string; overriddenFields: string[] }[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number } | null;
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  characters?: string;
  styles?: Record<string, string>;
  fills?: RestPaint[];
  strokes?: RestPaint[];
  effects?: { visible?: boolean }[];
  interactions?: { trigger?: { type: string } | null; actions?: (RestAction | null)[] }[];
  transitionNodeID?: string | null;
  flowStartingPoints?: { nodeId: string; name: string }[];
  boundVariables?: Record<string, RestAlias | RestAlias[] | Record<string, RestAlias | undefined> | undefined>;
  cornerRadius?: number;
  /** Each corner, clockwise from top left, when the corners differ (Figma REST). */
  rectangleCornerRadii?: [number, number, number, number];
  strokeWeight?: number;
  individualStrokeWeights?: { top: number; right: number; bottom: number; left: number };
  layoutMode?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
  style?: { fontFamily?: string; fontSize?: number };
}

/** One published component or component set, as the library endpoints list it. */
export interface RestPublished {
  node_id: string;
  key: string;
  name: string;
  description: string;
  containing_frame?: { pageName?: string; containingComponentSet?: unknown };
}

export interface RestComponentMeta {
  key: string;
  name: string;
  componentSetId?: string;
  description?: string;
  /** False for a component the file itself holds rather than one a library publishes. */
  remote?: boolean;
}

export interface RestNodeEntry {
  document: RestNode;
  components: Record<string, RestComponentMeta>;
  componentSets: Record<string, { key: string; name: string; description?: string }>;
  styles: Record<string, { key: string; name: string; styleType: string }>;
}

export interface RestNodesResponse {
  version: string;
  nodes: Record<string, RestNodeEntry | null>;
}

export interface RestFileResponse extends RestNodeEntry {
  version: string;
}
