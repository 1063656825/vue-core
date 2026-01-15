/*
 * @Author: yutaiqi
 * @Date: 2025-12-28 23:51:49
 * @Description: 文件功能描述
 * @FilePath: /reactivity/src/reactive.ts
 * @LastEditTime: 2026-01-10 16:04:34
 * @LastEditors: yutaiqi
 */
import { track, trigger } from "./effect";
import { isObject } from "../shared/index";
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers } from "./baseHnadlers";

export const enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive',
    IS_READONLY = '__v_isReadonly',
    RAW = '__v_raw',
    SKIP = '__v_skip',
}

export interface Target {
    [ReactiveFlags.IS_REACTIVE]?: boolean;
    [ReactiveFlags.IS_READONLY]?: boolean;
    [ReactiveFlags.RAW]?: any;
    [ReactiveFlags.SKIP]?: boolean;
}


// 为了区分普通代理reactive和readonly，我们分开进行存储
export const readonlyMap = new WeakMap<Target, any>();
export const reactiveMap = new WeakMap<Target, any>();
export const shallowReactiveMap = new WeakMap<Target, any>();

export function createReactiveObject(
    target: Target, 
    isReadonly: Boolean, 
    baseHnadlers: ProxyHandler<any>
){
    // 如果target不是对象直接返回
    if(!isObject(target)) return target

    // 如果已经代理过的对象，不需要进行代理了
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    const proxyTarget = proxyMap.get(target);
    if(proxyTarget) {
        return proxyTarget;
    } 

    // 判断是否为响应式对象
    if (target[ReactiveFlags.IS_REACTIVE] && target[ReactiveFlags.RAW]) {
        return target;
    }

    // 进行代理
    const proxy = new Proxy(target, baseHnadlers);
    proxyMap.set(target, proxy);
    return proxy;


}


export function reactive<T extends object>(target: T): T;

export function reactive(target: object) {
    // 如果为 readonly 则直接返回
    if(target && (target as Target)[ReactiveFlags.IS_READONLY]){
        return target
    }

    return createReactiveObject(target, false, mutableHandlers)
}

/**
 * 类型基操比较实用的一个小技巧，通过下面的代码可以看到深层计算之后的结果
 * T extends any ? 
    {
        具体类型代码
    } 
    : never
 */
type DeepReadonly<T extends Record<string, any>> = 
    T extends any ? 
    {
        readonly [K in keyof T] : T[K] extends Record<string, any> ? DeepReadonly<T[K]> : T[K]
    } : never


export function readonly<T extends object>(target: T): DeepReadonly<T> {
    return createReactiveObject(target, true, readonlyHandlers)
}

export function shallowReactive<T extends object>(target: T): T {
    return createReactiveObject(target, false, shallowReactiveHandlers)
}

export function toRaw<T>(observed: T): T {
    return (observed as Target)[ReactiveFlags.RAW]
}