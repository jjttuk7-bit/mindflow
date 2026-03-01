declare module "d3-force" {
  export interface SimulationNodeDatum {
    index?: number
    x?: number
    y?: number
    vx?: number
    vy?: number
    fx?: number | null
    fy?: number | null
  }

  export interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> {
    source: NodeDatum | string | number
    target: NodeDatum | string | number
    index?: number
  }

  export interface Simulation<
    NodeDatum extends SimulationNodeDatum,
    LinkDatum extends SimulationLinkDatum<NodeDatum> | undefined
  > {
    restart(): this
    stop(): this
    tick(iterations?: number): this
    nodes(): NodeDatum[]
    nodes(nodes: NodeDatum[]): this
    alpha(): number
    alpha(alpha: number): this
    alphaMin(): number
    alphaMin(min: number): this
    alphaDecay(): number
    alphaDecay(decay: number): this
    alphaTarget(): number
    alphaTarget(target: number): this
    velocityDecay(): number
    velocityDecay(decay: number): this
    force(name: string): any
    force(name: string, force: any): this
    find(x: number, y: number, radius?: number): NodeDatum | undefined
    randomSource(): () => number
    randomSource(source: () => number): this
    on(typenames: string): ((this: this) => void) | undefined
    on(typenames: string, listener: ((this: this) => void) | null): this
  }

  export function forceSimulation<NodeDatum extends SimulationNodeDatum>(
    nodes?: NodeDatum[]
  ): Simulation<NodeDatum, any>

  export function forceLink<
    NodeDatum extends SimulationNodeDatum,
    LinkDatum extends SimulationLinkDatum<NodeDatum>
  >(
    links?: LinkDatum[]
  ): {
    (alpha: number): void
    links(): LinkDatum[]
    links(links: LinkDatum[]): any
    id(): (node: NodeDatum, i: number, nodesData: NodeDatum[]) => string | number
    id(id: (node: NodeDatum, i: number, nodesData: NodeDatum[]) => string | number): any
    distance(): number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number)
    distance(distance: number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number)): any
    strength(): number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number)
    strength(strength: number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number)): any
    iterations(): number
    iterations(iterations: number): any
  }

  export function forceManyBody<NodeDatum extends SimulationNodeDatum>(): {
    (alpha: number): void
    strength(): number | ((d: NodeDatum, i: number, data: NodeDatum[]) => number)
    strength(strength: number | ((d: NodeDatum, i: number, data: NodeDatum[]) => number)): any
    theta(): number
    theta(theta: number): any
    distanceMin(): number
    distanceMin(distance: number): any
    distanceMax(): number
    distanceMax(distance: number): any
  }

  export function forceCenter<NodeDatum extends SimulationNodeDatum>(
    x?: number,
    y?: number
  ): {
    (alpha: number): void
    x(): number
    x(x: number): any
    y(): number
    y(y: number): any
    strength(): number
    strength(strength: number): any
  }

  export function forceCollide<NodeDatum extends SimulationNodeDatum>(
    radius?: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)
  ): {
    (alpha: number): void
    radius(): number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)
    radius(radius: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): any
    strength(): number
    strength(strength: number): any
    iterations(): number
    iterations(iterations: number): any
  }
}
