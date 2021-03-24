import { FunctionBlock, FunctionInstanceDefinition, FunctionTypeDefinition } from "../FunctionBlock.js"

export type BlockVisualStyle =
    | 'full'
    | 'no title'
    | 'no title min'
    | 'name on first row'
    | 'minimal'


export function createFunctionCollection <T extends {[name: string]: FunctionTypeDefinition }>(def: T) { return def }