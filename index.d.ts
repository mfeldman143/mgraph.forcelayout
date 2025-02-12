// index.d.ts
declare module "mgraph.forcelayout" {
  import { Graph, NodeId, LinkId, Node, Link } from "mgraph.graph";
  import { EventedType } from "mgraph.events";

  export type ForceFunction = (iterationNumber: number) => void;

  export interface Vector {
    x: number;
    y: number;
    z?: number;
    [coord: string]: number | undefined;
  }

  export interface Body {
    isPinned: boolean;
    pos: Vector;
    force: Vector;
    velocity: Vector;
    mass: number;
    springCount: number;
    springLength: number;
    reset(): void;
    setPosition(x: number, y: number, z?: number, ...c: number[]): void;
  }

  export interface Spring {
    from: Body;
    to: Body;
    length: number;
    coefficient: number;
  }

  export interface QuadNode {
    body: Body | null;
    mass: number;
    mass_x: number;
    mass_y: number;
    mass_z?: number;
  }

  export interface QuadTree {
    insertBodies(bodies: Body[]): void;
    getRoot(): QuadNode & Record<string, number | null>;
    updateBodyForce(sourceBody: Body): void;
    options(newOptions: { gravity: number; theta: number }): { gravity: number; theta: number };
  }

  export interface BoundingBox {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
    min_z?: number;
    max_z?: number;
    [min_max: string]: number | undefined;
  }

  export interface PhysicsSettings {
    springLength: number;
    springCoefficient: number;
    gravity: number;
    theta: number;
    dragCoefficient: number;
    timeStep: number;
    adaptiveTimeStepWeight: number;
    dimensions: number;
    debug: boolean;
  }

  export interface PhysicsSimulator {
    bodies: Body[];
    quadTree: QuadTree;
    springs: Spring[];
    settings: PhysicsSettings;
    addForce(forceName: string, forceFunction: ForceFunction): void;
    removeForce(forceName: string): void;
    getForces(): Map<string, ForceFunction>;
    step(): boolean;
    addBody(body: Body): Body;
    addBodyAt(pos: Vector): Body;
    removeBody(body: Body): boolean;
    addSpring(body1: Body, body2: Body, springLength: number, springCoefficient: number): Spring;
    getTotalMovement(): number;
    removeSpring(spring: Spring): boolean;
    getBestNewBodyPosition(neighbors: Body[]): Vector;
    getBBox(): BoundingBox;
    getBoundingBox(): BoundingBox;
    invalidateBBox(): void;
    gravity(value: number): number;
    theta(value: number): number;
    random: any;
  }

  export interface Layout<T extends Graph> {
    step(): boolean;
    getNodePosition(nodeId: NodeId): Vector;
    setNodePosition(nodeId: NodeId, x: number, y: number, z?: number, ...c: number[]): void;
    getLinkPosition(linkId: LinkId): { from: Vector; to: Vector };
    getGraphRect(): { x1: number; y1: number; x2: number; y2: number };
    forEachBody(callbackfn: (value: Body, key: NodeId, map: Map<NodeId, Body>) => void): void;
    pinNode(node: Node, isPinned: boolean): void;
    isNodePinned(node: Node): boolean;
    dispose(): void;
    getBody(nodeId: NodeId): Body | undefined;
    getSpring(linkId: LinkId | Link): Spring;
    getSpring(fromId: NodeId, toId: NodeId): Spring | undefined;
    getForceVectorLength(): number;
    readonly simulator: PhysicsSimulator;
    graph: T;
    lastMove: number;
  }

  export default function createLayout<T extends Graph>(
    graph: T,
    physicsSettings?: Partial<PhysicsSettings>
  ): Layout<T> & EventedType;
}
