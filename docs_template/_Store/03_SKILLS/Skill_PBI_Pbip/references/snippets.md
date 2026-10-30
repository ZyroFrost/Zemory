# Đoạn mã dùng lại khi sửa `.pbip`

Mọi đoạn dưới đây đã chạy thật trên `reports/ABC_IncomeStatement`. Đường dẫn đổi theo report.

## Nạp cả trang + toạ độ TUYỆT ĐỐI

```python
import json, glob, os
P = 'reports/<Ten>/<Ten>.Report/definition/pages/<pageId>/'
V = {os.path.basename(os.path.dirname(f)): json.load(open(f, encoding='utf-8'))
     for f in glob.glob(P + 'visuals/*/visual.json')}

def chain(x):                       # chuoi cha -> con, ke ca chinh no
    j = V[x]; p = j.get('parentGroupName')
    return ([] if p not in V else chain(p)) + [x]

def abspos(x):                      # position là TƯƠNG ĐỐI, phải cộng dồn
    c = chain(x)
    return (sum(V[a]['position'].get('x', 0) for a in c),
            sum(V[a]['position'].get('y', 0) for a in c))

def hidden(x):                      # an that su = chinh no hoac bat ky cha nao an
    return any(V[a].get('isHidden', False) for a in chain(x))

def kids(g):   return [k for k, j in V.items() if j.get('parentGroupName') == g]
def leaves(g):
    out = []
    for k in kids(g): out += leaves(k) if 'visualGroup' in V[k] else [k]
    return out

def name(x):                        # tên hiển thị mà người đặt cho visual
    try: return V[x]['visual']['visualContainerObjects']['title'][0]['properties']['text']['expr']['Literal']['Value'].strip("'")
    except Exception: return V[x].get('visualGroup', {}).get('displayName', '')
```

## Ghi file — luôn UTF-8, xuống dòng LF

```python
import io, json
io.open(f, 'w', encoding='utf-8', newline='\n').write(
    json.dumps(j, ensure_ascii=False, indent=2) + '\n')
```

⚠ Không dùng `print()` với đường dẫn Windows lẫn trong vòng lặp ghi file — một lỗi `IndexError` khi
tách chuỗi sẽ cắt ngang vòng lặp và để lại **một nửa số file đã sửa**.

## Dựng bookmark ĐẦY ĐỦ (mọi visual + mọi nhóm)

```python
LEAVES = [k for k, j in V.items() if 'visualGroup' not in j]
GROUPS = [k for k, j in V.items() if 'visualGroup' in j]

vc = {}
for k in LEAVES:
    e = {"singleVisual": {"visualType": V[k]['visual'].get('visualType', 'shape'), "objects": {}}}
    if muon_an(k): e['singleVisual']['display'] = {"mode": "hidden"}
    vc[k] = e

def build(g):
    n = {"isHidden": bool(muon_an_nhom(g))}
    ch = {k: build(k) for k in kids(g) if 'visualGroup' in V[k]}
    if ch: n['children'] = ch
    return n

roots = [g for g in GROUPS if V[g].get('parentGroupName') not in V]
sec = {"visualContainers": vc, "visualContainerGroups": {g: build(g) for g in roots}}
```

Khoanh vùng thì thêm `options = {"targetVisualNames": [<id...>], "suppressData": True}` và chỉ đưa
đúng những id đó vào `sec`.

**Phép kiểm:** `len(visualContainers) == len(LEAVES)` và mọi nhóm đều có mặt.

## Khuôn một nút bấm được

