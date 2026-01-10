/*
 * @Author: yutaiqi
 * @Date: 2025-12-29 00:05:50
 * @Description: 文件功能描述
 * @FilePath: /reactivity/rollup.config.mjs
 * @LastEditTime: 2025-12-29 23:54:52
 * @LastEditors: yutaiqi
 */
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import clear from "rollup-plugin-clear";
import htmlTemplate from "rollup-plugin-generate-html-template";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "esm",
  },
  treeshake: false, // 禁用摇树优化
  onwarn: (msg, warn) => {
    // 循环依赖警告 不提示
    if (msg.code !== 'CIRCULAR_DEPENDENCY') {
      warn(msg)
    }
  },
  plugins: [
    json(),
    nodeResolve({
      extensions: [".js", "jsx", "ts", "tsx"],
    }),
    commonjs(),
    typescript(),
    clear({
      targets: ["dist"],
    }),
    htmlTemplate({
      template: "public/index.html",
      target: "dist/index.html",
      attrs: ['type="module"']
    }),
  ],
};