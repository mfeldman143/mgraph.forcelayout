// index.d.ts
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
  id?: NodeId;
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
  [key: string]: any;
}

export interface QuadTree {
  insertBodies(bodies: Body[]): void;
  getRoot(): QuadNode;
  updateBodyForce(sourceBody: Body): void;
  options(newOptions?: { gravity?: number; theta?: number }): { gravity: number; theta: number };
}

export interface BoundingBox {
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  min_z?: number;
  max_z?: number;
  [key: string]: number | undefined;
}

export interface PhysicsSettings {
  springLength?: number;
  springCoefficient?: number;
  gravity?: number;
  theta?: number;
  dragCoefficient?: number;
  timeStep?: number;
  adaptiveTimeStepWeight?: number;
  dimensions?: number;
  debug?: boolean;
  createSimulator?: (settings?: PhysicsSettings) => PhysicsSimulator;
  springTransform?: (link: Link, spring: Spring) => void;
}

export interface PhysicsSimulator {
  bodies: Body[];
  quadTree: QuadTree;
  springs: Spring[];
  settings: PhysicsSettings;
  addForce(forceName: string, forceFunction: ForceFunction): void;
  removeForce(forceName: string): void;
  getForces(): Map<string, ForceFunction>;
  step(): number;
  addBody(body: Body): Body;
  addBodyAt(pos: Vector): Body;
  removeBody(body: Body): boolean;
  addSpring(body1: Body, body2: Body, springLength?: number, springCoefficient?: number): Spring;
  getTotalMovement(): number;
  removeSpring(spring: Spring): boolean;
  getBestNewBodyPosition(neighbors: Body[]): Vector;
  getBBox(): BoundingBox;
  getBoundingBox(): BoundingBox;
  invalidateBBox(): void;
  gravity(value?: number): number | PhysicsSimulator;
  theta(value?: number): number | PhysicsSimulator;
  random: any;
}

export interface Layout<T extends Graph> extends EventedType {
  step(): boolean;
  getNodePosition(nodeId: NodeId): Vector;
  setNodePosition(nodeId: NodeId, x: number, y: number, z?: number, ...c: number[]): void;
  getLinkPosition(linkId: LinkId): { from: Vector; to: Vector } | undefined;
  getGraphRect(): BoundingBox;
  forEachBody(callbackfn: (value: Body, key: NodeId) => void): void;
  pinNode(node: Node, isPinned: boolean): void;
  isNodePinned(node: Node): boolean;
  dispose(): void;
  getBody(nodeId: NodeId): Body | undefined;
  getSpring(linkId: LinkId | Link): Spring | undefined;
  getSpring(fromId: NodeId, toId: NodeId): Spring | undefined;
  getForceVectorLength(): number;
  readonly simulator: PhysicsSimulator;
  graph: T;
  lastMove: number;
}

export default function createLayout<T extends Graph>(
  graph: T,
  physicsSettings?: Partial<PhysicsSettings>
): Layout<T>;

export { createPhysicsSimulator } from './lib/createPhysicsSimulator.js';