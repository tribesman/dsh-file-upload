<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · **Tiếng Việt** · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

# @dsh-plugins/file-upload

Một **hàng kẹp giấy nằm dưới mục Tác vụ tự động** trong thanh bên web của
[DSH](https://github.com/deepseek-ai/deepseek-harness), mở ra một trang tải lên:
chọn một thư mục trên Máy chủ đúng như hộp thoại workspace vẫn làm, chọn nhiều tệp
cùng lúc, rồi theo dõi từng tệp tải lên với thanh tiến trình riêng của nó.

<img src="../assets/uploaded.png" alt="Trang Tải tệp lên sau khi ba tệp đã tải xong: hàng kẹp giấy được chọn ở thanh bên trái, thư mục đích đã được đặt, và mỗi hàng hiển thị một thanh màu xanh cùng nhãn Đã tải lên" width="1200" />

<sub>Tên workspace và tên phiên trong thanh bên đã được làm mờ.</sub>

</div>

## Vì sao

DSH có thể đưa byte *ra khỏi* workspace ([`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download))
và nó dựng sẵn tệp đính kèm từ trình duyệt cho một prompt, nhưng không có cách nào
đưa nhiều tệp đã có vào một thư mục trên máy chủ mà không cần shell trên Máy chủ.
Plugin này bổ sung mảnh ghép còn thiếu, ở đúng chỗ mà các panel toàn cục khác đang nằm.

## Xuất hiện ở đâu

| Vị trí | Nội dung |
| --- | --- |
| Thanh bên trái | Một hàng **Tải tệp lên** với biểu tượng kẹp giấy, ngay dưới **Tác vụ tự động** (`order: 11`) |
| Cột chính | Trang tải lên, mở ra khi chọn hàng đó |

<img src="../assets/upload-page.png" alt="Trang Tải tệp lên khi chưa chọn thư mục đích: hàng trên thanh bên nằm dưới Tác vụ tự động, trang hiển thị một thẻ thư mục đích và một vùng thả có viền nét đứt" width="1200" />

Mọi thứ trên trang là một luồng duy nhất:

1. **Thư mục đích** — *Chọn thư mục* mở một hộp thoại trong ứng dụng, dựa trên
   chính danh sách thư mục của Máy chủ (`ctx.uiWorkspace.listDirectory`, cùng
   một hàm nền tảng đứng sau **Chọn thư mục workspace**): nhảy theo breadcrumb, một
   đường dẫn bấm vào để sửa, công tắc hiện thư mục ẩn, và một nút xác nhận *Chọn
   thư mục này*. Danh sách thư mục đến từ Máy chủ, nên nó hoạt động từ một trình
   duyệt từ xa, nơi không có hộp chọn của hệ điều hành.

   <img src="../assets/folder-picker.png" alt="Hộp thoại Chọn thư mục trên máy chủ: breadcrumb hiển thị Home và thư mục demo, với archive, photos và reports được liệt kê" width="1200" />

2. **Chọn tệp** — bộ chọn tệp của trang nhận nhiều tệp cùng lúc, và những tệp được
   thả ở bất kỳ đâu trên trang sẽ vào cùng hàng đợi.
3. **Tải tệp lên** — hàng đợi chạy từng tệp một; mỗi hàng hiển thị bộ đếm byte đã
   gửi, một thanh tiến trình và một nhãn trạng thái. Một hàng lỗi giữ nguyên thông
   báo của nó và cho **Thử lại**; **Hủy tải lên** dừng hàng đợi và để các hàng còn
   lại ở trạng thái sẵn sàng.

   <img src="../assets/uploading.png" alt="Một lần tải lên đang chạy: hàng đầu báo 215 MB trên 800 MB với thanh đã đầy một nửa và nhãn Đang tải lên, các hàng khác chờ ở trạng thái Sẵn sàng, và phần đầu trang có nút Hủy tải lên" width="1200" />

## Cách hoạt động

**Phần Máy chủ** — một tuyến truyền dữ liệu đã xác thực trên ranh giới `/api` dùng chung:

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

Nó nằm trên `ctx.connection.fetch`, nên Connection chấp nhận yêu cầu dựa trên thông
tin đăng nhập Harness đã ký của trình duyệt trước khi handler này chạy: một yêu cầu
chưa xác thực không bao giờ tới được nó, và chỉ Peer chủ sở hữu mới được phục vụ.
Cả hai giá trị đều được kiểm tra (một thư mục tuyệt đối đã tồn tại; một tên tệp trần
không có dấu phân cách), và phần thân được truyền thẳng vào một tệp
`.dsh-upload-<uuid>.part` nằm cạnh, chỉ được đổi tên vào đúng chỗ sau khi byte cuối
cùng đã đến — một lần tải lên bị hủy hay thất bại không để lại gì dưới tên thật.

**Phần trình duyệt** — một bundle lazy-CJS viết tay, chỉ yêu cầu phần nền tối thiểu
mà shell cấp sẵn (`react`, `react-dom`). Nó đăng ký hai đóng góp: hàng
`sidebar.panellist` và panel `main` được khóa theo cùng cách, đó chính là toàn bộ
hợp đồng mà thanh bên cần để chọn nó. `XMLHttpRequest` thuần trên luồng trang là
thứ khiến tiến trình từng tệp trở thành thật: `xhr.upload.onprogress` báo số byte
mà trình duyệt thực sự đã đưa vào socket.

## Cài đặt

Gói này là một **bundle** (`dsh.bundle.patch`), nên Plugin Manager có thể cài và cập
nhật nó như một hàng duy nhất:

```bash
# từ một bản checkout — liên kết thư mục này, các sửa đổi vẫn có hiệu lực trực tiếp
dsh plugin --profile web add /path/to/dsh-file-upload

# hoặc từ git remote
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

Cả hai cách cũng có thể thực hiện từ giao diện: **Plugin → Thêm plugin**.

Nếu không có `dsh` trên `PATH`, hãy tạo liên kết tượng trưng cho bản checkout trong
profile và thêm hàng bằng tay:

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

Id của hàng không được trùng với một id có sẵn: `file-upload` đã thuộc về
`@deepseek-ai/dsh-client-file-upload`, kênh vận chuyển tệp đính kèm của prompt
trong trình duyệt, và khi hai mục Loader dùng chung một id thì chỉ một trong hai được
kết hợp. Vì vậy mới là `file-upload-panel`.

Khởi động lại harness một lần để một hàng Loader mới được thêm vào có thể kết hợp.
Trên một instance đang chạy, hàng được chèn sẽ được mount mà không cần khởi động
lại.

Kiểm tra xem nó có chạy không: thanh bên sẽ có thêm **Tải tệp lên** ngay dưới **Tác
vụ tự động**, trang liệt kê thư mục home của Máy chủ, và một lần tải lên đã xong sẽ
nằm trong thư mục bạn đã chọn:

```bash
ls -l "/the/folder/you/chose"
```

## Cấu hình

Cả hai tham số cấu hình đều nằm trong `config` của hàng plugin, nên lớp patch của
profile giữ chúng qua các lần nâng cấp:

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # mặc định 1073741824 (1 GiB), 1024 … 16 GiB
    conflict: overwrite        # mặc định "rename"
```

| Trường | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | Giới hạn trên, tính cả giá trị biên, cho một tệp; phần thân lớn hơn bị từ chối với `413` và không có gì được lưu |
| `conflict` | `"rename"` | Ý nghĩa khi tên đã bị chiếm: `rename` giữ tệp đang có và đặt tệp mới thành `name (1).ext`; `overwrite` thay thế nó |

Hàng này khai báo lược đồ của nó dưới dạng một Standard Schema viết tay, nên các giá
trị ở trên được kiểm tra khi plugin kích hoạt và một giá trị sai sẽ làm hàng đó thất
bại kèm lỗi. Plugin Manager chỉ đọc được các đồ thị Schemastery gốc, nên biểu mẫu
cấu hình của nó báo lược đồ của hàng này là không được hỗ trợ và không đưa ra trường
nào: hãy đặt giá trị trong patch, như đã trình bày ở trên.

## Lưu ý bảo mật

- Tuyến này là một **tuyến chính xác trên ranh giới Connection `/api`**, không phải
  một đường dẫn máy chủ web thô, nên nó đòi cookie phiên đã ký của trình duyệt và
  chỉ phục vụ Peer chủ sở hữu. Nó cũng không tự thêm bất kỳ nới lỏng Host/Origin
  nào.
- Tuyến ghi vào bất cứ đâu người vận hành đã xác thực trỏ tới, với quyền của tiến
  trình DSH — cùng tầm với mà bộ chọn thư mục workspace và công cụ `bash` đã có.
  Thư mục đích phải tồn tại trước; plugin không tạo thư mục.
- Trình duyệt nêu một thư mục và một tên tệp, không bao giờ nêu một đường dẫn bên
  trong thư mục đó: tên không chứa `.` và không chứa dấu phân cách, nên một yêu cầu
  không thể thoát ra khỏi thư mục đã chọn.
- Tệp tạm được tạo cạnh đích của chúng và bị xóa khi thất bại hoặc khi hủy; không
  có gì còn lại dưới tên cuối cùng trừ khi mọi byte đã đến.

## Hạn chế đã biết

- Mỗi lần ghé trang chỉ có một hàng đợi tải lên: danh sách là cục bộ theo trang, và
  rời trang giữa lúc đang tải sẽ để quá trình truyền chạy tiếp (Máy chủ hoàn tất tệp) nhưng
  quên mất các hàng.
- Không tạo thư mục trong bộ chọn và không có tính năng tiếp tục: một lần tải lên
  thất bại sẽ bắt đầu lại từ byte đầu tiên.
- Bộ chọn chỉ liệt kê thư mục, và các mức bị cắt báo `truncated` chứ không phân trang.
- Trang không có bước kiểm tra trước phía máy khách cho `maxFileBytes`: một tệp quá
  lớn bị Máy chủ từ chối sau khi truyền xong.
- Máy chủ ghi văn bản lỗi bằng tiếng Anh và giữ mã errno trong thông báo.

## Phát triển

```bash
npm test        # node --test: 22 trường hợp cho tuyến và bundle
npm run check   # cổng kiểm tra cú pháp trên cả hai phần
```

Các bài test phần Máy chủ chạy tuyến qua những đối tượng `Request`/`Response` thật
và một thư mục tạm thật, nên chúng bao quát đường đi của byte, các chính sách xung
đột, giới hạn kích thước, việc hủy, và văn bản lỗi mà không cần harness. Các bài
test phần trình duyệt chạy bundle trong một VM với React và DOM giả, nên chúng không
cần harness cũng không cần trình duyệt.

## Tệp

| Đường dẫn | Vai trò |
| --- | --- |
| `lib/index.js` | Phần Máy chủ: tuyến ghi dạng truyền và lược đồ cấu hình của nó |
| `lib/client.js` | Phần trình duyệt: bundle lazy-CJS, hàng thanh bên, trang, hộp thoại thư mục |
| `cordis.patch.yml` | Bản vá bundle: hàng Máy chủ duy nhất |
| `locale/*.json` | Tiêu đề và mô tả hiển thị của Plugin Manager |
| `icon.svg` | Biểu tượng ô kẹp giấy |
| `docs/assets/*.png` | Ảnh chụp màn hình dùng cho README này và các bản dịch của nó |
| `docs/readme/README_*.md` | Các README đã dịch |
| `test/host.test.mjs` | Hành vi của tuyến: mã trạng thái, chính sách, giới hạn, hủy, văn bản lỗi |
| `test/client.test.mjs` | Hợp đồng bundle: hình dạng hàng, thứ tự, từ điển, stylesheet |

## Bản dịch

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · **[Tiếng Việt](README_vi.md)** · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

Các README đã dịch nằm trong [`docs/readme/`](.). Chúng mô tả cùng một
plugin; khi chúng khác với tệp này, tệp này được lấy làm chuẩn.

## Giấy phép

MIT.
