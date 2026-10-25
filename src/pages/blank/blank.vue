<template>
  <view class="blank-wrap"></view>
</template>

<script>
/**
 * 占位页 —— 必须存在。
 *
 * 原因（chat 项目实证 / penosapp README）：
 *   单页应用会被 aiot-vue-cli 合成 single-bundle，此时页面代码被并进 app.js.bin，
 *   由**入口加载器**解析；而原生模块（import ... from 'global'）只有
 *   jsfm 的**页面加载器**才能按名字解析。
 *   凑够 ≥2 页就会输出多 chunk（app.js.bin + index.js.bin + blank.js.bin），
 *   页面 chunk 才能正常加载。
 */
export default {
  data: function () { return {}; }
};
</script>

<style>
.blank-wrap {
  width: 100%;
  height: 100%;
  background-color: #0b111a;
}
</style>
