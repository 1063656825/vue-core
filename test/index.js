/*
 * @Author: yutaiqi
 * @Date: 2025-12-28 23:28:26
 * @Description: 文件功能描述
 * @FilePath: /reactivity/test/index.js
 * @LastEditTime: 2025-12-28 23:48:38
 * @LastEditors: yutaiqi
 */
const layer = document.getElementById('layer');
const btn = document.getElementById('btn');

const obj = {
    name: '张三',
    age: 18
}

// 如果有多个副作用怎么办
const bukets = new Set();

const handler = {
    get(target, key, receiver) {
        console.log("hello");
        bukets.add(effect)
        const result = Reflect.get(target, key, receiver);
        return result;
    },
    set(target, key, value, receiver){
        console.log("set");
        const result = Reflect.set(target, key, value, receiver);
        bukets.forEach(effect => effect());
        return result;
    }
}

const proxy = new Proxy(obj, handler);

function effect() {
    layer.innerHTML = `name: ${proxy.name} age: ${proxy.age}`;
}

effect();

btn.addEventListener('click', ()=>{
    proxy.name = '李四';
    proxy.age = 20;
})