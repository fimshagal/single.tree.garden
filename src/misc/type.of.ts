export const typeOf = (object: any): string => {
    return Object.prototype.toString.call(object)
        .replace(/^\[object (.+)\]$/, '$1')
        .toLowerCase();
};

export const isDef = (object: any): boolean => {
    const type: string = typeOf(object);
    return type !== "null" && type !== "undefined";
};

export const isScalar = (object: any): boolean => {
    const type: string = typeOf(object);
    return type === "string" || type === "number" || type === "symbol";
};
