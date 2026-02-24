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
        if (key?.startsWith('on')) {
            const eventName = key.slice(2).toLowerCase();
            // _vei vue event invoker的简写，就是一个缓存
            let invokers = el._vei || (el._vei = {});
            let invoker = invokers[key]
            if (nextValue) {
                if (!invoker) {
                    invoker = el._vei = (e) => {
                        if (e.timeStamp < invoker.attached) return;
                        if (Array.isArray(invoker.value)) {
                            invoker.value.forEach(fn => fn(e));
                        } else {
                            invoker.value(e);
                        }
                    }
                    invoker.value = nextValue;
                    invoker.attached = performance.now();
                    el.addEventListener(eventName, nextValue);

                } else {
                    invoker.value = nextValue;
                }
            } else {
                prevValue && el.removeEventListener(eventName, prevValue);

            }
        }
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

    function patchElement(oldVnode, newVnode) {
        const el = newVnode.el = oldVnode.el,
            oldProps = oldVnode.props || {},
            newProps = newVnode.props || {};

        // 更新属性
        for (const key in newProps) {
            if (oldProps[key] !== newProps[key]) {
                patchProps(el, key, oldProps[key], newProps[key]);
            }
        }

        // 如果不存在则删除属性
        for (const key in oldProps) {
            if (!(key in newProps)) {
                patchProps(el, key, oldProps[key], null);
            }
        }

        // 更新子节点
        patchChildren(oldVnode, newVnode, el);

    }

    /**
     * @description: 子节点处理
     * @param {*} oldVnode
     * @param {*} newVnode
     * @param {*} container
     * @return {*}
     */
    function patchChildren(oldVnode, newVnode, container) { 
        // 子节点为字符串
        if(typeof newVnopde.children === 'string' ){
            if(Array.isArray(oldVnode.children)){
                oldVnode.children.forEach(child => unmount(child))
            }

            setElementText(container, newVnode.children);

        }else if(Array.isArray(newVnode.children)){
            // 子节点为数组,循环卸载子节点
            if(Array.isArray(oldVnode.children)){
                oldVnode.children.forEach(child => unmount(child))
            }else {
                setElementText(container, '');
            }
 
            newVnode.children.forEach((child, index) => {
                patch(null, child, container);
            })

        }else{
            // 子节点为空节点 
            if(Array.isArray(oldVnode.children)){
                oldVnode.children.forEach(child => unmount(child))
            }
            setElementText(container, '');

        }
    }   

    function patch(oldVnode, newVnode, container, parentComponent) {
        if (oldVnode && oldVnode.type === newVnode.type) {
            unmount(oldVnode);
            oldVnode = null
        }
        const { type } = newVnode;

        if (typeof type === 'string') {
            if (!oldVnode) {
                // 挂载
                mountElement(newVnode, container, parentComponent);
            } else {
                // 更新
                patchElement(oldVnode, newVnode, container, parentComponent);
            }
        } else if (typeof type === 'object') {
            // 组件
        } else {
            // 其他形式
        }

    }

    function mountElement(vnode, container, parentComponent) {
        const el = vnode.el = createElement(vnode.type);
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


const vnode1 = {
    type: "div",
    props: {
      onClick: () => {
        alert("click1")
      }
    },
    children: [
      {
        type: "p",
        children: "hello p"
      }
    ]
  };
  
  const vnode2 = {
    type: "div",
    props: {
      onClick: () => {
        alert("click2")
      }
    },
    children: [
      {
        type: "h1",
        children: "hello h1"
      },
      {
        type: "h2",
        children: "hello h2"
      }
    ]
  };
  
  const renderer = createRenderer(options);
  renderer.render(vnode1, document.getElementById("app"));
  
  setTimeout(() => { 
    renderer.render(vnode2, document.getElementById("app"));
  },2000)
  
  