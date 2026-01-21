import { trigger, track, pauseTracking, enableTracking } from './effect';
import { isObject, hasChanged, isArray, isSymbol, extend, isIntegerKey, hasOwn } from '../shared/index';
import { ReactiveFlags, reactive, reactiveMap, readonlyMap, toRaw,readonly } from './reactive';
import { TrackOpTypes, TriggerOpTypes } from './operations';

// 用来表示对象的"迭代依赖"标识
export const ITERATE_KEY = Symbol('');

const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)

// 通过对象存储改动之后的数组方法，进行统一管理
const arrayInstrumentations: Record<string, Function> = {};

;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => { 
  // 首先获取原生方法的引用
  const method = Array.prototype[key] as any;

  arrayInstrumentations[key] = function (this: unknown[], ...args: unknown[]) { 
    // 首先将this转化为非响应式(代理)对象
    const arr = toRaw(this);

    // 遍历当前数组的每个索引，通过track函数对数组索引进行依赖收集
    for (let i = 0, l = this.length; i < l; i++) { 
      track(arr, TrackOpTypes.GET, i + '');
    }

    // 直接在原始对象中查找,使用原始数组和参数
    const res = method.apply(arr, args);
    if (res === -1 || res === false) { 
      // 如果在原始数组中没有找到，注意，还需要进行处理，因为参数也有可能是响应式的
      return method.apply(arr, args.map(toRaw));
    }
    else {
      return res;
    }
  }
});

; (['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => { 
  // 获取到原生的方法
  const method = Array.prototype[key] as any;
  arrayInstrumentations[key] = function (this: unknown[], ...args: unknown[]) { 
    pauseTracking();
    const res = method.apply(this, args);
    enableTracking();
    return res;
  }

});

function createGetter(isReadonly = false, shallow = false) { 
  return function get(target: object, key: string | symbol, receiver: object): any {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    else if (key === ReactiveFlags.IS_READONLY) { 
      return isReadonly;
    }
    else if (
      key === ReactiveFlags.RAW // 当代理对象访问__v_raw属性时，返回原始对象
      && receiver === (isReadonly ? readonlyMap : reactiveMap).get(target) // 确保请求原始对象的访问是代理对象发起的
    ) { 
      return target;
    }
  
  
    const targetIsArray = isArray(target);
    if (targetIsArray && arrayInstrumentations.hasOwnProperty(key)) { 
      return Reflect.get(arrayInstrumentations, key, receiver);
    }
  
    // 返回对象的相应属性值
    const result = Reflect.get(target, key, receiver);

    const keyIsSymbol = isSymbol(key);

    if (keyIsSymbol
      ? builtInSymbols.has(key as symbol)
      : key === '__proto__') { 
      return result;
    }

    // todo: 收集依赖
    // 只有非只读的才会进行依赖收集
    if (!isReadonly) { 
      track(target, TrackOpTypes.GET, key);
    }

    // 如果只是浅层代理，直接返回结果
    if (shallow) { 
      return result;
    }
    
    // 如果是对象，再次进行递归代理
    if (isObject(result)) { 
      return isReadonly ? readonly(result) : reactive(result);
    }
  
    return result;
  }
}

function createSetter(shallow = false) {
  return function set(target: Record<string | symbol, unknown>, key: string | symbol, value: unknown, receiver: object): boolean { 
    
    let oldValue = target[key];

    // 判断动作是ADD还是SET
    // 如果目标是数组，并且key是一个有效的数组索引，需要判断key是否小于数组长度
    // 如果目标是普通对象或者其他非数组对象，判断对象是否有这个key
    // const hadKey = 如果是数组，并且key是一个有效的数组索引 ？
    //    key 是否小于数组的长度(小于Set操作，大于Add操作)
    //    : 不是数组直接判断是否有这个key属性(有Set操作，没有Add操作)
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);
    
    
    const result = Reflect.set(target, key, value, receiver);


    if (target === toRaw(receiver)) { 
      if (!hadKey) {  // ADD操作
        trigger(target, TriggerOpTypes.ADD, key, value);
      }
      else if (hasChanged(value, oldValue)) {  // SET操作
        trigger(target, TriggerOpTypes.SET, key, value, oldValue);
      }
    }

    
    return result;
  }
}