```python
{"$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.10.0/schema.json",
 "name": "<20 ky tu hex>",
 "position": {"x": 0, "y": 0, "z": 3000, "height": 25, "width": 160, "tabOrder": 18000},
 "visual": {
   "visualType": "image",
   "objects": {"general": [{"properties": {"imageUrl": {"expr": {"ResourcePackageItem": {
       "PackageName": "RegisteredResources", "PackageType": 1, "ItemName": "<file>.png"}}}}}]},
   "visualContainerObjects": {
     "visualLink": [{"properties": {
        "show": {"expr": {"Literal": {"Value": "true"}}},
        "type": {"expr": {"Literal": {"Value": "'Bookmark'"}}},
        "bookmark": {"expr": {"Literal": {"Value": "'<bookmarkId>'"}}},
        "tooltip": {"expr": {"Literal": {"Value": "'<chữ hiện khi rê chuột>'"}}}}}],
     "title": [{"properties": {"text": {"expr": {"Literal": {"Value": "'<ten doi tuong>'"}}}}}]},
   "drillFilterOtherVisuals": True},
 "parentGroupName": "<groupId>"}
```

Đổi sang điều hướng trang: `type = 'PageNavigation'` + `navigationSection = '<pageId>'`.

## Tắt / mở Power BI Desktop

```powershell
$p = Get-Process PBIDesktop -ErrorAction SilentlyContinue
if ($p) { $p.CloseMainWindow() | Out-Null; if (-not $p.WaitForExit(30000)) { $p.Kill() } }
# doi thoat han roi moi sua file
do { Start-Sleep -Seconds 3 } while ((Get-Process PBIDesktop -ErrorAction SilentlyContinue))

Start-Process -FilePath "<đường dẫn>\<Tên>.pbip"
do { Start-Sleep -Seconds 10; $q = Get-Process PBIDesktop -ErrorAction SilentlyContinue }
while (($q | % { $_.MainWindowTitle }) -notmatch '<Ten>')
```

⚠ Đang có thay đổi chưa lưu thì `CloseMainWindow` bung hộp thoại hỏi lưu và treo ở đó. **Hỏi người dùng**,
đừng tự `Kill` — có thể mất việc người ta vừa làm trong Desktop.

## Chụp màn hình khi cửa sổ bị che

`CopyFromScreen` chụp đúng pixel đang hiện, nên cửa sổ khác nằm trên là chụp trúng cửa sổ đó, và ép
Power BI lên tiền cảnh thường thất bại vì Windows khoá foreground. `PrintWindow` vẽ thẳng nội dung
cửa sổ nên không dính vấn đề này:

```powershell
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;using System.Runtime.InteropServices;using System.Drawing;
public class PW{
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
 [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
 public struct RECT{public int L,T,R,B;}
 public static Bitmap Grab(IntPtr h){
   RECT r; GetWindowRect(h, out r);
   Bitmap b = new Bitmap(r.R-r.L, r.B-r.T);
   using(Graphics g = Graphics.FromImage(b)){
     IntPtr dc = g.GetHdc(); PrintWindow(h, dc, 2); g.ReleaseHdc(dc); }
   return b; }
}
"@ -ReferencedAssemblies System.Drawing
$w = Get-Process PBIDesktop | ? { $_.MainWindowTitle -ne '' } | Select -First 1
[PW]::Grab($w.MainWindowHandle).Save("out.png", [System.Drawing.Imaging.ImageFormat]::Png)
```

Cờ `2` là `PW_RENDERFULLCONTENT` — thiếu nó thì vùng dựng bằng GPU ra đen.

## Đọc `.pbix` cũ để đối chiếu (chỉ đọc, không mở Desktop)

```python
import zipfile, json
z = zipfile.ZipFile(r"<đường dẫn>\<file>.pbix")
lay = json.loads(z.read('Report/Layout').decode('utf-16-le'))   # thường là utf-16-le
for s in sorted(lay['sections'], key=lambda x: x.get('ordinal', 0)):
    cfg = json.loads(s.get('config', '{}'))
    print(s['displayName'], len(s.get('visualContainers', [])), 'an' if cfg.get('visibility') == 1 else '')
bookmarks = json.loads(lay.get('config', '{}')).get('bookmarks', [])
```

Trang ẩn mang `config.visibility == 1` — đừng đếm chúng vào danh sách trang chính thức.
