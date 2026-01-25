// import { reactive } from "./reactive";

// const obj = {
//   a: 1,
//   b: 2
// }

// const r = reactive(obj);
// console.log(r.a);

// r.a = 10;


// 如果代理的是同一个对象的处理
// import { reactive } from "./reactive";

// const obj = {
//   a: 1,
//   b: 2
// }

// const state1 = reactive(obj);
// const state2 = reactive(obj);

// console.log(state1 === state2);


// 如果对代理对象再进行代理的处理
// import { reactive } from "./reactive";

// const obj = {
//   a: 1,
//   b: 2
// }

// const state1 = reactive(obj);
// const state2 = reactive(state1);

// console.log(state1 === state2);



// 访问器属性边界问题的处理
// import { reactive } from "./reactive";

// const obj = {
//   a: 1,
//   b: 2,
//   get c() { 
//     console.log('get c', this);
//     return this.a + this.b;
//   }
// }

// const state1 = reactive(obj);

// function fn() { 
//   state1.c;
// }

// fn();


// 对象的嵌套问题的处理
// import { reactive } from "./reactive";

// const obj = {
//   a: 1,
//   b: 2,
//   c: {
//     d: 3
//   }
// }

// const state1 = reactive(obj);

// function fn() { 
//   state1.c.d;
// }

// fn();

// console.log(state1)
// console.log(state1.c)


// 判断对象是否有某个属性问题的处理
// import { reactive } from "./reactive";

// const obj = {
//   a: 1,
//   b: 2,
//   c: {
//     d: 3
//   }
// }

// const state1 = reactive(obj);

// function fn() { 
//   console.log('a' in state1);
// }

// fn();


/*
// 相关动作的处理思考
import { reactive } from "./reactive";

const obj = {
  a: 1,
  b: 2,
  c: {
    d: 3
  }
}

// const state1 = reactive(obj);

// function fn() { 
//   'a' in state1;
// }

// // 思考：之前存在a属性，这里更新改变了a的值，会对'a' in state1的结果产生影响吗？
// state1.a = 123;

// fn();


// function fn() { 
//   'e' in state1;
// }

// // 思考：之前不存在e属性，这里更新改变了e的值，会对'e' in state1的结果产生影响吗？
// (state1 as any).e = 123;

// fn();
*/


// 循环迭代的问题
// import { reactive } from "./reactive";

// const obj = {
//   a: 1,
//   b: 2,
//   c: {
//     d: 3
//   }
// }

// const state1 = reactive(obj);

// function fn() { 
//   for (const key in state1) { 
//     console.log(key)
//   }
// }
// fn();
// function fn() { 
//   Object.keys(state1);
// }


// 删除属性的问题
// import { reactive } from "./reactive";

// const obj = {
//   a: 1,
//   b: 2,
//   c: {
//     d: 3
//   }
// }

// const state1 = reactive(obj);

// function fn() { 
//   Object.keys(state1);
// }
// fn();

// state1.a = 2;
// //@ts-ignore
// state1.e = 2;

// //@ts-ignore
// delete state1.a;

// //@ts-ignore
// delete state1.f;


// 数组在读取的时候代理对象相关处理
// import { reactive,toRaw } from "./reactive";

// const arr1 = [3, 4, 5];
// const state1 = reactive(arr1);

// function fn() { 
//   state1[0];
//   state1[1] = 2;

//   for (let i = 0, l = state1.length; i < l; i++) { 
//     state1[i];
//   }

//   for (const key in state1) { }
//   state1.indexOf(2)
// }

// fn();


// const obj = { a: 1, b: 2 };
// const arr1 = [3, obj, 5];
// const state1 = reactive(arr1);

// function fn() { 
//   const index = state1.lastIndexOf(obj);

//   console.log(arr1, obj);
//   console.log(state1[1], obj);
//   console.log(index);
// }
// fn();

// import { reactive } from "./reactive";

// 数组长度隐式更新的问题
// const arr1 = [1, 2, , 4, 5, 6];
// const state1 = reactive(arr1);

// function fn() { 
//   state1[0] = 99;
//   state1[2] = 100;
//   // 这里会触发数组长度length的隐式更新，所以我们自己的框架需要触发相关set更新
//   state1[10] = 77;
// }

// fn();

// // 数组长度显式更新的问题
// const arr1 = [1, 2, 3, 4, 5, 6];
// const state1 = reactive(arr1);

// function fn() { 
//   // 如果数组长度的设置小于原来数组的长度，其实应该是两件事情
//   // oldLen 6
//   // newLen 3

//   // set length 3
//   // delete 3, 
//   // delete 4, 
//   // delete 5
//   state1.length = 3;
// }

// fn();


// push pop shift unshift splice
// const arr1 = [1, 2, 3];
// const state1 = reactive(arr1);

// function fn() { 
//   state1.push(4);
// //   state1.pop();
// //   state1.shift();
// //   state1.unshift(4);
// //   state1.splice(1, 1);
// }
// fn();

// readonly 处理
// import { readonly } from "./reactive";

// const obj = {
//   a: 1,
//   b: 2,
//   c: {
//     d: 3,
//   },
// };

// const readonlyProxy = readonly(obj);
// readonlyProxy.a;

// //@ts-ignore
// readonlyProxy.a = 2;
// console.log(readonlyProxy.a);

// //@ts-ignore
// readonlyProxy.c.d = 22;
// console.log(readonlyProxy.c.d);



// 一些对象标准行为(特殊情况)需要进行排除
// import { reactive } from "./reactive";

// const obj = {
//   a: 1,
//   b: 2,
//   c: {
//     d: 3,
//   },
//   [Symbol.toStringTag]: 'MyObject',
//   items: [1, 2, 3],
//   [Symbol.iterator]: function() {
//     let index = 0
//     const items = this.items;
//     return {
//       next: function() {
//         return index < items.length
//           ? { value: items[index++], done: false }
//           : { value: undefined, done: true }
//       }
//     }
//   }
// };

// console.log(obj.toString())  //[object Object]

// for (const item of obj) { 
//   console.log(item);
// }

// const state1 = reactive(obj);

// console.log((state1 as any).__proto__)
// console.log(state1.toString());

// for (const item of state1) { 
//   console.log(item);
// }


// shallowReactive 浅层代理
// import { reactive, shallowReactive } from "./reactive";

// const obj1 = {
//   a: 1,
//   b: 2,
//   c: {
//     d: 3,
//   }
// }

// const obj2 = {
//   a: 1,
//   b: 2,
//   c: {
//     d: 3,
//   }
// }

// const state1 = reactive(obj1);
// console.log(state1.c)
// const state2 = shallowReactive(obj2);
// console.log(state2.c)

export { reactive } from "./reactive";
export { trigger } from "./effect";
export { ref } from "./ref";