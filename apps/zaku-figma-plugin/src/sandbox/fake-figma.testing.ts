type Listener = (event: { nodeChanges: { type: string; node: { id: string }; properties?: string[] }[] }) => void;

export class FakeNode {
  removed = false;
  /** Figma refuses to remove this node, as it can for a node it holds; remove() throws. */
  refusesRemoval = false;
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
  /** Figma removes a node with everything inside it. */
  remove(): void {
    if (this.refusesRemoval) throw new Error(`in remove: cannot remove node ${this.id}`);
    for (const child of [...this.children]) child.remove();
    if (this.parent) this.parent.children = this.parent.children.filter((node) => node !== this);
    this.parent = null;
    this.removed = true;
    this.world.nodes.delete(this.id);
  }
  /** Moves `child` in, as Figma does, and tells the page its parent changed. */
  appendChild(child: FakeNode): void {
    if (child.parent) child.parent.children = child.parent.children.filter((node) => node !== child);
    child.parent = this;
    this.children.push(child);
    this.world.fire('PROPERTY_CHANGE', child, ['parent']);
  }
  /** Every node inside this one, as Figma's findAll() with no callback answers. */
  findAll(): FakeNode[] {
    return this.children.flatMap((child) => [child, ...child.findAll()]);
  }
  rename(name: string): void {
    this.name = name;
    this.world.fire('PROPERTY_CHANGE', this, ['name']);
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
  existing(name: string, type = 'FRAME'): FakeNode {
    const node = new FakeNode(`9:${this.next++}`, type, this);
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
  /** An instance's own layer, which Figma makes with the instance and never announces. */
  sublayer(instance: FakeNode, type = 'RECTANGLE'): FakeNode {
    const node = new FakeNode(`I${instance.id};${this.next++}`, type, this);
    node.parent = instance;
    instance.children.push(node);
    this.nodes.set(node.id, node);
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
  fire(type: string, node: FakeNode, properties?: string[]): void {
    for (const listener of this.listeners)
      listener({ nodeChanges: [{ type, node, ...(properties ? { properties } : {}) }] });
  }
  private make(type: string): FakeNode {
    const node = new FakeNode(`1:${this.next++}`, type, this);
    this.nodes.set(node.id, node);
    return node;
  }
}
