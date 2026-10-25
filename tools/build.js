/**
 * build.js — 用 Node 16 + aiot-vue-cli 构建本工程并打出 AMR 包。
 *
 * 约定来源：penosapp/README.md 与 lx_falcon/README.md
 *   - 必须 Node 16（Node 24 会导致 Vue 打包异常）
 *   - -c -q -p = 压缩 + qjsc 预编译 + 打包 AMR
 *
 * 本脚本用 child_process 以 **inherit** 方式起 CLI：管道捕获在受限环境下会 EPERM。
 *
 * Node 与 CLI 的定位顺序（可用环境变量覆盖）：
 *   NODE_BIN  指定 node 可执行文件，否则用当前进程的 node
 *   FALCON_CLI  指定 aiot-vue-cli 的 cli.js 绝对路径
 *   否则依次尝试：已知完整的 aiot-vue-cli 安装（携依赖）、本地 node_modules/aiot-vue-cli
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function firstExisting(list) {
  for (const p of list) if (p && fs.existsSync(p)) return p;
  return null;
}

const NODE_BIN = firstExisting([
  process.env.NODE_BIN,
  process.execPath,
]) || 'node';

const CLI = firstExisting([
  process.env.FALCON_CLI,
  'D:\\penmods\\penosapp\\chromium_browser_miniapp\\node_modules\\aiot-vue-cli\\src\\cli.js',
  'D:\\penos\\.tools\\aiot-vue-cli\\src\\cli.js',
  path.join(ROOT, 'node_modules', 'aiot-vue-cli', 'src', 'cli.js'),
]);

if (!CLI) {
  console.error('[build] 找不到 aiot-vue-cli，请设置环境变量 FALCON_CLI 指向 cli.js');
  process.exit(1);
}

const args = [CLI, 'build', '-c', '-q', '-p', '--dir', ROOT, '--silent'];
console.log('[build] ' + NODE_BIN + ' ' + args.join(' '));

const r = spawnSync(NODE_BIN, args, { stdio: 'inherit', cwd: ROOT });
process.exit(r.status === null ? 1 : r.status);
