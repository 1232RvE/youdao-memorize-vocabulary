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

// 构建产物统一落到 data/（仓库里 amr 的既定位置，方便 clone 后直接 adb install）
const OUT_DIR = path.join(ROOT, 'data');
fs.mkdirSync(OUT_DIR, { recursive: true });

const args = [CLI, 'build', '-c', '-q', '-p', '--dir', ROOT, '--silent'];
console.log('[build] ' + NODE_BIN + ' ' + args.join(' '));

const r = spawnSync(NODE_BIN, args, { stdio: 'inherit', cwd: ROOT });
const status = r.status === null ? 1 : r.status;

// aiot-vue-cli 把 AMR 吐在工程根目录，这里搬到 data/
if (status === 0) {
  for (const f of fs.readdirSync(ROOT)) {
    if (!f.endsWith('.amr')) continue;
    const from = path.join(ROOT, f);
    const to = path.join(OUT_DIR, f);
    fs.renameSync(from, to);
    console.log('[build] 产物已移动: ' + to);
  }
}

process.exit(status);
