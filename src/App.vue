<script setup>
import { ref, computed, defineAsyncComponent, onMounted, onBeforeUnmount } from 'vue'
import { Box, Grid3X3, Layers3, Download, RotateCcw } from 'lucide-vue-next'
import StripCanvas from './components/StripCanvas.vue'
import DieLayoutCanvas from './components/DieLayoutCanvas.vue'
import GridPicker from './components/GridPicker.vue'
const GridScene = defineAsyncComponent(() => import('./components/GridScene.vue'))

const profiles = { F: 1, E: 2, D: 2.5, B: 3, C: 4, BE: 5, BD: 5, BC: 7 }
const edgeTrim = 2.5
const p = ref({ length: 100, width: 100, height: 200, gridHeight: 160, gap: 1, rows: 3, cols: 3, profile: 'D', slot: 7, method: 'RODA' })
const active = ref('Чертёж')
const tabs = ['Чертёж', '3D-модель', 'Развёртка']
const page = ref(location.hash === '#/picker' ? 'picker' : 'designer')
const syncPage = () => { page.value = location.hash === '#/picker' ? 'picker' : 'designer' }
const navigate = (next) => { location.hash = next === 'picker' ? '#/picker' : '#/designer'; page.value = next }
const applyGrid = ({ rows, cols }) => { p.value.rows = rows; p.value.cols = cols; navigate('designer') }
onMounted(() => addEventListener('hashchange', syncPage))
onBeforeUnmount(() => removeEventListener('hashchange', syncPage))
const cellL = computed(() => p.value.length + p.value.gap)
const cellW = computed(() => p.value.width + p.value.gap)
const board = computed(() => profiles[p.value.profile])
const innerL = computed(() => Math.max(0, cellL.value * p.value.cols + board.value * (p.value.cols - 1) - edgeTrim * 2))
const innerW = computed(() => Math.max(0, cellW.value * p.value.rows + board.value * (p.value.rows - 1) - edgeTrim * 2))
const stripHeight = computed(() => Math.max(20, p.value.gridHeight))
const boxLength = computed(() => innerL.value + 5)
const boxWidth = computed(() => innerW.value + 5)
const boxHeight = computed(() => Math.max(p.value.height, stripHeight.value) + board.value)
const longStrips = computed(() => Math.max(0, p.value.rows - 1))
const crossStrips = computed(() => Math.max(0, p.value.cols - 1))
const slotDepth = computed(() => stripHeight.value / 2 + 5)
const longSlotPositions = computed(() => Array.from({ length: crossStrips.value }, (_, i) => (i + 1) * cellL.value + (i + .5) * board.value - edgeTrim))
const crossSlotPositions = computed(() => Array.from({ length: longStrips.value }, (_, i) => (i + 1) * cellW.value + (i + .5) * board.value - edgeTrim))
const pieceArea = computed(() => (longStrips.value * innerL.value + crossStrips.value * innerW.value) * stripHeight.value / 1e6)
const dieLayout = computed(() => {
  const pieces = [
    ...Array.from({ length: longStrips.value }, () => ({ w: innerL.value, type: 'L' })),
    ...Array.from({ length: crossStrips.value }, () => ({ w: innerW.value, type: 'P' })),
  ].filter(i => i.w > 0).sort((a, b) => b.w - a.w)
  if (!pieces.length || stripHeight.value > 975 || pieces[0].w > 980) return null
  let best = null
  for (let usableW = Math.max(480, Math.ceil(pieces[0].w)); usableW <= 980; usableW++) {
    const maxRows = Math.floor(975 / stripHeight.value)
    const maxKits = Math.min(50, Math.floor(usableW * maxRows / pieces.reduce((s, i) => s + i.w, 0)))
    for (let kits = 1; kits <= maxKits; kits++) {
      const rows = []
      const items = Array.from({ length: kits }, (_, kit) => pieces.map(i => ({ ...i, kit: kit + 1 }))).flat().sort((a, b) => b.w - a.w)
      let fits = true
      for (const item of items) {
        let row = rows.find(r => r.used + item.w <= usableW)
        if (!row) { if (rows.length >= maxRows) { fits = false; break } row = { used: 0, items: [] }; rows.push(row) }
        row.items.push({ ...item, x: row.used, y: (rows.indexOf(row)) * stripHeight.value, h: stripHeight.value }); row.used += item.w
      }
      if (!fits) continue
      const usedW = Math.max(...rows.map(r => r.used)), sheetW = Math.max(500, Math.ceil(usedW + 20)), sheetH = Math.max(500, Math.ceil(rows.length * stripHeight.value + 25))
      if (sheetW > 1000 || sheetH > 1000) continue
      const perKit = sheetW * sheetH / kits / 1e6
      if (!best || perKit < best.perKit - 1e-9 || (Math.abs(perKit - best.perKit) < 1e-9 && sheetW * sheetH < best.sheetW * best.sheetH)) best = { sheetW, sheetH, kits, perKit, items: rows.flatMap(r => r.items), offsetX: 10, offsetY: 12.5, title: 'Плоская высечка', marginText: '25 мм по гофре · 20 мм против гофры' }
    }
  }
  return best
})
const plotterLayout = computed(() => {
  const pieces = [
    ...Array.from({ length: longStrips.value }, () => ({ w: innerL.value, type: 'L' })),
    ...Array.from({ length: crossStrips.value }, () => ({ w: innerW.value, type: 'P' })),
  ].filter(i => i.w > 0).sort((a, b) => b.w - a.w)
  // В раскладке X — против гофры (2500 мм), Y — по гофре (1600 мм).
  const usableW = 2460, usableH = 1560
  if (!pieces.length || stripHeight.value > usableH || pieces[0].w > usableW) return null
  const maxRows = Math.floor(usableH / stripHeight.value), kitWidth = pieces.reduce((s, i) => s + i.w, 0)
  const pack = (kits) => {
    const rows = []
    const items = Array.from({ length: kits }, (_, kit) => pieces.map(i => ({ ...i, kit: kit + 1 }))).flat().sort((a, b) => b.w - a.w)
    for (const item of items) {
      let row = rows.find(r => r.used + item.w <= usableW)
      if (!row) { if (rows.length >= maxRows) return null; row = { used: 0, items: [] }; rows.push(row) }
      row.items.push({ ...item, x: row.used, y: rows.indexOf(row) * stripHeight.value, h: stripHeight.value }); row.used += item.w
    }
    return rows.flatMap(r => r.items)
  }
  let low = 1, high = Math.max(1, Math.floor(usableW * maxRows / kitWidth)), bestKits = 0, bestItems = null
  while (low <= high) { const mid = Math.floor((low + high) / 2), items = pack(mid); if (items) { bestKits = mid; bestItems = items; low = mid + 1 } else high = mid - 1 }
  return bestKits ? { sheetW: 2500, sheetH: 1600, displaySize: '1600 × 2500 мм (по × против гофры)', kits: bestKits, perKit: 4 / bestKits, items: bestItems, offsetX: 20, offsetY: 20, title: 'Плоттер', marginText: '20 мм с каждой стороны · площадь листа 4 м²' } : null
})
const activeLayout = computed(() => p.value.method === 'DIE' ? dieLayout.value : p.value.method === 'PLOTTER' ? plotterLayout.value : null)
const area = computed(() => (p.value.method === 'RODA' ? pieceArea.value : activeLayout.value?.perKit || 0).toFixed(3))
const cells = computed(() => p.value.rows * p.value.cols)
const reset = () => p.value = { length: 100, width: 100, height: 200, gridHeight: 160, gap: 1, rows: 3, cols: 3, profile: 'D', slot: 7, method: 'RODA' }
const methodChanged = () => { p.value.slot = p.value.method === 'RODA' ? 7 : 6 }
const downloadDrawing = () => {
  const scale = 800 / Math.max(innerL.value, innerW.value)
  const w = innerL.value * scale, h = innerW.value * scale
  const lines = []
  for (let i = 1; i < p.value.cols; i++) lines.push(`<line x1="${(i * cellL.value + (i - .5) * board.value - edgeTrim) * scale}" y1="0" x2="${(i * cellL.value + (i - .5) * board.value - edgeTrim) * scale}" y2="${h}"/>`)
  for (let i = 1; i < p.value.rows; i++) lines.push(`<line x1="0" y1="${(i * cellW.value + (i - .5) * board.value - edgeTrim) * scale}" x2="${w}" y2="${(i * cellW.value + (i - .5) * board.value - edgeTrim) * scale}"/>`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w + 80}" height="${h + 110}" viewBox="-40 -40 ${w + 80} ${h + 110}"><style>text{font-family:Arial;font-size:14px;fill:#222}line,rect{fill:none;stroke:#222;stroke-width:2}</style><rect width="${w}" height="${h}"/>${lines.join('')}<text x="0" y="${h + 28}">ГофроСетка · ${p.value.cols}×${p.value.rows} · короб ${boxLength.value.toFixed(0)}×${boxWidth.value.toFixed(0)}×${boxHeight.value.toFixed(0)} мм</text><text x="0" y="${h + 50}">Профиль ${p.value.profile} (${board.value} мм) · просечка ${p.value.slot} мм · высота решётки ${stripHeight.value} мм</text></svg>`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  link.download = `gofrosetka-${p.value.cols}x${p.value.rows}.svg`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_70%_-10%,#23372a_0,transparent_38%),#101411]">
    <header class="border-b border-white/8 px-5 py-4 lg:px-9 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3"><div class="grid h-9 w-9 place-items-center rounded-xl bg-[#d9ff64] text-[#121713]"><Grid3X3 :size="20"/></div><div><b class="tracking-tight">ГофроСетка</b><p class="m-0 text-[11px] text-white/45">конструктор разделителей</p></div></div>
      <nav class="flex rounded-xl border border-white/10 bg-black/15 p-1"><button @click="navigate('designer')" :class="['rounded-lg px-3 py-2 text-sm transition',page==='designer'?'bg-white text-[#121713]':'text-white/45 hover:text-white']">Конструктор</button><button @click="navigate('picker')" :class="['rounded-lg px-3 py-2 text-sm transition',page==='picker'?'bg-white text-[#121713]':'text-white/45 hover:text-white']">Подбор решётки</button></nav>
    </header>

    <GridPicker v-if="page === 'picker'" @select="applyGrid"/>
    <main v-else class="grid gap-5 p-5 lg:grid-cols-[340px_1fr] lg:p-9">
      <aside class="rounded-2xl border border-white/10 bg-[#171d18]/90 p-5 shadow-2xl shadow-black/20">
        <div class="mb-5"><p class="text-[11px] font-bold uppercase tracking-[.18em] text-[#d9ff64]">Параметры проекта</p><h1 class="mt-2 text-2xl font-semibold tracking-tight">Настройте ячейку</h1><p class="mt-1 text-sm leading-5 text-white/45">Размеры указываются в миллиметрах.</p></div>
        <div class="space-y-5">
          <section><h2 class="mb-3 text-sm font-medium text-white/75">Габариты продукции</h2><div class="grid grid-cols-3 gap-2"><label v-for="[key,label] in [['length','Длина'],['width','Ширина'],['height','Высота']]" :key="key" class="text-xs text-white/40">{{label}}<input v-model.number="p[key]" type="number" min="1" class="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#d9ff64]/60"></label></div></section>
          <section><label class="text-xs text-white/40">Допуск ячейки, всего<input v-model.number="p.gap" type="number" min="0" step="0.5" class="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"></label><p class="mt-1.5 text-[11px] text-white/30">Например: продукция 100 мм → ячейка 101 мм</p></section>
          <section><h2 class="mb-3 text-sm font-medium text-white/75">Производство</h2><label class="text-xs text-white/40">Способ изготовления<select v-model="p.method" @change="methodChanged" class="mt-1 w-full rounded-lg border border-white/10 bg-[#121713] px-3 py-2.5 text-sm text-white"><option value="RODA">RODA</option><option value="DIE">Плоская высечка</option><option value="PLOTTER">Плоттер</option></select></label><div class="mt-2 grid grid-cols-2 gap-2"><label class="text-xs text-white/40">Профиль<select v-model="p.profile" class="mt-1 w-full rounded-lg border border-white/10 bg-[#121713] px-3 py-2.5 text-sm text-white"><option v-for="(thickness, profile) in profiles" :key="profile" :value="profile">{{ profile }} · {{ thickness }} мм</option></select></label><label class="text-xs text-white/40">Просечка<select v-model.number="p.slot" class="mt-1 w-full rounded-lg border border-white/10 bg-[#121713] px-3 py-2.5 text-sm text-white"><option :value="6">6 мм</option><option :value="7">7 мм</option></select></label></div></section>
          <section><div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-medium text-white/75">Композиция</h2><button @click="navigate('picker')" class="text-xs text-[#d9ff64] hover:underline">Подобрать</button></div><div class="grid grid-cols-2 gap-2"><label class="text-xs text-white/40">Колонки<input v-model.number="p.cols" type="number" min="1" max="30" class="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"></label><label class="text-xs text-white/40">Ряды<input v-model.number="p.rows" type="number" min="1" max="30" class="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"></label><label class="col-span-2 text-xs text-white/40">Высота решётки<input v-model.number="p.gridHeight" type="number" min="20" class="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"></label></div></section>
        </div>
        <button @click="reset" class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-white/55 hover:bg-white/5"><RotateCcw :size="15"/>Сбросить параметры</button>
      </aside>

      <section class="min-w-0">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p class="text-sm text-white/45">Проект</p><h2 class="text-2xl font-semibold">Решётка {{ p.cols }} × {{ p.rows }} <span class="text-white/25">·</span> {{ cells }} ячеек</h2></div><div class="flex flex-wrap gap-2"><button @click="downloadDrawing" class="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/65 hover:bg-white/5"><Download :size="15"/>SVG</button><div class="flex rounded-xl border border-white/10 bg-black/15 p-1"><button v-for="tab in tabs" :key="tab" @click="active=tab" :class="['rounded-lg px-4 py-2 text-sm transition', active===tab ? 'bg-white text-[#121713]' : 'text-white/45 hover:text-white']">{{tab}}</button></div></div></div>
        <div class="overflow-hidden rounded-2xl border border-white/10 bg-[#ecebe4] text-[#1a211c]">
          <div class="flex items-center justify-between border-b border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-black/45"><span>{{ active }}</span><span>масштаб автоматически</span></div>
          <div class="grid min-h-[430px] place-items-center p-8">
            <div v-if="active==='Чертёж'" class="relative w-full max-w-[720px]" :style="{aspectRatio: innerL+'/'+innerW}"><div class="absolute inset-0 border-2 border-[#273229] bg-[linear-gradient(135deg,#f7f6ee,#e5e4dc)] shadow-xl"></div><div class="absolute inset-0 grid" :style="{gridTemplateColumns:`repeat(${p.cols},1fr)`,gridTemplateRows:`repeat(${p.rows},1fr)`}"><div v-for="n in cells" :key="n" class="grid place-items-center border border-[#556158]/60 text-[clamp(9px,1.2vw,14px)] text-black/35">{{n}}</div></div><span class="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs">{{ innerL.toFixed(0) }} мм</span><span class="absolute -right-16 top-1/2 -translate-y-1/2 rotate-90 text-xs">{{ innerW.toFixed(0) }} мм</span></div>
            <GridScene v-else-if="active==='3D-модель'" :length="p.length" :width="p.width" :height="p.height" :grid-height="stripHeight" :rows="p.rows" :cols="p.cols" :cell-l="cellL" :cell-w="cellW" :board="board" />
            <div v-else class="w-full space-y-7"><section><div class="mb-3 flex items-end justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-[.16em] text-black/40">Комплект решётки</p><h3 class="mt-1 font-semibold">Чертежи полос</h3></div><span class="text-xs text-black/40">масштаб 1:1 между осями</span></div><div class="grid gap-5 xl:grid-cols-2"><StripCanvas title="Продольная полоса" :length="innerL" :height="stripHeight" :quantity="longStrips" :slots="longSlotPositions" :slot-width="p.slot" :slot-depth="slotDepth" /><StripCanvas title="Поперечная полоса" :length="innerW" :height="stripHeight" :quantity="crossStrips" :slots="crossSlotPositions" :slot-width="p.slot" :slot-depth="slotDepth" from-top /></div></section><section v-if="p.method !== 'RODA'"><div class="mb-3"><p class="text-xs font-bold uppercase tracking-[.16em] text-black/40">{{ p.method === 'PLOTTER' ? 'Плоттер · 1600 × 2500 мм' : 'Плоская высечка' }}</p><h3 class="mt-1 font-semibold">Раскладка листа</h3></div><DieLayoutCanvas v-if="activeLayout" :layout="activeLayout"/><div v-else class="grid h-[300px] place-items-center text-center text-black/45"><p>Комплект не помещается в рабочую область листа.<br>Уменьшите размеры или высоту решётки.</p></div></section></div>
          </div>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div v-for="item in [[Box,'Внутренний короб',`${boxLength.toFixed(0)} × ${boxWidth.toFixed(0)} × ${boxHeight.toFixed(0)} мм`],[Grid3X3,'Ячейка / профиль',`${cellL} × ${cellW} мм · ${p.profile}`],[Layers3,p.method === 'RODA' ? 'Фактическая площадь' : 'Площадь на комплект',`${area} м²`],[Download,activeLayout ? 'Лист / комплектов' : 'Комплект / просечка',activeLayout ? `${activeLayout.displaySize || `${activeLayout.sheetW}×${activeLayout.sheetH}`} · ${activeLayout.kits} шт.` : `${longStrips + crossStrips} полос · ${p.slot} мм`]]" :key="item[1]" class="rounded-xl border border-white/10 bg-[#171d18] p-4"><component :is="item[0]" :size="18" class="mb-4 text-[#d9ff64]"/><p class="text-xs text-white/40">{{item[1]}}</p><b class="mt-1 block text-sm">{{item[2]}}</b></div></div>
        <p class="mt-4 text-xs leading-5 text-white/35">Короб: длина продольной полосы + 5 мм; длина поперечной полосы + 5 мм; максимальная высота продукта или решётки + толщина картона. Перед производством проверьте технологические допуски.</p>
      </section>
    </main>
  </div>
</template>
