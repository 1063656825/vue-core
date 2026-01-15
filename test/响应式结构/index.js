/*
 * @Author: yutaiqi
 * @Date: 2025-12-28 23:28:26
 * @Description: 文件功能描述
 * @FilePath: /reactivity/响应式结构/index.js
 * @LastEditTime: 2026-01-10 16:47:29
 * @LastEditors: yutaiqi
 */
const layer = document.getElementById('layer');
const btn = document.getElementById('btn');

const obj = {
    name: '张三',
    age: 18
}
// 用全局变量存储要被收集的副作用函数
let activeEffect = null;

// 如果有多个副作用怎么办
const bukets = new WeakMap();

const track = (target, key) => {
    // 如果没有注册的副作用函数，直接返回
    if (!activeEffect) {
        return result;
    }

    // 1. 根据target 从 buckets 中获取对应的副作用函数
    let depsMap = bukets.get(target);
    if (!depsMap) {
        depsMap = new Map();
        bukets.set(target, depsMap);
    }

    // 2. 根据key 从 depsMap 中获取对应的副作用函数
    let deps = depsMap.get(key);
    if (!deps) {
        deps = new Set();
        depsMap.set(key, deps);
    }

    // 3. 将当前激活的副作用函数添加到 deps 中
    deps.add(activeEffect);

}

const trigger = (target, key, result) => {
    // 1. 根据target 从 buckets 中获取对应的副作用函数
    const depsMap = bukets.get(target);
    if (!depsMap) {
        return result;
    }

    // 2. 根据key 从 depsMap 中获取对应的副作用函数
    const deps = depsMap.get(key);
    if (!deps) {
        return result;
    }

    // 3. 遍历 deps 执行副作用函数
    deps.forEach(effect => {
        effect();
    });
}

const handler = {
    get(target, key, receiver) {
        const result = Reflect.get(target, key, receiver);
        track(target, key);
        return result;
    },
    set(target, key, value, receiver) {
        const result = Reflect.set(target, key, value, receiver);
        trigger(target, key, result)
        return result;
    }
}

const proxy = new Proxy(obj, handler);

function effect(fn) {
    // 当调用effect函数是，将fn赋值给activeEffect
    activeEffect = fn;
    // 执行fn函数
    fn();
}

// 副作用函数与被操作的目标字段之间没有建立明确的关系
effect(function effectFn() {
    console.log("fn")
    layer.innerHTML = proxy.name;

});

btn.addEventListener('click', () => {
    // proxy.name = "李四";
    // proxy.city没有被依赖收集，不应该再次被触发副作用函数
    proxy.city = "北京";
});