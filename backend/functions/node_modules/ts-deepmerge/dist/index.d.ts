interface IObject {
    [key: string]: any;
}
declare type TUnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
declare const merge: {
    <T extends IObject[]>(...objects: T): TUnionToIntersection<T[number]>;
    options: IOptions;
    withOptions<T_1 extends IObject[]>(options: Partial<IOptions>, ...objects: T_1): TUnionToIntersection<T_1[number]>;
};
interface IOptions {
    mergeArrays: boolean;
}
export default merge;
