/*
 * @Author: yutaiqi
 * @Date: 2025-12-29 23:18:33
 * @Description: 文件功能描述
 * @FilePath: /reactivity/shared/index.ts
 * @LastEditTime: 2026-01-10 16:00:57
 * @LastEditors: yutaiqi
 */
export const isObject = (val: unknown): val is Record<any,any> => {
    return val !== null && typeof val === 'object';
}

export const isString = (val: unknown): val is string => {
    return typeof val === 'string';
}

export const isNumber = (val: unknown): val is number => {
    return typeof val === 'number';
}

export const isBoolean = (val: unknown): val is boolean => {
    return typeof val === 'boolean';
}

export const isFunction = (val: unknown): val is Function => {
    return typeof val === 'function';
}

export const isArray = (val: unknown): val is Array<any> => {
    return Array.isArray(val);
}

export const isPromise = (val: unknown): val is Promise<any> => {
    return isObject(val) && isFunction(val.then) && isFunction(val.catch);
}

export const isEqual = (val1: unknown, val2: unknown): boolean => {
    return Object.is(val1, val2);
}

export const isSymbol = (val: unknown): val is symbol => {
    return typeof val === 'symbol';
}

export const extend = Object.assign