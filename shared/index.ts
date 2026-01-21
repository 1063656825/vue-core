// 自定义守卫，`形参 is 类型`的语法结构
export const isObject = (val: unknown): val is Record<any, any> => {
    return val !== null && typeof val === 'object'
}

export const isString = (val: unknown): val is string => {
    return typeof val === 'string'
}

export const isFunction = (val: unknown): val is Function => {
    return typeof val === 'function'
}

// 空函数
export const NOOP = () => { }

export const isArray = Array.isArray

export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
    return isObject(val) && isFunction(val.then) && isFunction(val.catch)
}

// 通过Object.is来判断两个值是否相等,框架可以避免一些特殊情况
// 比如NaN和NaN是相等的，而Object.is(NaN, NaN)是true
// +0和-0是不相等的，而Object.is(+0, -0)是false
export const hasChanged = (value: any, oldValue: any): boolean => {
    return !Object.is(value, oldValue)
}

export const isSymbol = (val: unknown): val is symbol => {
    return typeof val === 'symbol'
}

export const extend = Object.assign

// 判断一个key是否是一个合法的整数类型的字符串
export const isIntegerKey = (key: unknown) => {
    return isString(key) && // 检查key是否是字符串
        key !== 'NaN' &&  // 确保key不是NaN字符串
        key[0] !== '-' && // 确保key不是负数
        '' + parseInt(key, 10) === key // 确保key是一个可以被转换为整数的合法字符串
}

const hasOwnProperty = Object.prototype.hasOwnProperty

export const hasOwn = (
    val: object,  // 判断的对象
    key: string | symbol // 判断的key
): key is keyof typeof val => hasOwnProperty.call(val, key)