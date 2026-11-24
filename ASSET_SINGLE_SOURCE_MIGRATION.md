# Единый источник ассетов: план миграции

Дата: 2026-11-23  
Канонический проект: `Dungeon-main` (активная копия, которую обслуживают `serve-hub.ps1` / `serve-dungeon.ps1`).  
`Dungeon-repo` — git-источник/зеркало; инфраструктура создана в `Dungeon-repo` и перенесена в `Dungeon-main`. При следующем коммите синхронизировать обратно в repo, чтобы изменения не потерялись.

## Что реализовано

### 1. Мастер-хранилище
- `shared/assets/master/heroes/` — 26 PNG, скопировано из `games/dungeon28/assets/sprites/heroes/`.
- `shared/assets/master/monsters/` — 55 PNG, скопировано из `games/dungeon28/assets/sprites/monsters/`.
- `shared/assets/master/items/` — 145 файлов, скопировано из `games/dungeon28/assets/sprites/items/` (45 PNG + 100 SVG).
- `shared/assets/master/ui/` — 4 PNG, скопировано из `games/dungeon28/assets/sprites/ui/`.

### 2. Конвертация PNG → SVG
- Команда: `node scripts/build-game-assets.js --convert`
- Результат: 130 PNG → 130 SVG-обёрток, **130 требуют ручной векторизации**.
- Реестр: `shared/assets/master/registry.json`.
- Политика автотрассировки: `grid=64`, `maxPaletteColors=16`, `maxMeanError=10`.
- Фактические значения: `sampledColors=4097`, `autoTraceMeanError≈32..136` для растровых спрайтов 1024x1024. Это ожидаемо: PNG — сложные арт-спрайты с градиентами/текстурами, автоматическая векторизация даёт плохое качество.
- Формат SVG-обёртки: lossless wrapper с `<image href="...png" .../>`, не деструктивная трассировка. PNG остаются источником пикселей.

### 3. Скрипт композиции
- Скрипт: `scripts/build-game-assets.js`
- Конфиг: `config/dungeon28.json`
- Вход: `shared/assets/master` + конфиг игры.
- Слои: фон → подставка → персонаж.
- Auto-crop: по alpha-bbox слоя персонажа (padding из конфига, по умолчанию 12px).
- Выход: `games/dungeon28/assets/sprites/generated/...`
- Режимы:
  - по умолчанию: SVG с относительными ссылками на мастер-файлы (без дубликатов пикселей);
  - `--inline`: встраивает PNG/SVG как base64 data URI в итоговый SVG (автономный файл).
- Тестовый прогон: `node scripts/build-game-assets.js --config config/dungeon28.json --only test_hero_knight_0`

### 4. Тест «Герой + Подставка»
- Исходный герой: `shared/assets/master/heroes/knight_0.png`, **1,108,156 байт**, 1024x1024 RGBA.
- Исходная SVG-обёртка: `shared/assets/master/heroes/knight_0.svg`, **258 байт**.
- Фон: `shared/assets/master/stages/wooden_background.svg`, векторный.
- Подставка: `shared/assets/master/stages/wooden_base.svg`, векторный.
- Итог: `games/dungeon28/assets/sprites/generated/test/hero_knight_0.svg`, **617 байт**, `viewBox="60 23 904 989"`, auto-crop применён.

Пример итогового SVG (ссылочный, без дубликатов PNG):

```svg
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="60 23 904 989" width="904" height="989">
  <title>test_hero_knight_0</title>
  <image href="../../../../../../shared/assets/master/stages/wooden_background.svg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none"/>
  <image href="../../../../../../shared/assets/master/stages/wooden_base.svg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none"/>
  <image href="../../../../../../shared/assets/master/heroes/knight_0.png" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none"/>
</svg>
```

## Инвентаризация и потенциальная экономия

### Текущее состояние (Dungeon-main, до удаления дубликатов из игр)

| Папка | PNG | Размер PNG | SVG | Размер SVG |
|---|---:|---:|---:|---:|
| `games/dungeon28/assets/sprites/heroes` | 26 | 23.59 MB | 0 | 0 |
| `games/dungeon28/assets/sprites/monsters` | 55 | 44.35 MB | 0 | 0 |
| `games/dungeon28/assets/sprites/items` | 42 | 4.39 MB | 100 | 0.17 MB |
| `games/dungeon28/assets/sprites/ui` | 4 | 0.00 MB | 0 | 0 |
| `games/dungeon28/assets/sprites` (root) | 3 | 0.00 MB | 0 | 0 |
| **Итого игровые спрайты** | **130** | **72.34 MB** | **100** | **0.17 MB** |

### Мастер-копия

