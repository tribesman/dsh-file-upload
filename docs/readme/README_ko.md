<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · **한국어** · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

# @dsh-plugins/file-upload

[DSH](https://github.com/deepseek-ai/deepseek-harness) 웹 사이드바에서 **'자동화 작업' 바로 아래에 놓이는 종이 클립 행**입니다. 이 행을 열면 업로드 페이지가 나오고, 워크스페이스 대화상자와 같은 방식으로 호스트의 폴더를 고른 뒤 여러 파일을 한 번에 선택하면, 파일마다 각자의 진행 표시줄을 달고 업로드되는 모습을 볼 수 있습니다.

<img src="../assets/uploaded.png" alt="파일 세 개의 업로드가 끝난 뒤의 '파일 업로드' 페이지: 왼쪽 사이드바에서 종이 클립 행이 선택되어 있고, 대상 폴더가 지정되어 있으며, 각 행에 초록색 막대와 '업로드됨' 태그가 표시됩니다" width="1200" />

<sub>사이드바의 워크스페이스 이름과 세션 이름은 흐리게 처리했습니다.</sub>

</div>

## 왜 필요한가

DSH 는 워크스페이스 밖으로 바이트를 *내보낼* 수 있고([`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download)), 프롬프트 하나를 위해 브라우저 첨부 파일을 잠시 맡아 두기도 합니다. 하지만 호스트에서 셸을 열지 않고는 이미 있는 여러 파일을 서버의 폴더에 넣을 방법이 없었습니다. 이 플러그인은 다른 전역 패널들이 있는 바로 그 자리에 그 동작을 더합니다.

## 표시되는 위치

| 위치 | 내용 |
| --- | --- |
| 왼쪽 사이드바 | 종이 클립 글리프가 붙은 **파일 업로드** 행. **자동화 작업** 바로 아래(`order: 11`) |
| 기본 열 | 그 행을 선택하면 열리는 업로드 페이지 |

<img src="../assets/upload-page.png" alt="아직 대상 폴더를 고르지 않은 '파일 업로드' 페이지: 사이드바의 행은 '자동화 작업' 아래에 있고, 페이지에는 대상 카드와 점선 드롭 영역이 보입니다" width="1200" />

페이지의 모든 것은 하나의 흐름으로 이어집니다:

1. **대상 폴더** —— *폴더 선택* 을 누르면 호스트 자체의 디렉터리 목록(`ctx.uiWorkspace.listDirectory`, **워크스페이스 디렉터리 선택** 뒤에 있는 것과 같은 프리미티브)을 사용하는 인앱 대화상자가 열립니다. 경로 탐색줄 점프, 클릭해서 편집하는 경로, 숨은 폴더 토글, 그리고 *이 폴더 선택* 이라는 확정 단계가 있습니다. 폴더 목록은 호스트에서 오므로 OS 선택기가 없는 원격 브라우저에서도 동작합니다.

   <img src="../assets/folder-picker.png" alt="'서버에서 폴더 선택' 대화상자: 경로 탐색줄에 홈과 데모 폴더가 표시되고, 그 아래에 archive, photos, reports 가 나열되어 있습니다" width="1200" />

2. **파일 선택** —— 페이지의 파일 선택기는 여러 파일을 한 번에 받으며, 페이지 어디에든 떨어뜨린 파일도 같은 대기열에 들어갑니다.
3. **파일 업로드** —— 대기열은 한 번에 파일 하나씩 처리합니다. 각 행에는 전송된 바이트 수, 진행 표시줄, 상태 태그가 표시됩니다. 실패한 행은 메시지를 그대로 유지한 채 **다시 시도** 를 제공하고, **업로드 취소** 는 대기열을 멈추고 남은 행을 준비 상태로 남겨 둡니다.

   <img src="../assets/uploading.png" alt="업로드가 진행 중인 화면: 첫 행은 800 MB 중 215 MB 를 전송했다고 표시하며 반쯤 찬 막대와 '업로드 중' 태그가 있고, 나머지 행은 '준비' 상태로 기다리며, 헤더에는 '업로드 취소'가 있습니다" width="1200" />

## 동작 방식

**호스트 쪽** —— 공유 `/api` 경계 위에 있는, 인증이 걸린 스트리밍 라우트 하나입니다:

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

이 라우트는 `ctx.connection.fetch` 위에 있으므로, Connection 이 이 처리기를 실행하기 전에 브라우저가 가진 서명된 Harness 자격 증명으로 요청을 받아들일지 판단합니다. 인증되지 않은 요청은 여기까지 오지 않으며, 소유자 Peer 에게만 응답합니다. 두 좌표(존재하는 절대 디렉터리, 구분자가 없는 파일 이름 하나)가 검증되고, 본문은 곧바로 옆의 `.dsh-upload-<uuid>.part` 파일로 스트리밍되어 마지막 바이트가 도착한 뒤에야 실제 이름으로 바뀝니다. 중단되거나 실패한 업로드는 실제 이름 아래에 아무것도 남기지 않습니다.

**브라우저 쪽** —— 셸이 미리 넣어 주는 기본 요소(`react`, `react-dom`)만 요구하는 손으로 작성한 lazy-CJS bundle 입니다. 두 가지 기여를 등록합니다. `sidebar.panellist` 행과, 같은 키를 쓰는 `main` 패널이며, 이것이 사이드바가 그 행을 선택하는 데 필요한 계약의 전부입니다. 파일별 진행률을 진짜로 만드는 것은 페이지 스레드의 평범한 `XMLHttpRequest` 입니다. `xhr.upload.onprogress` 는 브라우저가 실제로 소켓에 넘긴 바이트를 보고합니다.

## 설치

이 패키지는 **bundle** (`dsh.bundle.patch`)이므로 플러그인 관리자가 한 행으로 설치하고 업데이트할 수 있습니다:

```bash
# 체크아웃에서 — 이 디렉터리를 링크하며, 편집 내용이 바로 반영됩니다
dsh plugin --profile web add /path/to/dsh-file-upload

# 또는 git 원격에서
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

두 방법 모두 UI 에서도 할 수 있습니다: **플러그인 → 플러그인 추가**.

`PATH` 에 `dsh` 가 없으면 체크아웃을 프로필에 심볼릭 링크하고 행을 직접 추가하십시오:

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

행 id 는 함께 제공되는 id 와 겹치면 안 됩니다. `file-upload` 는 이미 `@deepseek-ai/dsh-client-file-upload`(브라우저의 프롬프트 첨부 전송)의 것이며, 같은 id 를 공유하는 두 Loader 항목은 둘 중 하나만 구성됩니다. 그래서 `file-upload-panel` 입니다.

새로 추가한 Loader 행이 구성되도록 harness 를 한 번 재시작하십시오. 실행 중인 인스턴스에서는 삽입한 행이 재시작 없이 마운트됩니다.

동작 확인: 사이드바의 **자동화 작업** 바로 아래에 **파일 업로드** 가 생기고, 페이지에 호스트의 홈 폴더가 나열되며, 끝난 업로드는 고른 폴더에 저장됩니다:

```bash
ls -l "/the/folder/you/chose"
```

## 설정

두 설정 항목은 모두 플러그인 행의 `config` 에 있으므로, 프로필의 patch 계층이 업그레이드 후에도 이들을 유지합니다:

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # 기본값 1073741824 (1 GiB), 1024 … 16 GiB
    conflict: overwrite        # 기본값 "rename"
```

| 필드 | 기본값 | 의미 |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | 파일 하나에 대한 상한(경계값 포함). 더 큰 본문은 `413` 으로 거부되고 아무것도 저장되지 않습니다 |
| `conflict` | `"rename"` | 이름이 이미 사용 중일 때의 처리 방식. `rename` 은 기존 파일을 두고 새 파일을 `name (1).ext` 로 저장하며, `overwrite` 는 교체합니다 |

이 행은 스키마를 손으로 작성한 Standard Schema 로 선언하므로, 위 값들은 플러그인이 활성화될 때 검증되고 잘못된 값은 오류와 함께 그 행을 실패시킵니다. 플러그인 관리자는 네이티브 Schemastery 그래프만 읽기 때문에, 그 구성 양식은 이 행의 스키마를 지원되지 않는 것으로 보고 아무 필드도 제공하지 않습니다. 위에 보인 것처럼 patch 에서 값을 설정하십시오.

## 보안 관련 사항

- 이 라우트는 **`/api` Connection 경계 위의 정확한 라우트**이며 원시 웹 서버 경로가 아닙니다. 따라서 브라우저의 서명된 세션 쿠키를 요구하고 소유자 Peer 에게만 응답합니다. 또한 스스로 Host/Origin 완화를 추가하지 않습니다.
- 이 라우트는 인증된 운영자가 가리키는 곳이라면 어디든 DSH 프로세스의 권한으로 씁니다. 워크스페이스 디렉터리 선택기와 `bash` 도구가 이미 가진 것과 같은 범위입니다. 대상은 이미 존재해야 하며, 플러그인은 폴더를 만들지 않습니다.
- 브라우저는 폴더와 파일 이름만 지정하고 그 안의 경로는 지정하지 않습니다. 이름에는 `.` 도 구분자도 없으므로 요청이 고른 폴더를 벗어날 수 없습니다.
- 임시 파일은 대상 옆에 만들어지고 실패하거나 취소되면 삭제됩니다. 모든 바이트가 도착하지 않는 한 최종 이름 아래에는 아무것도 남지 않습니다.

## 알려진 제한

- 업로드 대기열은 페이지를 방문할 때마다 하나입니다. 목록은 페이지 안에만 있고, 업로드 중에 페이지를 떠나면 전송은 계속되지만(호스트가 파일을 끝까지 씁니다) 행 정보는 사라집니다.
- 선택기에서 폴더를 만들 수 없고 이어받기도 없습니다. 실패한 업로드는 첫 바이트부터 다시 시작합니다.
- 선택기는 폴더만 나열하며, 잘린 단계는 페이지 넘김 대신 `truncated` 로 보고합니다.
- 페이지에는 `maxFileBytes` 에 대한 클라이언트 측 사전 검사가 없습니다. 너무 큰 파일은 전송이 끝난 뒤 호스트가 거부합니다.
- 호스트는 오류 텍스트를 영어로 쓰고 메시지에 errno 코드를 남깁니다.

## 개발

```bash
npm test        # node --test: 라우트와 bundle 에 대한 22개 사례
npm run check   # 호스트와 브라우저 양쪽에 대한 구문 검사
```

호스트 테스트는 실제 `Request`/`Response` 객체와 실제 임시 디렉터리로 라우트를 구동하므로, harness 없이 바이트 경로, 충돌 정책, 크기 상한, 취소, 실패 텍스트를 다룹니다. 브라우저 테스트는 스텁 React 와 DOM 을 갖춘 VM 에서 bundle 을 실행하므로 harness 도 브라우저도 필요하지 않습니다.

## 파일

| 경로 | 역할 |
| --- | --- |
| `lib/index.js` | 호스트 쪽: 스트리밍 쓰기 라우트와 그 구성 스키마 |
| `lib/client.js` | 브라우저 쪽: lazy-CJS bundle, 사이드바 행, 페이지, 폴더 대화상자 |
| `cordis.patch.yml` | bundle patch: 호스트 행 하나 |
| `locale/*.json` | 플러그인 관리자의 표시 제목과 설명 |
| `icon.svg` | 종이 클립 타일 아이콘 |
| `docs/assets/*.png` | 이 README 와 번역본에서 쓰는 스크린샷 |
| `docs/readme/README_*.md` | 번역된 README |
| `test/host.test.mjs` | 라우트 동작: 상태 코드, 정책, 상한, 취소, 실패 텍스트 |
| `test/client.test.mjs` | bundle 계약: 행의 모양, 순서, 사전, 스타일시트 |

## 번역

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · **[한국어](README_ko.md)** · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

번역된 README 는 [`docs/readme/`](.) 에 있습니다. 모두 같은 플러그인을 설명합니다. 이 파일과 내용이 다르면 이 파일이 우선합니다.

## 라이선스

MIT.
