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

export class FakeFigma {
  constructor() {
    // Figma's API object refuses assignment to its methods; the fake does too, so a runner that patches them fails here.
    for (const name of ['createRectangle', 'createFrame', 'commitUndo', 'getNodeByIdAsync'] as const) {
      Object.defineProperty(this, name, {
        value: FakeFigma.prototype[name].bind(this),
        writable: false,
        enumerable: true,
      });
    }
  }

  nodes = new Map<string, FakeNode>();
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
