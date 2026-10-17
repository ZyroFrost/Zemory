---
id: Slot_115
aka: 03-115
name: tasks
version: 4
path: tasks/
from: _Store/02_STRUCTURE/_Slot/Tasks_115_Tasks @v4 #4bac9fa5ee77
---
# Tasks_115_Tasks tasks — đơn vị công việc: 1 case = 1 folder

- Vai trò:
  - 1 CASE = 1 FOLDER — đơn vị công việc, CẢ định kỳ LẪN theo yêu cầu. Mọi file của MỘT case nằm cùng chỗ.
  - Vì sao: để phẳng thì findings + query + fix của một vấn đề rải 3 slot → tra phải mò 3 nơi và luôn sót.
  - Thứ này để đâu — hỏi đúng MỘT câu: nó thuộc MỘT case, hay dùng chung? Thuộc một case ⇒ `tasks/<case>/` (spec · findings · SQL · `pipeline/`) + `data/<case>/` (file nặng). Dùng chung nhiều case ⇒ `scripts/` · `sources/` · `queries/` · `measures/` theo vai trò. Code của người khác clone về ⇒ `external/`, kể cả khi trông giống pipeline.
  - 3 ngoại lệ được nằm ngoài case: query dùng chung nhiều case → `queries/` · định nghĩa metric → từ điển dữ liệu (part `Docs_138_DataDictionary` data-dictionary) · defect/spec dài → `docs/plan`.
  - Không gom các slot dùng chung vào một thư mục cha: ranh giới phòng ban đã là ranh giới repo (tên repo là tên phòng ban), một tầng nữa chỉ vẽ lại thứ đã có.
  - Con của `tasks/` là tự do theo chuẩn — không bị coi là lệch chuẩn. Repo tổ chức theo nguồn có thể không có `tasks/`.
- Khuôn tên:
  - Mọi case đặt tên THƯỜNG, mô tả việc, KHÔNG đánh số thứ tự — số `NN_` chỉ dành cho STAGE trong pipeline. Lý do: case không chạy theo thứ tự, thêm/bỏ case thì phải đánh số lại cả dãy, và số trên tên case lẫn với số STAGE vốn có nghĩa thật.
  - Tên case bằng tiếng Anh ASCII.
