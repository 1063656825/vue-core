/*
 * @Author: yutaiqi
 * @Date: 2025-12-28 23:51:49
 * @Description: 文件功能描述
 * @FilePath: /reactivity/src/reactive.ts
 * @LastEditTime: 2026-01-21 23:10:41
 * @LastEditors: yutaiqi
 */
import { isObject } from "../shared/index";
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers } from "./baseHandlers";

export const enum ReactiveFlags {
    IS_REACTIVE = "__v_isReactive",
    IS_READONLY = "__v_isReadonly",
    RAW = "__v_raw",
    SKIP = "__v_skip",
}

export interface Target {
    [ReactiveFlags.SKIP]?: boolean;
    [ReactiveFlags.IS_REACTIVE]?: boolean;
    [ReactiveFlags.IS_READONLY]?: boolean;
    [ReactiveFlags.RAW]?: any;
}

// 为了区分普通代理reactive和readonly,我们分开进行存储
export const reactiveMap = new WeakMap<Target, any>();
export const readonlyMap = new WeakMap<Target, any>();

function createReactiveObject(
    target: Target,
    isReadonly: boolean,
    baseHandlers: ProxyHandler<any>,
) {
    // 如果target不是对象，直接返回
    if (!isObject(target)) {
        return target;
    }

    // 如果是已经代理过的对象，就不需要再进行代理了
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
        return existingProxy;
    }

    // 判断是否是响应式对象
    if (target[ReactiveFlags.RAW] && target[ReactiveFlags.IS_REACTIVE]) {
        return target;
    }

    const proxy = new Proxy(target, baseHandlers);

    proxyMap.set(target, proxy);

    return proxy;
}

export function reactive<T extends object>(target: T): T;
export function reactive(target: object) {

    if (target && (target as Target)[ReactiveFlags.IS_READONLY]) {
        return target;
    }

    return createReactiveObject(target, false, mutableHandlers);
}

/**
 *  类型体操比较实用的一个小技巧，通过下面的代码可以看到深层计算之后的结果
 *  T extends any ?
 *  {
 *  具体类型体操的代码
 *  }
 *  :never
 */

type DeepReadonly<T extends Record<string, any>> =
    T extends any ?
    {
        readonly [K in keyof T]: T[K] extends Record<string, any> ? DeepReadonly<T[K]> : T[K];
    }
    : never


export function readonly<T extends object>(target: T): DeepReadonly<T> {
    return createReactiveObject(target, true, readonlyHandlers);
}

export function toRaw<T>(observed: T): T {
    return (observed as Target)[ReactiveFlags.RAW] || observed;
}

export function shallowReactive<T extends object>(target: T): T {
    return createReactiveObject(target, false, shallowReactiveHandlers);
}