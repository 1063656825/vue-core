/*
 * @Author: yutaiqi
 * @Date: 2025-12-28 23:51:40
 * @Description: 文件功能描述
 * @FilePath: /reactivity/src/effect.ts
 * @LastEditTime: 2026-01-06 23:31:44
 * @LastEditors: yutaiqi
 */


import { TrackOperationTypes, TriggerOperationTypes } from "./operations";

let shouldTrack = false;
export function enableTracking() {
    shouldTrack = true;
}
export function disableTracking() {
    shouldTrack = false;
}
/**
 * @description: 依赖收集
 * @param {object} target
 * @param {TrackOperationTypes} type 添加标识，为后续针对不同的类型进行判断
 * @param {unknown} key 属性名
 * @return {*}
 */
export function track(target: object, type:TrackOperationTypes, key: unknown) {
if(!shouldTrack) return;
    console.log(`依赖收集track: [${type}] ${String(key)}属性被读取`);
}


/**
 * @description: 依赖触发
 * @param {object} target
 * @param {TriggerOperationTypes} type 添加标识，为后续针对不同的类型进行判断
 * @param {unknown} key 属性名
 * @return {*}
 */
export function trigger(target: object, type:TriggerOperationTypes, key: unknown) {
    console.log(`依赖收集trigger: [${type}] ${String(key)}属性被设置`);
}