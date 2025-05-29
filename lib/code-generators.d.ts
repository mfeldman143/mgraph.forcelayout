// lib/code-generators.d.ts
export function getVariableName(index: number): string;
export function createPatternBuilder(dimension: number): (template: string, config?: { indent?: number; join?: string; escapeNewlines?: boolean }) => string;
export function generateBoundsFunction(dimension: number): (bodies: any[], settings: any, random: any) => any;
export function generateCreateBodyFunction(dimension: number, debugSetters: boolean): any;
export function generateCreateDragForceFunction(dimension: number): (options: { dragCoefficient: number }) => any;
export function generateCreateSpringForceFunction(dimension: number): (options: { springCoefficient: number; springLength: number }, random: any) => any;
export function generateIntegratorFunction(dimension: number): (bodies: any[], timeStep: number, adaptiveTimeStepWeight: number) => number;
export function generateQuadTreeFunction(dimension: number): () => (options: any, random: any) => { insertBodies: (bodies: any[]) => void; getRoot: () => any; updateBodyForce: (body: any) => void; options: (newOptions?: any) => any; };
