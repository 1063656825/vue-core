/*
 * @Author: yutaiqi
 * @Date: 2025-12-30 22:22:08
 * @Description: 文件功能描述
 * @FilePath: /reactivity/src/baseHnadlers.ts
 * @LastEditTime: 2026-01-10 13:56:58
 * @LastEditors: yutaiqi
 */

import { track, trigger, enableTracking, disableTracking } from "./effect";
import { isObject, isEqual, isArray } from "../shared/index";
import { ReactiveFlags, reactive, targetMap, toRaw } from "./reactive";
import { TrackOperationTypes, TriggerOperationTypes } from "./operations";

export const ITERATE_KEY = Symbol('iterate');

// 对数组操作方法进行统一封装处理
/**
 * 比如说 indexOf，如果不处理，在代理对象中是找不到原数据的索引
 * 
 */
const arrayInstrumentations: Record<string, Function> = {};

(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
    const method = Array.prototype[key] as any;
    arrayInstrumentations[key] = function (this: unknown[], ...args: unknown[]) {
        // 将 this 转换为代理对象
        const arr = toRaw(this);
        // 遍历数组索引，通过track函数对数组索引进行依赖收集
        for (let index = 0; index < this.length; index++) {
            track(arr, TrackOperationTypes.GET, index);
        }
        // 直接在原始对象中查找，使用原始数组和参数
        const res = method.apply(arr, args);
        if (res === -1 || res === false) {
            // 防止出现数组中还是一个reactive
            return method.apply(arr, args.map(toRaw));
        } else {
            return res;
        }
    }
});

(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    const method = Array.prototype[key] as any;
    arrayInstrumentations[key] = function (this: unknown[], ...args: unknown[]) {
        disableTracking()
        const res = method.apply(this, args);
        enableTracking()
        return res;
    }
})

function createGetter(isReadonly = false, isShallow = false){
    return function get(target: object, key: string | symbol, receiver: object){

    }
}

const get = createGetter();
const readonlyGet = createGetter(true);
const shallowGet = createGetter(false, true);
const shallowReadonlyGet = createGetter(true, true);


// function get(target: object, key: string | symbol, receiver: object) {
//     if (key === ReactiveFlags.IS_REACTIVE) {
//         return true;
//     } else if (key === ReactiveFlags.RAW && receiver === targetMap.get(target)) {
//         // 判断代理对象访问 __v_raw 属性，直接返回目标对象
//         // 还需要判断是否为代理对象发起的
//         return target;
//     }

//     const targetIsArray = isArray(target);
//     if (targetIsArray && arrayInstrumentations.hasOwnProperty(key)) {
//         return Reflect.get(arrayInstrumentations, key, target);
//     }

//     const reactiveResult = Reflect.get(target, key, receiver);
//     // 如果是对象，再次进行递归代理
//     if (isObject(reactiveResult)) {
//         return reactive(reactiveResult);
//     }
//     return reactiveResult;
// }

function set(target: Record<string | symbol, unknown>, key: string | symbol, value: unknown, receiver: object) {
    // 这里需要添加判断，如果为新值则使用 add，如果为旧值则使用 set，如果已经存在应该直接跳过
    const hasKey = target.hasOwnProperty(key);
    const type = target.hasOwnProperty(key) ? TriggerOperationTypes.SET : TriggerOperationTypes.ADD;

    const oldValue = target[key];

    const oldLength = isArray(target) ? target.length : 0

    const result = Reflect.set(target, key, value, receiver);
    if (!result) {
        return result
    }
    const newLength = isArray(target) ? target.length : 0
    if (!isEqual(value, oldValue) || type === TriggerOperationTypes.ADD) {
        trigger(target, type, key)
        if (isArray(target) && oldLength !== newLength) {
            if (key !== 'length') {
                trigger(target, TriggerOperationTypes.SET, 'length')
            } else {
                for (let i = newLength; i < oldLength; i++) {
                    trigger(target, TriggerOperationTypes.DELETE, i + '');
                }
            }
        }
    }
    return result
}

function has(target: object, key: string | symbol) {
    // 收集依赖
    track(target, TrackOperationTypes.HAS, key);
    const result = Reflect.has(target, key);
    return result;
}

function ownKeys(target: object): (string | symbol)[] {
    track(target, TrackOperationTypes.ITERATE, ITERATE_KEY);
    return Reflect.ownKeys(target);
}

function deleteProperty(target: Record<string | symbol, unknown>, key: string | symbol) {
    const hasKey = target.hasOwnProperty(key);
    const result = Reflect.deleteProperty(target, key);
    if (hasKey) {
        trigger(target, TriggerOperationTypes.DELETE, key);
    }
    return result;
}

export const mutableHandlers: ProxyHandler<object> = {
    get,
    set,
    has,
    ownKeys,
    deleteProperty
}

export const readonlyHandlers: ProxyHandler<object> = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`key: ${String(key)} set 失败，因为 target 是 readonly`, target);
        return true;
    },
    has,
    ownKeys,
    deleteProperty(target, key) {
        console.warn(`key: ${String(key)} delete 失败，因为 target 是 readonly`, target);
        return true;
    }

}