| Папка | Файлы | Размер |
|---|---:|---:|
| `shared/assets/master/heroes` (PNG+SVG wrapper) | 52 | 23.60 MB |
| `shared/assets/master/monsters` (PNG+SVG wrapper) | 110 | 44.36 MB |
| `shared/assets/master/items` (PNG+SVG) | 187 | 5.35 MB |
| `shared/assets/master/ui` (PNG+SVG wrapper) | 8 | ~0.01 MB |
| `shared/assets/master/stages` | 2 SVG | ~4 KB |
| `registry.json` | 1 | 0.07 MB |
| **Итого master** | **360** | **~73.39 MB** |

### Потенциальная экономия

При полной миграции на единый источник:

- **Удаляем из игр дубликаты PNG героев/монстров/предметов/UI**, оставляем только сгенерированные SVG или ссылки на master.
- Текущий объём дубликатов в `games/dungeon28/assets/sprites`: **130 PNG = 72.34 MB**.
- Стоимость master (единственная копия): **~73.39 MB** (включает SVG-обёртки/реестр; сами PNG = ~73.05 MB).
- Чистая экономия на *первой* игре при переносе в master: **около 0 MB** (переезд, не сжатие).
- Реальная экономия появляется при **повторном использовании** в других играх/вариантах:
  - 2 игры с теми же ассетами: ~72 MB экономии (вместо 2×72 MB хранить 1×73 MB master + лёгкие generated SVG).
  - 3 игры: ~144 MB экономии.
  - Формула: `savings ≈ (N_games - 1) * 72.34 MB - overhead_generated_svg`.

> Важно: сгенерированные SVG в ссылочном режиме весят ~0.6 KB/файл (82 файла ≈ 0.05 MB). В inline-режиме они дублируют PNG в base64 и экономии не дают.

## Список героев и монстров для миграции

### Герои (26 PNG, 23.59 MB) — `shared/assets/master/heroes`
- `angel_0.png`, `angel_1.png`, `angel_2.png`, `angel_3.png`
- `archer.png`
- `battle_angel_0.png`, `battle_angel_1.png`, `battle_angel_2.png`, `battle_angel_3.png`
- `elf_archer_0.png`, `elf_archer_1.png`, `elf_archer_2.png`, `elf_archer_3.png`
- `knight_0.png`, `knight_1.png`, `knight_2.png`, `knight_3.png`
- `mage.png`
- `paladin_0.png`, `paladin_1.png`, `paladin_2.png`, `paladin_3.png`
- `wizard_0.png`, `wizard_1.png`, `wizard_2.png`, `wizard_3.png`

### Монстры (55 PNG, 44.35 MB) — `shared/assets/master/monsters`
- `dark_archer_0..3.png` (4)
- `demon_0..3.png` (4)
- `ghost_0..3.png` (4)
- `imp_0..3.png` (4)
- `necromancer_0..7.png` (8)
- `orc.png` (1)
- `orge_0..3.png` (4) — имя файла сохранено как в оригинале.
- `rat_0.png` (1)
- `skeleton_0..9.png` (10)
- `spider_0..3.png` (4)
- `turtle_0..3.png` (4)
- `undead_0..6.png` (7)

### Предметы (45 PNG, 4.39 MB + 100 SVG, 0.17 MB) — `shared/assets/master/items`
- PNG: `axe_0..3`, `bow0_0..3`, `bow1_0..3`, `coin`, `lightning`, `shield`, `staff_0..3`, `staff`, `star`, `sword_0..3`, `weapon_*.png` (20).
- SVG уже есть: `arrow_*`, `bow_*`, `dagger_*`, `herb_*`, `mace_*`, `quiver_*`, `robe_*`, `shield_*`, `staff_*` и др. (100 файлов).

### UI (4 PNG, ~0 MB) — `shared/assets/master/ui`
- `coin.png`, `lightning.png`, `shield.png`, `star.png` — дубликаты root/items/ui; в master оставить одну каноническую копию.

## Шаги миграции (следующий этап)

1. **Синхронизация git**: перенести `shared/assets/master`, `config/`, `scripts/build-game-assets.js`, generated SVG, этот план в `Dungeon-repo` и закоммитить.
2. **Переключение загрузчиков**: в `games/dungeon28/config.js`, `heroes/*.js`, `ui.js`, `main.js`, `shared-data.js` заменить прямые PNG-пути на generated SVG или на резолвер через master/manifest.
3. **Labyrinth/MM6/SF2**: использовать те же generated ассеты/пресеты из `config/*.json`; не копировать PNG в папки игр.
4. **Удаление дубликатов**: после проверки визуальной регрессии удалить PNG из `games/*/assets/sprites/{heroes,monsters}` и оставить только master.
5. **Ручная векторизация**: приоритет — UI/иконки/предметы малого размера; герои/монстры 1024x1024 оставить PNG-источниками до появления качественных векторных оригиналов.
6. **CI/проверка**: добавить проверку `node scripts/build-game-assets.js --config config/dungeon28.json` в build/CI; падать при отсутствии мастер-файла.
7. **Кэш/размер**: для web-доставки рассмотреть WebP/AVIF производные из master PNG; SVG-композиции оставить для редакторского/масштабируемого слоя.
