
const layer1 = document.querySelector("#layer1");
const layer2 = document.querySelector("#layer2");
const btn1 = document.querySelector("#btn1");
const btn2 = document.querySelector("#btn2");

const obj = {
    firstName: "why",
    lastName: "kobe",
};

const buckets = new WeakMap(); // 存储依赖
function track(target, key) {
    // 如果没有注册的副作用函数，直接返回
    if (!activeEffect) {
        return;
    }

    // 1. 根据target从buckets中获取对应的Map，保存的类型是key---effects的键值对
    let depsMap = buckets.get(target);
    // 如果depsMap不存在，则初始化一个depsMap
    if (!depsMap) {
        buckets.set(target, (depsMap = new Map()));
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

    console.log(`依赖收集track---${String(key)}`);
}

function trigger(target, key) {
    // 根据target从buckets中获取对应的depsMap
    const depsMap = buckets.get(target);
    // 如果depsMap不存在，则直接返回
    if (!depsMap) {
        return;
    }

    // 根据key从depsMap中获取对应的deps----> effects
    const deps = depsMap.get(key);

    // 依次执行deps中的副作用函数
    // 为了避免无限循环，这里可以新建一个Set对象
    const effectsToRun = new Set();

    deps &&
        deps.forEach((effectFn) => {
            // 如果当前副作用函数不是当前激活的副作用函数，才将其添加到effectsToRun中
            if (effectFn !== activeEffect) {
                effectsToRun.add(effectFn);
            }
        });

    // 取得与ITERATE_KEY相关的副作用函数
    const iterateEffects = depsMap.get(ITERATE_KEY);

    // 将与ITERATE_KEY相关的副作用函数也添加到effectsToRun中
    iterateEffects &&
        iterateEffects.forEach((effectFn) => {
            if (effectFn !== activeEffect) {
                effectsToRun.add(effectFn);
            }
        })

    effectsToRun.forEach((effect) => {
        if (effect.options?.scheduler) {
            effect.options.scheduler(effect);
        } else {
            effect()
        }
    });
    console.log(`触发更新 trigger---${String(key)}`);
}

const ITERATE_KEY = Symbol("");

const handler = {
    get(target, key, receiver) {
        track(target, key);
        const result = Reflect.get(target, key, receiver);
        return result;
    },
    set(target, key, value, receiver) {
        const result = Reflect.set(target, key, value, receiver);
        trigger(target, key);

        return result;
    },
    ownKeys(target) {
        track(target, ITERATE_KEY);
        return Reflect.ownKeys(target);
    },
};

const proxy = new Proxy(obj, handler);

// 用全局变量存储要被收集的副作用函数
let activeEffect = null;

const effectStack = [];

// effect 改成一个副作用函数的注册机
function effect(fn, options) {
    const effectFn = () => {
        // 先进行清理
        cleanup(effectFn);
        // 当effectFn执行时，将其设置为当前激活的副作用函数
        activeEffect = effectFn;

        // 在调用副作用函数之前，将其压入effectStack栈中
        effectStack.push(effectFn);
        const res = fn();

        // 在调用副作用函数之后，将其从effectStack栈中弹出
        effectStack.pop();

        // activeEffect始终指向当前effectStack栈顶的副作用函数
        activeEffect = effectStack[effectStack.length - 1];
        return res;
    };

    //   将options挂在到effectFn上
    effectFn.options = options;

    // 在effectFn函数上又挂载了deps数组，目的是在收集依赖时可以临时记录依赖关系
    // 在effectFn函数上挂载，其实就相当于挂载在activeEffect
    effectFn.deps = [];
    
    if(effectFn.options?.lazy){
        return effectFn
    }

    effectFn();
}

function cleanup(effect) { 
    const { deps } = effect;
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].delete(effect);
        }
        deps.length = 0;
    }
}

// 自定义调度器
let isFlushing = false;
// 用set集合来存储副作用函数，使用Set是因为Set不允许有重复的值，
// 这样可以保证同一个副作用函数不会重复被添加到队列中
const jobQueue = new Set();

const p = Promise.resolve();

function flushJob() { 
  if (isFlushing) { 
    return;
  }

  isFlushing = true;

  p.then(() => { 
    jobQueue.forEach((job) => job());
  })
    .finally(() => { 
      isFlushing = false;
    })
}

// function computed(getter) {
//     let value;
//     let dirty  = true
//     const effectFn = effect(getter, {
//         lazy: true,
//         scheduler:()=>{
//             dirty = true
//             trigger(obj, 'value')
//         }
//     })

//     const obj = {
//         get value() {
//             if(dirty){
//                 console.log("计算属性get");
//                 value = effectFn();
//                 dirty = false
//             }
//             track(obj, 'value')
//             return value
//         }
//     }
//     return obj
// }

const NOOP = () => {};
const isFunction = (val) => {
    return typeof val === 'function';
}
function computed(getterOrOptions){
    const isFn = isFunction(getterOrOptions)
    let getter;
    let setter;
    if(isFn){
        getter = getterOrOptions
        setter = NOOP
    } else {
        getter = getterOrOptions.get    
        setter = getterOrOptions.set
        isFunction(setter) || (setter = NOOP)
        isFunction(getter) || (getter = NOOP)
    }

    return new ComputedRefImpl(getter, setter)
}

class ComputedRefImpl {
    _value;
    _dirty = true;
    effect;
    _setter;
    constructor(getter, _setter){
        this._setter = _setter
        this.effect = effect(getter, {
            lazy: true,
            scheduler: () => {
                if (!this._dirty) {
                    this._dirty = true
                    trigger(this, 'value')
                }
            }
        })
    }

    get value() {
        if (this._dirty) {
            this._value = this.effect()
            this._dirty = false
        }
        track(this, 'value')
        return this._value
    }

    set value(newValue) {
        this._setter(newValue)
    }

}

const res = computed({
    get() { 
      return proxy.firstName + proxy.lastName;
    },
    set(val) { 
      const names = val.split("");
      proxy.firstName = names[0];
      proxy.lastName = names[1];
    }
  })

effect(() => { 
    layer1.innerHTML = res.value;
    layer2.innerHTML = proxy.firstName + "---" + proxy.lastName;
  })
  
  btn1.addEventListener("click", () => { 
    proxy.firstName = "李";
    proxy.lastName = "四";
  })
  
  btn2.addEventListener("click", () => { 
    res.value = "王五";
  })
  
  
  
