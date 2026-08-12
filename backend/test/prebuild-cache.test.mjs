// SEED CACHE PHẢI TRÙNG ĐÚNG TÊN MÀ `prebuild-install` SẼ ĐI TÌM.
//
// Bệnh nền (đo 2026-08-13): trên mạng này, host `github.com` — nơi `better-sqlite3` tải nhị phân
// dựng sẵn — chỉ lọt **1/10 lượt**, còn `api.github.com` lọt **10/10**. Trượt một lượt là
// `prebuild-install` rơi về `node-gyp rebuild`, cần bộ biên dịch C++; máy Windows trắng không có
// ⇒ **clone sạch không dựng được**. `fetch-prebuilds.mjs` vá bằng cách tải qua đường còn sống rồi
// đặt sẵn vào cache đĩa của `prebuild-install`.
//
// Vì sao đáng một cổng riêng: bản vá KHÔNG gọi API nào của `prebuild-install` — nó **tái tạo**
// hai quy ước nội bộ (tên file cache = sha512(url)[0:6] + tên tệp đã lọc ký tự; URL tải theo
// template GitHub releases). Lệch một ký tự là file nằm cạnh chỗ cần nằm: không lỗi, không cảnh
// báo, chỉ là bản vá **im lặng vô tác dụng** và máy mới lại chết đúng kiểu cũ. Đây là dạng hỏng
// mà `02_RULES §Hành xử` gọi tên — hỏng câm, phát hiện muộn.
//
// Cách canh: so với chính `prebuild-install/util.js` trong `node_modules`. Nó đổi quy ước ⇒ gate ĐỎ
// ngay, thay vì đợi một máy mới nào đó phát hiện.

import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

import {
  PREBUILD_PACKAGES,
  cachedPrebuildPath,
  downloadUrlFor,
  prebuildCacheDir,
} from "../scripts/fetch-prebuilds.mjs";

const require = createRequire(import.meta.url);
const util = require("prebuild-install/util.js");

const PKG = PREBUILD_PACKAGES[0];
const VERSION = "12.11.1";

/** Dựng `opts` đúng hình dạng mà `prebuild-install` tự dựng từ package.json của dependency. */
function optsFor(version) {
  return {
    pkg: {
      name: PKG.name,
      version,
      repository: { type: "git", url: `git://github.com/${PKG.repo}.git` },
    },
    abi: process.versions.modules,
    runtime: "node",
    platform: process.platform,
    arch: process.arch,
    libc: "",
    "tag-prefix": "v",
  };
}

test("URL tải dựng đúng như template của prebuild-install", () => {
  assert.equal(downloadUrlFor(PKG, VERSION), util.getDownloadUrl(optsFor(VERSION)));
});

test("đường dẫn cache trùng đúng chỗ prebuild-install đi tìm", () => {
  const url = util.getDownloadUrl(optsFor(VERSION));
  assert.equal(cachedPrebuildPath(url), util.cachedPrebuild(url));
});

test("thư mục cache bám theo npm_config_cache, không phải đường cứng", () => {
  const saved = process.env.npm_config_cache;
  try {
    process.env.npm_config_cache = process.platform === "win32" ? "C:\\zz-cache" : "/zz-cache";
    assert.equal(prebuildCacheDir(), util.prebuildCache());
  } finally {
    if (saved === undefined) delete process.env.npm_config_cache;
    else process.env.npm_config_cache = saved;
  }
});

test("mọi gói khai báo đều tra được asset theo đúng tên tệp", () => {
  for (const pkg of PREBUILD_PACKAGES) {
    const url = downloadUrlFor(pkg, VERSION);
    assert.match(url, /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/releases\/download\/v/);
    assert.ok(url.endsWith(`-node-v${process.versions.modules}-${process.platform}-${process.arch}.tar.gz`));
  }
});
