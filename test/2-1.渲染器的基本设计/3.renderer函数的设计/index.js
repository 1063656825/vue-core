/*
 * @Author: yutaiqi
 * @Date: 2026-01-25 22:26:52
 * @Description: 文件功能描述
 * @FilePath: /reactivity/test/2-1.渲染器的基本设计/3.renderer函数的设计/index.js
 * @LastEditTime: 2026-01-27 23:49:43
 * @LastEditors: yutaiqi
 */
const options = {
    createElement(tag) {
        return document.createElement(tag);
    },
    setElementText(el, text) {
        el.textContent = text;
    },
    insert(el, parent, anchor = null) {
        parent.insertBefore(el, anchor);
    },
    patchProps(el, key, prevValue, nextValue) {
        if (key === 'class') {
            el.className = nextValue || ""
        }
        else if (shouldSetAsProps(el, key, nextValue)) {
            const type = typeof el[key];
            if (type === 'boolean' && nextValue === '') {
                el[key] = true;
            } else {
                el[key] = nextValue;
            }
        } else {
            el.setAttribute(key, nextValue);
        }
    }
}

function shouldSetAsProps(el, key, value) {
    if (key === 'form' && el.tagName !== 'INPUT') {
        return false;
    }
    return key in el;
}

function createRenderer(options) {
    const { createElement, setElementText, insert, patchProps } = options

    function unmount(vnode) {
        const parent = vnode.el.parentNode;
        if (parent) {
            parent.removeChild(vnode.el);
        }
    }
    function render(vnode, container) {
        // 调用patch方法
        if (vnode === null && container.__vnode) {
            unmount(container.__vnode)
        } else if (vnode !== null) {
            patch(container.__vnode, vnode, container, null);
        }

        container.__vnode = vnode;
    }

    function patch(oldVnode, newVnode, container, parentComponent) {
        if(oldVnode && oldVnode.type === newVnode.type){
            unmount(oldVnode);
            oldVnode = null
        }
        const { type } = newVnode;
        if(typeof type === 'string'){
            if (!oldVnode) {
                // 挂载
                mountElement(newVnode, container, parentComponent);
            } else {
                // 更新
                patchElement(oldVnode, newVnode, container, parentComponent);
            }
        }else if (typeof type === 'object') {
            // 组件
        }else {
            // 其他形式
        }
        
    }

    function mountElement(vnode, container, parentComponent) {
        const el = vnode.el =  createElement(vnode.type);
        // 遍历子节点，针对不同的子节点，进行处理
        if (typeof vnode.children === 'string') {
            setElementText(el, vnode.children)
        } else if (Array.isArray(vnode.children)) {
            vnode.children.forEach(child => {
                patch(null, child, el)
            })
        }

        /**
         * 注意挂载属性的时候，需要注意的问题
         * HTML标签属性名字和DOM API属性名字可能不一样，甚至有可能有些有，有些没有
         * 
         */

        if (vnode.props) {
            for (const key in vnode.props) {
                const value = vnode.props[key];
                patchProps(el, key, null, value)
            }
        }
        container.append(el)
    }

    function patchElement(n1, n2, container, parentComponent) {

    }

    return {
        render
    };
}


const cls = { btn: true, 'btn-primary': true }
const clsArr = ['btn', 'btn-primary', { baz: true }]

const isString = (val) => {
    return typeof val === 'string'
}

const isObject = (val) => {
    return val !== null && typeof val === 'object'
}

const isArray = Array.isArray

function normalizeClass(value) {
    let res = "";

    if (isString(value)) {
        res = value;
    }
    else if (isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const normalized = normalizeClass(value[i])
            if (normalized) {
                res += normalized + " "
            }
        }
    }
    else if (isObject(value)) {
        for (const name in value) {
            if (value[name]) {
                res += name + " "
            }
        }

    }


    return res;
}


const vnode = {
    type: "h1",
    props: {
        id: 'foo',
        class: normalizeClass(cls)
    },
    children: [
        {
            type: "p",
            children: "hello world"
        }
    ]
}

const renderer = createRenderer(options);
// 首次渲染
renderer.render(vnode, document.getElementById('app'))

// // 第二次渲染
// renderer.render(newVnode, document.getElementById('app'))

// // 第三次渲染
// renderer.render(null, document.getElementById('app'))

