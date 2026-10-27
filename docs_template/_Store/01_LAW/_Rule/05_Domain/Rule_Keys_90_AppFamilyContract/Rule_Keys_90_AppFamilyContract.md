---
id: Rule_90
name: app-family-contract
version: 4
kind: judgment
code: 05_Domain
checked: [Rule_Gate_35_OneHome, Rule_Keys_80_SharedChangeImpact, Skill_Dev_AppDesign, Skill_Dev_DbDesign, Skill_Task_VmAutomation, Struc_Repo_SystemManager, Struc_Repo_AppData]
---
# Rule_Keys_90_AppFamilyContract — An app of a family uses the family's one database, its one sign-in, its one admin screen and its log codes

## What
Apps that belong to one family (repos with role `app`, managed by a `system-manager`, using an `app-data` repo) share four
things and never build their own copy: the family's one transactional database, the `system-manager`'s one sign-in, its one admin
screen for roles, and the operation-log codes kept by the `app-data` repo. The `system-manager` holds only what is shared — the
gateway, the sign-in, the admin screen and the links to the apps; every app serves its own pages and its own API.

Why a law of its own: `Rule_Gate_35_OneHome` asks for one home per thing but names no home across the repos of a family;
`Skill_Dev_AppDesign` and `Skill_Dev_DbDesign` teach how, not this duty; the structures `Struc_Repo_SystemManager` and
`Struc_Repo_AppData` declare the roles but give them no duty toward each other.

## When
- Building or changing an app of a family: a table it needs, sign-in, roles, an admin screen, logging, its pages or its API.
- Someone proposes a database of its own for one app, a sign-in page or an admin screen inside one app, or putting an app's pages
  or API inside the `system-manager`.

## Do
1. Data lives in the family's one database, kept by the `app-data` repo. An app gets no database of its own, a large app included:
   all databases of the family sit on one server, so a split adds work and no resilience (resilience is a second server). A new
   table or column ⇒ ask the `app-data` repo; the app never changes structure (`Cons_Gate_11_WriteBoundary`).
2. Identity is shared: one account per person for every app. Roles are per app (one role per person per app). Roles of every app
   are granted from the `system-manager`'s one admin screen, one role column per app; an app builds no admin screen of its own.
3. Every app writes each event of six groups as one row of the family's operation log: sign-in · end of session · access denied ·
   account and role changes · free-form data queries · settings that affect other users. Codes and levels come from the
   `app-data` repo's contract table; a code not in it ⇒ ask that repo to add it first. Never log passwords, tokens or connection
   strings; a person not yet signed in is NULL, not an empty string.
4. Sign-in is shared: the `system-manager` has the family's one sign-in page and issues the one session. An app reads that session
   from the family's database on its own backend, checks its own role there, and sends a person without a live session to the
   `system-manager`'s sign-in with the address to come back to. An app has no sign-in page, no session cookie of its own and no
   password screen; signing out and changing a password go through the `system-manager`.
5. The `system-manager` holds only the shared parts: the gateway (one address, one path per app), the sign-in, the admin screen
   and the links to the apps. Every app serves its own frontend and its own backend under its own path; the `system-manager` never
   hosts an app's pages or business API, and apps never call each other through it. What two apps share is the family's database.

## Example
- Situation: a new reporting app needs its viewers' roles and wants to record who opened which board.
- ✗ Wrong: give the app its own database with a `users` table, an admin page to grant roles, and log codes made up on the spot.
- ✓ Right: add one app row in the family's database, have the roles granted on the `system-manager`'s admin screen, and log
  sign-in, denials and role changes with the `app-data` repo's codes; viewing a board is not logged.
- Situation: a file-sync app moves behind the family's gateway and still has its own sign-in page.
- ✗ Wrong: keep its sign-in page and cookie, or ask the `system-manager` to serve the app's pages and API for it.
- ✓ Right: the app drops its sign-in page, reads the `system-manager`'s session and checks its own role on its backend, sends a
  person with no session to the shared sign-in with the address to return to, and keeps serving its own pages under its own path.

## Check
- Keyword reminder: a request about an app's own database, its own or the shared sign-in, an admin screen, roles or the operation
  log shows this law; the rest is judgment.

## Links · Liên kết
- Implements · Thi hành: `Skill_Dev_AppDesign` — how an app of a family is built · cách dựng một app của hệ
- Repo declares · Repo khai: `Cons_Gate_11_WriteBoundary` — the app writes data only, never structure · app chỉ ghi dữ liệu, không ghi cấu trúc
- Related · Liên quan: `Rule_Gate_35_OneHome` — one thing, one home · một thứ một nhà
