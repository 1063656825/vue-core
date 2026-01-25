import { TrackOpTypes, TriggerOpTypes } from "./operations";
import { isArray, isIntegerKey } from "../../shared/index";

export interface ReactiveEffect<T = any> {
    (): T;
    deps: Array<Dep>;
    options: ReactiveEffectOptions;
    _isEffect: true;
    raw: () => T;
}

export const ITERATE_KEY = Symbol("");

type Dep = Set<ReactiveEffect>;

export interface ReactiveEffectOptions {
    lazy?: boolean;
    scheduler?: (job: ReactiveEffect) => void;
}

export function isEffect(fn: any): fn is ReactiveEffect {
    return fn && fn._isEffect === true;
}

let activeEffect: ReactiveEffect | undefined;
let effectStack: ReactiveEffect[] = [];

type KeyToDepMap = Map<any, Dep>;
let targetMap = new WeakMap<any, KeyToDepMap>();

let shouldTrack = true;

export function pauseTracking() {
    shouldTrack = false;
}

export function enableTracking() {
    shouldTrack = true;
}

export function track(target: object, type: TrackOpTypes, key: unknown) {
    // 暂停依赖收集开关，没有activeEffect或者shouldTrack为false时，不进行依赖收集
    if (!shouldTrack || activeEffect === undefined) {
        return;
    }

    console.log(`依赖收集：【${type}】 ${String(key)}属性被读取了`);

    // 1. 根据target从buckets中获取对应的Map，保存的类型是key---effects的键值对
    let depsMap = targetMap.get(target);
    // 如果depsMap不存在，则初始化一个depsMap
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }

    // 2.根据key从depsMap中获取对应的Set，保存的是副作用函数
    let deps = depsMap.get(key);
    if (!deps) {
        depsMap.set(key, (deps = new Set()));
    }

    // 3.将副作用函数添加到deps中
    deps.add(activeEffect);

    // 将上面deps 集合的内容挂载到activeEffect.deps
    activeEffect.deps.push(deps);
}

export function trigger(
    target: object,
    type: TriggerOpTypes,
    key: unknown,
    newValue?: unknown,
    oldValue?: unknown
) {
    console.log(`触发更新：【${type}】 ${String(key)}属性被修改了`);
    // 根据target从buckets中获取对应的depsMap
    const depsMap = targetMap.get(target);
    // 如果depsMap不存在，则直接返回
    if (!depsMap) {
        return;
    }

    // 根据key从depsMap中获取对应的deps----> effects
    const deps = depsMap.get(key);

    // 依次执行deps中的副作用函数
    // 为了避免无限循环，这里可以新建一个Set对象
    const effects = new Set<ReactiveEffect>();

    const add = (effectsToAdd: Set<ReactiveEffect> | undefined) => {
        if (effectsToAdd) {
            effectsToAdd.forEach((effect) => {
                if (effect !== activeEffect) {
                    effects.add(effect);
                }
            });
        }
    };

    if (key === "length" && isArray(target)) {
        depsMap.forEach((dep, key) => {
            if (key === "length" || key >= (newValue as number)) {
                add(dep);
            }
        });
    } else {
        // 在vue3源码中使用void 0 替代undefined
        // 在框架中需要避免一些极端情况，比如ES5之前，undefined不是一个保留字，是可以被重写的
        if (key !== void 0) {
            add(depsMap.get(key));
        }

        // ADD 操作 会影响for...in循环迭代，也会隐式的影响数组长度，这些都需要触发更新
        // DELETE 操作 会影响for...in循环迭代,需要触发更新
        // 注意 delete arr[1],只是设置数组的值为undefined，并不会触发数组长度的更新
        switch (type) {
            case TriggerOpTypes.ADD:
                // 如果不是数组，说明是需要迭代的对象
                if (!isArray(target)) {
                    add(depsMap.get(ITERATE_KEY));
                }
                // key是一个整数类型的字符串,证明是数组，需要触发length属性
                else if (isIntegerKey(key)) {
                    add(depsMap.get("length"));
                }
                break;
            case TriggerOpTypes.DELETE:
                // 如果不是数组，说明是需要迭代的对象
                if (!isArray(target)) {
                    add(depsMap.get(ITERATE_KEY));
                }
                break;
        }
    }

    effects.forEach((effect) => {
        if (effect.options.scheduler) {
            effect.options.scheduler(effect);
        } else {
            effect();
        }
    });
}

export function createReactiveEffect<T = any>(
    fn: () => T,
    options: ReactiveEffectOptions = {}
): ReactiveEffect<T> {
    const effect: ReactiveEffect = function reactiveEffect(): unknown {
        if (!effectStack.includes(effect)) {
            // 先进行清理
            cleanup(effect);
            try {
                // 当effectFn执行时，将其设置为当前激活的副作用函数
                activeEffect = effect;

                // 在调用副作用函数之前，将其压入effectStack栈中
                effectStack.push(effect);

                // 执行副作用函数,结果保存在res中
                const res = fn();
                // 返回结果
                return res;
            } finally {
                // 在调用副作用函数之后，将其从effectStack栈中弹出
                effectStack.pop();

                // activeEffect始终指向当前effectStack栈顶的副作用函数
                activeEffect = effectStack[effectStack.length - 1];
            }
        }
    } as ReactiveEffect;

    // 将options挂载到effectFn上
    effect.options = options;

    // 在effectFn函数上又挂载了deps数组，目的是在收集依赖时可以临时记录依赖关系
    // 在effectFn函数上挂载，其实就相当于挂载在activeEffect
    effect.deps = [];

    // 如果发生了effect嵌套，直接将内部的fn函数给到effect.raw
    effect._isEffect = true;
    effect.raw = fn;

    return effect;
}

export function effect<T = any>(
    fn: () => T,
    options: ReactiveEffectOptions = {}
): ReactiveEffect<T> {
    // 如果fn是一个副作用函数，则直接取其raw属性
    if (isEffect(fn)) {
        fn = fn.raw;
    }
    // 创建一个副作用函数
    const effect = createReactiveEffect(fn, options);

    // 只有非lazy的情况，才会立即执行副作用函数
    if (!options.lazy) {
        effect();
    }

    // 将副作用函数作为返回值返回
    return effect;
}

function cleanup(effect: ReactiveEffect) {
    const { deps } = effect;
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].delete(effect);
        }
        deps.length = 0;
    }
}
