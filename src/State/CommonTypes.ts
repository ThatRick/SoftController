export type IODataType = 
    | 'FLOAT'
    | 'INTEGER'
    | 'BINARY'

export type Subscriber<T> = (event: T) => void