const get = /*#__PURE__*/createGetter();
const readonlyGet = /*#__PURE__*/createGetter(true);
const shallowGet = /*#__PURE__*/createGetter(false, true);
const shallowReadonlyGet = /*#__PURE__*/createGetter(true, true);

const set = /*#__PURE__*/createSetter();
const shallowSet = /*#__PURE__*/createSetter(true);

// function get(target: object, key: string | symbol, receiver: object): any { 
//   if (key === ReactiveFlags.IS_REACTIVE) {
//     return true;
//   }
//   else if (
//     key === ReactiveFlags.RAW // 当代理对象访问__v_raw属性时，返回原始对象
//     && receiver === targetMap.get(target) // 确保请求原始对象的访问是代理对象发起的
//   ) { 
//     return target;
//   }


//   const targetIsArray = isArray(target);
//   if (targetIsArray && arrayInstrumentations.hasOwnProperty(key)) { 
//     return Reflect.get(arrayInstrumentations, key, receiver);
//   }


//   // todo: 收集依赖
//   track(target, TrackOpTypes.GET, key);
//   // 返回对象的相应属性值
//   const result = Reflect.get(target, key, receiver);

//   // 如果是对象，再次进行递归代理
//   if (isObject(result)) { 
//     return reactive(result);
//   }

//   return result;
// }

// function set(target: Record<string | symbol, unknown>, key: string | symbol, value: unknown, receiver: object): boolean { 
//   // todo: 触发更新
//   // 判断动作是ADD还是SET，而且SET操作应该是值不一样的情况下再进行处理
//   const hadKey = target.hasOwnProperty(key);

//   const type = target.hasOwnProperty(key) ? TriggerOpTypes.SET : TriggerOpTypes.ADD;


//   // ts注意object类型，target[key]如果直接这么写，ts会报错，元素有隐式的any类型
//   // 这里可以直接将target修改为Record<string | symbol, unknown>
//   let oldValue = target[key];

//   // 如果是数组获取长度,首先获取的是修改之前的长度
//   const oldLen = isArray(target) ? target.length : 0;

//   // if (!hadKey) {
//   //   trigger(target, TriggerOpTypes.ADD, key);
//   // }
//   // else if(hasChanged(value, oldValue)) { 
//   //   trigger(target, TriggerOpTypes.SET, key);
//   // }
  
//   // 设置对象的相应属性值
//   const result = Reflect.set(target, key, value, receiver);
//   if (!result) { 
//     return result;
//   }

//   // 修改之后的长度
//   const newLen = isArray(target) ? target.length : 0;

//   if (hasChanged(value, oldValue) || type === TriggerOpTypes.ADD) { 
//     trigger(target, type, key);
//     if (isArray(target) && oldLen !== newLen) { 
//       if (key !== 'length') { 
//         trigger(target, TriggerOpTypes.SET, 'length');
//       }
//       else {
//         for(let i=newLen; i<oldLen; i++) { 
//           trigger(target, TriggerOpTypes.DELETE, i + '');
//         }
//       }
//     }
//   }

//   return result;
// }

function has(target: object, key: string | symbol): boolean { 
  // todo: 收集依赖
  track(target, TrackOpTypes.HAS, key);
  const result = Reflect.has(target, key);
  return result;
}

function ownKeys(target: object): (string | symbol)[] { 
  // 依赖收集
  track(target, TrackOpTypes.ITERATE, ITERATE_KEY);
  return Reflect.ownKeys(target);
}

function deleteProperty(target: Record<string | symbol, unknown>, key: string | symbol) { 
  // 删除也判断是否属性存在
  const hadKey = target.hasOwnProperty(key);
  // 删除的结果
  const result = Reflect.deleteProperty(target, key);

  // 对象有这个属性，并且删除成功，触发更新
  if(hadKey && result) { 
    trigger(target, TriggerOpTypes.DELETE, key);
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
  get:readonlyGet,
  set(target, key) { 
    console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
    return true;
  },
  deleteProperty(target, key) { 
    console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
    return true;
  }
}

export const shallowReactiveHandlers: ProxyHandler<object> = extend(
  {},
  mutableHandlers,
  {
    get: shallowGet,
    set: shallowSet
  }
)