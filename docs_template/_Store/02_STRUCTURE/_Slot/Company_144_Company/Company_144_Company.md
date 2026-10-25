---
id: Slot_144
name: company
version: 5
path: Company/<Org>/
scope: layout
---
# Company_144_Company company — the work of one organisation

## Role

`Workspace\Company\` is the shared workspace of EVERY organisation the owner works or worked for, past to future: employers and
the clients of freelance work. Each organisation has EXACTLY ONE folder `Workspace\Company\<Org>\`; all its work sits inside, in
the frame `Struc_Region_Company` — its repos by role, and its non-repo work folders (designs, drawings, old projects).

Freelance work has its own organisation folder, `Workspace\Company\Freelance\`. Freelance is work made FOR a person or a client
outside any employer, paid or not: a report made for a friend is freelance. One folder per recipient, `Freelance\<Recipient>\`,
holding the work as it is — a repo, or plain files (the brief, sample images, the request, the final report). The layout inside a
recipient's folder is left to the owner.

## Example

```
Workspace\Company\
├── Acme\                  an employer
│   ├── Dept_FIN\          a department repo
│   ├── _DB_Warehouse\     the data warehouse repo
│   └── Designs\           a non-repo work folder
├── Globex\                a past employer — its own tree, never mixed with Acme
└── Freelance\             work for people outside any employer, paid or not
    └── <Recipient>\       one folder per person or client: a repo, or plain files
```

## Rules

- The `Company\` level holds organisation folders only. A repo straight under `Company\` is wrong: it moves into the folder of the
  organisation that owns it.
- One item belongs to one organisation. Work for two organisations is two items, each in its organisation's folder.
- The owner's PAPERS with the organisation (contract, review, handover, logo, company profile, passwords of its systems) are
  here too, by the block law: `Workspace\Company\<Org>\_Profile\` (Profile_170).
- Not here: the owner's own code (`Personal\`) · code of others (`External\`) · papers used for any organisation (CV, identity)
  ⇒ `Documents\Profile\`.

## Naming

The organisation's short name, PascalCase, no spaces: `Acme` · `Globex`. The same organisation has the same name on every machine.

## Check

`zemory conform --layout <drive>\Workspace`: a repo straight under `Company\` (`repo-under-company`); inside each organisation, the
checks of `Struc_Region_Company`.
