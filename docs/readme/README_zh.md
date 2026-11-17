<div align="center">

[English](../../README.md) · **简体中文** · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

# @dsh-plugins/file-upload

这是 [DSH](https://github.com/deepseek-ai/deepseek-harness) Web 侧边栏里一个**位于“自动化任务”下方的回形针条目**，点开就是一个上传页面：像工作区对话框那样在主机上选择文件夹，一次挑好几个文件，然后看着它们各自带着一条独立的进度条上传。

<img src="../assets/uploaded.png" alt="三个文件上传完成后的“上传文件”页面：左侧边栏中回形针条目处于选中状态，目标文件夹已设定，每一行都显示绿色进度条和“已上传”标签" width="1200" />

<sub>侧边栏中的工作区名称和会话名称已做模糊处理。</sub>

</div>

## 为什么

DSH 能把字节*搬出*工作区（[`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download)），也能为单条提示暂存浏览器附件，但此前没有办法在不开主机 shell 的前提下，把几个已有的文件放进服务器上的某个文件夹。本插件补上了缺少的那一半，位置就选在其他全局面板所在的地方。

## 出现位置

| 位置 | 内容 |
| --- | --- |
| 左侧边栏 | 一行带回形针图标的 **上传文件** 条目，紧挨在 **自动化任务** 下方（`order: 11`） |
| 主栏 | 上传页面，选中该行即可打开 |

<img src="../assets/upload-page.png" alt="尚未选择目标文件夹的“上传文件”页面：侧边栏条目位于“自动化任务”下方，页面上是一张目标文件夹卡片和一个虚线拖放区" width="1200" />

页面上的所有内容构成一条流程：

1. **目标文件夹** —— *选择文件夹* 会打开一个应用内对话框，数据来自主机自己的目录列表（`ctx.uiWorkspace.listDirectory`，也就是 **选择工作区目录** 背后的同一套原语）：面包屑跳转、点击即可编辑的路径、隐藏文件夹开关，以及一个 *选择此文件夹* 的确认。文件夹列表来自主机，所以在没有操作系统选择器的远程浏览器里同样可用。

   <img src="../assets/folder-picker.png" alt="“在服务器上选择文件夹”对话框：面包屑显示主目录和演示文件夹，下面列出 archive、photos 和 reports" width="1200" />

2. **选择文件** —— 页面的文件选择器支持一次选中多个文件，拖放到页面任意位置的文件也会进入同一个队列。
3. **上传文件** —— 队列一次只处理一个文件；每一行显示已发送字节数、进度条和状态标签。失败的行会保留错误信息并提供 **重试**；**取消上传** 会停下队列，其余各行仍保持就绪。

   <img src="../assets/uploading.png" alt="上传进行中：第一行显示 800 MB 中的 215 MB，进度条半满并带有“上传中”标签，其余各行以“就绪”状态等待，页头提供“取消上传”" width="1200" />

## 工作原理

**主机端** —— 共享 `/api` 边界上的一条带鉴权的流式路由：

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

它挂在 `ctx.connection.fetch` 上，因此 Connection 会在本处理器运行之前，用浏览器持有的已签名 Harness 凭证对请求做准入判定：未通过鉴权的请求根本到不了这里，而且只服务所有者 Peer。两个坐标都会被校验（一个已存在的绝对目录；一个不含分隔符的裸文件名），请求体则直接流式写入同目录下的 `.dsh-upload-<uuid>.part` 文件，只有在最后一个字节到达之后才会改名就位——被中止或失败的上传不会在真实文件名下留下任何东西。

**浏览器端** —— 一个手写的 lazy-CJS bundle，只依赖 shell 预置的基线（`react`、`react-dom`）。它注册两个贡献项：`sidebar.panellist` 条目，以及用同样的键注册的 `main` 面板——这正是侧边栏要选中它所需的全部约定。真正让逐文件进度可信的，是页面线程上那个朴素的 `XMLHttpRequest`：`xhr.upload.onprogress` 报告的是浏览器确已交给套接字的字节数。

## 安装

本包是一个 **bundle**（`dsh.bundle.patch`），因此插件管理器可以把它当作一行来安装和更新：

```bash
# 从本地检出安装 —— 链接此目录，修改即时生效
dsh plugin --profile web add /path/to/dsh-file-upload

# 或者从 git 远程仓库安装
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

这两种方式也可以从界面完成：**插件 → 添加插件**。

如果 `PATH` 上没有 `dsh`，就把检出目录软链进 profile，再手工添加这一行：

```yaml
# $DSH_HOME/profiles/web/cordis.patch.yml
- insert:
    - id: file-upload-panel
      name: '@dsh-plugins/file-upload'
```

```bash
ln -s /path/to/dsh-file-upload \
  "$DSH_HOME/profiles/web/node_modules/@dsh-plugins/file-upload"
```

这一行的 id 不能与已随附的 id 重复：`file-upload` 已经属于 `@deepseek-ai/dsh-client-file-upload`，也就是浏览器的提示附件传输通道；两个共用同一 id 的 Loader 条目只会组合出其中一个。所以才有了 `file-upload-panel`。

把 harness 重启一次，新添加的 Loader 行才会被组合。在运行中的实例上，插入的行无需重启即可挂载。

验证一下：侧边栏会在 **自动化任务** 正下方多出 **上传文件**，页面会列出主机的主目录，上传完成后文件会落进你选中的文件夹：

```bash
ls -l "/the/folder/you/chose"
```

## 配置

两个开关都放在插件行的 `config` 里，因此 profile 的 patch 层在升级后仍会保留它们：

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # 默认 1073741824 (1 GiB)，1024 … 16 GiB
    conflict: overwrite        # 默认 "rename"
```

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | 单个文件的大小上限（含边界值）；更大的请求体以 `413` 拒绝，且不会存储任何内容 |
| `conflict` | `"rename"` | 名称已被占用时的处理方式：`rename` 保留原文件，新文件以 `name (1).ext` 写入；`overwrite` 则直接替换 |

这一行把 schema 声明为手写的 Standard Schema，因此上面的取值会在插件激活时被校验，取值不合法会让该行报错失败。插件管理器只读取原生 Schemastery 图，所以它的配置表单会把这一行的 schema 报为不受支持，也不提供任何字段：请像上面那样直接在 patch 里设值。

## 安全说明

- 这条路由是 **`/api` Connection 边界上的一条精确路由**，而不是原始的 Web 服务器路径，因此它要求浏览器出示已签名的会话 Cookie，并且只服务所有者 Peer。它自身也没有添加任何 Host/Origin 放宽。
- 这条路由会以 DSH 进程的权限，写入已通过鉴权的操作者所指的任何位置——这与工作区目录选择器和 `bash` 工具本来拥有的权限范围相同。目标必须已经存在；本插件不会创建文件夹。
- 浏览器只给出一个文件夹和一个文件名，绝不会给出其中某一层路径：文件名既不含 `.` 也不含分隔符，因此请求无法逃出所选文件夹。
- 临时文件创建在目标文件旁边，失败或取消时会被删除；除非每一个字节都已到达，否则最终文件名下不会留下任何东西。

## 已知限制

- 每次访问页面只有一个上传队列：列表只存在于页面内，上传中途离开页面会让传输继续（由主机把文件写完），但行记录会被遗忘。
- 选择器里无法创建文件夹，也不支持续传：失败的上传会从第一个字节重新开始。
- 选择器只列出文件夹，层级被截断时只会报 `truncated`，不会分页。
- 页面没有针对 `maxFileBytes` 的客户端预检：超大文件要等传输结束后才由主机拒绝。
- 主机的错误文本是英文，并会在消息里保留 errno 码。

## 开发

```bash
npm test        # node --test：覆盖路由与 bundle 的 22 个用例
npm run check   # 对两端的语法检查
```

主机端测试用真实的 `Request`/`Response` 对象和真实的临时目录来驱动路由，因此无需 harness 就能覆盖字节通路、冲突策略、大小上限、取消以及失败文本。浏览器端测试在一个 VM 中执行 bundle，React 和 DOM 都是桩实现，因此既不需要 harness，也不需要浏览器。

## 文件

| 路径 | 作用 |
| --- | --- |
| `lib/index.js` | 主机端：流式写入路由及其配置 schema |
| `lib/client.js` | 浏览器端：lazy-CJS bundle、侧边栏条目、页面、文件夹对话框 |
| `cordis.patch.yml` | bundle patch：那一条主机行 |
| `locale/*.json` | 插件管理器的显示标题和描述 |
| `icon.svg` | 回形针的方块图标 |
| `docs/assets/*.png` | 本 README 及其译文使用的截图 |
| `docs/readme/README_*.md` | 各语言的译文 |
| `test/host.test.mjs` | 路由行为：状态码、策略、上限、取消、失败文本 |
| `test/client.test.mjs` | bundle 约定：条目形状、顺序、字典、样式表 |

## 翻译

[English](../../README.md) · **[简体中文](README_zh.md)** · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

各语言的译文位于 [`docs/readme/`](.)。它们描述的是同一个插件；若与本文有出入，以本文为准。

## 许可证

MIT.
