
import { effect } from "./effect";
import { isArray, isObject, isFunction } from "../shared/index";
import { isRef, Ref } from "./ref";

interface WatchOptions {
    immediate?: boolean;
    deep?: boolean;
}

type WatchSource<T = any> = Ref<T> | (() => T);
type WatchCallback<V = any, OV = any> = (
    newValue: V,
    oldValue: OV,
    onInvalidate: (fn: () => void) => void
) => void;

function traverse(value: any, seen: Set<any> = new Set()): any { 
    if(!isObject(value) || seen.has(value)){
        return
    }

    seen.add(value);
    if(isRef(value)){
        traverse(value.value, seen)
    }else if(isArray(value)){
        for (const element of value) {
            traverse(element, seen)
        }
    }else {
        for (const key in value) {
            traverse(value[key], seen)
        }
    }
    return value;
}

export function watch<T = any>(
    source: WatchSource<T>,
    cb: WatchCallback<T, T>,
    options?: WatchOptions
): () => void {
    let newValue: any, oldValue: any;
    let getter;
    if(isFunction(source)){
        getter = source;
    }else{
        getter = () => traverse(source)
    }

    // 用来解决竟态问题的，这里主要是如果有异步操作，多次触发可能存在问题
    // 这里就是通过一个 flag 来控制上一次执行是否需要被赋值。
    let cleanup: () => void = () => {};
    function onInvalidate(fn: () => void) {
        cleanup = fn;
    }

    const job = ()=>{
        newValue = effectFn()
        if(cleanup) cleanup()
        cb(newValue, oldValue, onInvalidate)
        oldValue = newValue
    }

    

    const effectFn = effect(()=>getter(),{
        lazy: true,
        scheduler: job
    })

    // 根据options 判断是否需要执行job
    if(options && options.immediate){
        job()
    }else{
        oldValue = effectFn()
    }

    // 返回 stop 函数，用于停止监听
    return () => {
        // 清理 effect 的依赖关系
        const { deps } = effectFn;
        if (deps.length) {
            for (let i = 0; i < deps.length; i++) {
                deps[i].delete(effectFn);
            }
            deps.length = 0;
        }
    };
}