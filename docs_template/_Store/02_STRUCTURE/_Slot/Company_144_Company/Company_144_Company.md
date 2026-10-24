---
id: Slot_144
name: company
version: 3
path: Company/<Org>/
scope: layout
---
# Company_144_Company company — the work of one organisation

## Role

`Workspace\Company\` is the shared workspace of EVERY organisation the owner works or worked for, past to future: employers and
the clients of freelance work. Each organisation has EXACTLY ONE folder `Workspace\Company\<Org>\`; all its work sits inside, in
the frame `Struc_Region_Company` — its repos by role, and its non-repo work folders (designs, drawings, old projects).

Freelance work has its own organisation folder, `Workspace\Company\Freelance\`, split inside by client (the layout inside it is
left to the owner for now).

## Example

```
Workspace\Company\
├── Acme\                  an employer
│   ├── Dept_FIN\          a department repo
│   ├── _DB_Warehouse\     the data warehouse repo
│   └── Designs\           a non-repo work folder
├── Globex\                a past employer — its own tree, never mixed with Acme
└── Freelance\             work for clients outside any employer
```

## Rules

- The `Company\` level holds organisation folders only. A repo straight under `Company\` is wrong: it moves into the folder of the
  organisation that owns it.
- One item belongs to one organisation. Work for two organisations is two items, each in its organisation's folder.
- Not here: the owner's own code (`Personal\`) · code of others (`External\`) · PAPERS about or from the organisation (contract,
  review, handover, logo, company profile) — those are papers a person reads ⇒ `Documents\Profile\Company\<Org>\`.

## Naming

The organisation's short name, PascalCase, no spaces: `Acme` · `Globex`. The same organisation has the same name on every machine.

## Check

`zemory conform --layout <drive>\Workspace`: a repo straight under `Company\` (`repo-under-company`); inside each organisation, the
checks of `Struc_Region_Company`.
