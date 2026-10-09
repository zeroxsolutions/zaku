type Listener = (event: { nodeChanges: { type: string; node: { id: string } }[] }) => void;

export class FakeNode {
  removed = false;
  fills: unknown[] = [];
  strokes: unknown[] = [];
  name: string;
  parent: FakeNode | null = null;
  children: FakeNode[] = [];
  constructor(
    readonly id: string,
    readonly type: string,
    private readonly world: FakeFigma,
  ) {
    this.name = type === 'FRAME' ? 'Frame' : 'Rectangle';
  }
  remove(): void {
    this.removed = true;
    this.world.nodes.delete(this.id);
  }
  rename(name: string): void {
    this.name = name;
    this.world.fire('PROPERTY_CHANGE', this);
  }
}

/** A style: it has an id and a type, `TEXT` for a text style, and no parent, since it is not on a page. */
export class FakeStyle {
  removed = false;
  name = 'Style';
  constructor(
    readonly id: string,
    readonly type: string,
    private readonly world: FakeFigma,
  ) {}
  remove(): void {
    this.removed = true;
    this.world.styles.delete(this.id);
  }
}

export class FakeFigma {
  constructor() {
    // Figma's API object refuses assignment to its methods; the fake does too, so a runner that patches them fails here.
    for (const name of [
      'createRectangle',
      'createFrame',
      'createComponent',
      'createTextStyle',
      'commitUndo',
      'getNodeByIdAsync',
    ] as const) {
      Object.defineProperty(this, name, {
        value: FakeFigma.prototype[name].bind(this),
        writable: false,
        enumerable: true,
      });
    }
  }

  nodes = new Map<string, FakeNode>();
  styles = new Map<string, FakeStyle>();
  undoCommits = 0;
  private next = 10;
  private listeners: Listener[] = [];
  readonly currentPage = {
    id: '0:1',
    name: 'Page 1',
    on: (_event: 'nodechange', listener: Listener): number => this.listeners.push(listener),
    off: (_event: 'nodechange', listener: Listener): Listener[] =>
      (this.listeners = this.listeners.filter((l) => l !== listener)),
  };
  existing(name: string): FakeNode {
    const node = new FakeNode(`9:${this.next++}`, 'FRAME', this);
    node.name = name;
    this.nodes.set(node.id, node);
    return node;
  }
  createRectangle(): FakeNode {
    return this.make('RECTANGLE');
  }
  /** A node made without a create* call, like component.createInstance() or node.clone(); only nodechange tells of it. */
  instantiate(): FakeNode {
    const node = this.make('INSTANCE');
    this.fire('CREATE', node);
    return node;
  }
  createFrame(): FakeNode {
    return this.make('FRAME');
  }
  createComponent(): FakeNode {
    return this.make('COMPONENT');
  }
  createTextStyle(): FakeStyle {
    const style = new FakeStyle(`S:${this.next++},`, 'TEXT', this);
    this.styles.set(style.id, style);
    return style;
  }
  /** Combines components into a set on a page other than the one listened to, so no CREATE is heard. */
  combineElsewhere(components: FakeNode[]): FakeNode {
    const set = this.make('COMPONENT_SET');
    for (const component of components) {
      component.parent = set;
      set.children.push(component);
    }
    return set;
  }
  commitUndo(): void {
    this.undoCommits++;
  }
  async getNodeByIdAsync(id: string): Promise<FakeNode | null> {
    return this.nodes.get(id) ?? null;
  }
  fire(type: string, node: FakeNode): void {
    for (const listener of this.listeners) listener({ nodeChanges: [{ type, node }] });
  }
  private make(type: string): FakeNode {
    const node = new FakeNode(`1:${this.next++}`, type, this);
    this.nodes.set(node.id, node);
    return node;
  }
}
