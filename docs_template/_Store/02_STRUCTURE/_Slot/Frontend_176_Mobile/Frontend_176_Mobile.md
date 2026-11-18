---
id: Slot_176
name: mobile
version: 1
path: frontend/mobile/
checked: [Frontend_003_Frontend, Frontend_173_Shell, Frontend_063_Pages]
---
# Frontend_176_Mobile mobile — the native phone shell of the app

## Role

The native project that puts the app on a phone (Android with Gradle, iOS with Xcode), one folder per platform. It is a thin
shell: it shows the app's OWN interface (the pages of `frontend/`, served by the app) and adds only what a phone needs and a web
page cannot do - the device lock, background work, notifications, the network client that reaches the app from outside.

- Not `Frontend_003_Frontend` (the interface itself): the shell holds no pages of its own that repeat the interface; a screen the
  phone needs is a page of the interface, shown in the shell.
- Not `Frontend_173_Shell` (the frame every app of a system wears): that one is web code shared by the apps of a system; this one
  is a native project of one app.

## Inside

```
frontend/mobile/
└── <platform>/        android/ · ios/ — the platform's own project layout (Gradle · Xcode) inside, untouched
    ├── core/          the client the app's phone code shares (network, pairing, protocol) - testable off the phone
    └── app/           the platform shell (launcher, lock, web view, notifications)
```

- Kind of file: the platform's sources and build files (`.kt` · `.swift` · `build.gradle.kts` · `*.xcodeproj`), and the small
  script that joins the shell to the interface.
- Never inside: build output, local SDK paths, signing keys (`.gitignore` of the platform folder: `build/` · `.gradle/` ·
  `local.properties` · `*.keystore`); a copy of the interface's pages.
- Points at no child slot: inside a platform folder the platform's convention rules.

## Rules

- One interface: the phone shows the pages the app serves, through its own link to the app; a screen built natively must say why
  the web page cannot do it (device lock, picker, notification).
- The image build never takes this folder (`.dockerignore`): its build caches change while a build runs.
- A phone never holds a key that opens the whole data of the app; it is paired with a token of its own that the app can revoke.

## Example

The app `Zemory` keeps its phone shell in `frontend/mobile/android/`: `core/` is plain Kotlin (pairing code, relay client, TLS,
the mail-only link) and runs on a desktop JVM against a real daemon; `app/` locks behind the device lock and shows the
daemon's own interface in a web view.

## Check

- `zemory conform` accepts `frontend/mobile/<platform>/` in an app repo; a phone project anywhere else in the tree is off the
  standard.
