import { hasChanged, isArray, isObject } from "../../shared/index";
import { reactive, toRaw } from "./reactive";
import { track, trigger } from "./effect";
import { TrackOpTypes, TriggerOpTypes } from "./operations";

export interface Ref<T = any> {
  value: T;
}

export function ref(value?: unknown) { 
  return createRef(value);
}

export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
    return !!(r && r.__v_isRef === true)
}

function createRef (rawValue: unknown,shallow: boolean = false) { 
    if(isRef(rawValue)){
        return rawValue;
    }
    return new RefImpl(rawValue, shallow)
}

const convert = <T extends unknown>(val: T): T =>
  isObject(val) ? reactive(val) : val;

class RefImpl<T> {
    private _value: T;
    public readonly __v_isRef = true;
    constructor(private _rawValue: T, private readonly __isShallow: boolean) {
        this._value = __isShallow ? _rawValue : convert(_rawValue);
    }

    get value() {
        track(toRaw(this), TrackOpTypes.GET, 'value');
        return this._value;
    }

    set value(newValue) {
        if (hasChanged(toRaw(newValue), this._rawValue)) {
            this._rawValue = newValue;
        this._value = this.__isShallow ? newValue : convert(newValue);
        trigger(toRaw(this), TriggerOpTypes.SET, 'value', newValue);
        }
        
    }
}

class ObjectRefImpl<T extends object, K extends keyof T> implements Ref<T[K]> {
    public readonly __v_isRef = true;
    
    constructor(
        private readonly _object: T,
        private readonly _key: K
    ) {}

    get value(): T[K] {
        const val = this._object[this._key];
        return val;
    }

    set value(newVal: T[K]) {
        this._object[this._key] = newVal;
    }
}

export function toRef<T extends object, K extends keyof T>(
    object: T,
    key: K
): Ref<T[K]> {
    const val = object[key];
    return isRef(val) ? (val as Ref<T[K]>) : new ObjectRefImpl(object, key);
}

export type ToRefs<T = any> = {
    [K in keyof T]: Ref<T[K]>
}
export function toRefs<T extends object>(object: Record<string, any>): ToRefs<T> {
    const ret: any = isArray(object) ? new Array(object.length) : {};
    for (const key in object) {
        ret[key] = toRef(object, key);
    }
    return ret;
}

export type shallowUnwrapRef<T> = {
    [K in keyof T]: T[K] extends Ref<infer V> ? V : T[K]
}

export function unref<T>(ref: T): T extends Ref<infer V> ? V : T{
    return isRef(ref) ? (ref.value as any) : (ref as T extends Ref<infer V> ? V : T);
}

export const shallowUnwrapHandlers: ProxyHandler<any> = {
    get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
    set: (target, key, value, receiver) => {
        const oldValue = target[key];
        if (isRef(oldValue) && !isRef(value)) {
            oldValue.value = value;
            return true;
        } else {
            return Reflect.set(target, key, value, receiver);
        }
    }
}
export function proxyRefs<T extends object>(
    objectWithRefs: T
): shallowUnwrapRef<T> {
    return new Proxy(objectWithRefs, shallowUnwrapHandlers)
}
