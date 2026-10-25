---
id: Slot_150
name: drivers
version: 3
path: Software/Drivers/<Thiết bị>/
scope: layout
---
# Software_150_Drivers drivers — the driver pack of one device

## Role

`Software\Drivers\` keeps the downloaded driver packs of the devices attached to the machine (printers, network cards, extra monitors, card
readers…), so they can be installed again on a new machine at once, without hunting for them on the maker's site.

## Two ways to place them

- A pack of many files (a `disk1\` folder, `.inf` files, an installer with it) ⇒ one folder per device:
  `Software\Drivers\<Maker>_<Model>\`, keeping the pack's tree EXACTLY as the maker released it, never rearranged.
  Example: `D:\Software\Drivers\Ricoh_2852\disk1\…`.
- A one-file driver installer ⇒ may sit straight under `Software\Drivers\`, file name unchanged.
  Example: `D:\Software\Drivers\PrinterDriver_x64_v5.exe`.

## Rules

- Drivers do NOT follow the `Setup\` · `App\` · `Data\` shape of `Software_149_Program`: a driver is installed into the system and has no copy
  that runs in place. So `conform` does not check that shape here.
- Holds only driver packs. Software that comes with a device and has an interface of its own (e.g. the maker's printer manager) is a program ⇒
  placed in its group (usually `System\<Maker>\<App>\`) by `Software_149_Program`: `Setup\` · `App\` · `Data\`, each when it has something to hold.

## Naming

`<Maker>_<Model>`: the maker's name and the device model code joined by an underscore, no spaces: `Ricoh_2852` · `Canon_LBP2900`.

## Check

`zemory conform --layout <drive root>` only checks that `Drivers` is a valid group of `Software\`; inside `Drivers\` the program shape is not
checked.
