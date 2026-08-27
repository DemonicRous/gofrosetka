<script setup>
import { ref, computed } from 'vue'
import { Box, Grid3X3, Layers3, Download, RotateCcw } from 'lucide-vue-next'

const profiles = { F: 1, E: 2, D: 2.5, B: 3, C: 4, BE: 5, BD: 5, BC: 7 }
const p = ref({ length: 180, width: 120, height: 210, gridHeight: 160, gap: 8, rows: 3, cols: 4, profile: 'B', slot: 6 })
const active = ref('Чертёж')
const tabs = ['Чертёж', '3D-модель', 'Развёртка']
const cellL = computed(() => p.value.length + p.value.gap * 2)
const cellW = computed(() => p.value.width + p.value.gap * 2)
const board = computed(() => profiles[p.value.profile])
const innerL = computed(() => cellL.value * p.value.cols + board.value * (p.value.cols - 1))
const innerW = computed(() => cellW.value * p.value.rows + board.value * (p.value.rows - 1))
const stripHeight = computed(() => Math.max(20, p.value.gridHeight))
const boxHeight = computed(() => Math.max(p.value.height + p.value.gap, stripHeight.value))
const longStrips = computed(() => Math.max(0, p.value.rows - 1))
const crossStrips = computed(() => Math.max(0, p.value.cols - 1))
const area = computed(() => ((longStrips.value * innerL.value + crossStrips.value * innerW.value) * stripHeight.value / 1e6).toFixed(3))
const cells = computed(() => p.value.rows * p.value.cols)
const reset = () => p.value = { length: 180, width: 120, height: 210, gridHeight: 160, gap: 8, rows: 3, cols: 4, profile: 'B', slot: 6 }
const downloadDrawing = () => {
  const scale = 800 / Math.max(innerL.value, innerW.value)
  const w = innerL.value * scale, h = innerW.value * scale
  const lines = []
  for (let i = 1; i < p.value.cols; i++) lines.push(`<line x1="${i * cellL.value * scale + (i - .5) * board.value * scale}" y1="0" x2="${i * cellL.value * scale + (i - .5) * board.value * scale}" y2="${h}"/>`)
  for (let i = 1; i < p.value.rows; i++) lines.push(`<line x1="0" y1="${i * cellW.value * scale + (i - .5) * board.value * scale}" x2="${w}" y2="${i * cellW.value * scale + (i - .5) * board.value * scale}"/>`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w + 80}" height="${h + 110}" viewBox="-40 -40 ${w + 80} ${h + 110}"><style>text{font-family:Arial;font-size:14px;fill:#222}line,rect{fill:none;stroke:#222;stroke-width:2}</style><rect width="${w}" height="${h}"/>${lines.join('')}<text x="0" y="${h + 28}">ГофроСетка · ${p.value.cols}×${p.value.rows} · ${innerL.value.toFixed(0)}×${innerW.value.toFixed(0)}×${boxHeight.value.toFixed(0)} мм</text><text x="0" y="${h + 50}">Профиль ${p.value.profile} (${board.value} мм) · просечка ${p.value.slot} мм · высота решётки ${stripHeight.value} мм</text></svg>`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  link.download = `gofrosetka-${p.value.cols}x${p.value.rows}.svg`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_70%_-10%,#23372a_0,transparent_38%),#101411]">
    <header class="border-b border-white/8 px-5 py-4 lg:px-9 flex items-center justify-between">
      <div class="flex items-center gap-3"><div class="grid h-9 w-9 place-items-center rounded-xl bg-[#d9ff64] text-[#121713]"><Grid3X3 :size="20"/></div><div><b class="tracking-tight">ГофроСетка</b><p class="m-0 text-[11px] text-white/45">конструктор разделителей</p></div></div>
      <span class="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50">Расчёт в реальном времени</span>
    </header>

    <main class="grid gap-5 p-5 lg:grid-cols-[340px_1fr] lg:p-9">
      <aside class="rounded-2xl border border-white/10 bg-[#171d18]/90 p-5 shadow-2xl shadow-black/20">
        <div class="mb-5"><p class="text-[11px] font-bold uppercase tracking-[.18em] text-[#d9ff64]">Параметры проекта</p><h1 class="mt-2 text-2xl font-semibold tracking-tight">Настройте ячейку</h1><p class="mt-1 text-sm leading-5 text-white/45">Размеры указываются в миллиметрах.</p></div>
        <div class="space-y-5">
          <section><h2 class="mb-3 text-sm font-medium text-white/75">Габариты продукции</h2><div class="grid grid-cols-3 gap-2"><label v-for="[key,label] in [['length','Длина'],['width','Ширина'],['height','Высота']]" :key="key" class="text-xs text-white/40">{{label}}<input v-model.number="p[key]" type="number" min="1" class="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#d9ff64]/60"></label></div></section>
          <section><label class="text-xs text-white/40">Зазор с каждой стороны<input v-model.number="p.gap" type="number" min="0" class="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"></label></section>
          <section><h2 class="mb-3 text-sm font-medium text-white/75">Материал и просечка</h2><div class="grid grid-cols-2 gap-2"><label class="text-xs text-white/40">Профиль<select v-model="p.profile" class="mt-1 w-full rounded-lg border border-white/10 bg-[#121713] px-3 py-2.5 text-sm text-white"><option v-for="(thickness, profile) in profiles" :key="profile" :value="profile">{{ profile }} · {{ thickness }} мм</option></select></label><label class="text-xs text-white/40">Просечка<select v-model.number="p.slot" class="mt-1 w-full rounded-lg border border-white/10 bg-[#121713] px-3 py-2.5 text-sm text-white"><option :value="6">6 мм</option><option :value="7">7 мм</option></select></label></div></section>
          <section><h2 class="mb-3 text-sm font-medium text-white/75">Композиция</h2><div class="grid grid-cols-2 gap-2"><label class="text-xs text-white/40">Колонки<input v-model.number="p.cols" type="number" min="1" max="12" class="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"></label><label class="text-xs text-white/40">Ряды<input v-model.number="p.rows" type="number" min="1" max="12" class="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"></label><label class="col-span-2 text-xs text-white/40">Высота решётки<input v-model.number="p.gridHeight" type="number" min="20" class="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"></label></div></section>
        </div>
        <button @click="reset" class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-white/55 hover:bg-white/5"><RotateCcw :size="15"/>Сбросить параметры</button>
      </aside>

      <section class="min-w-0">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p class="text-sm text-white/45">Проект</p><h2 class="text-2xl font-semibold">Решётка {{ p.cols }} × {{ p.rows }} <span class="text-white/25">·</span> {{ cells }} ячеек</h2></div><div class="flex flex-wrap gap-2"><button @click="downloadDrawing" class="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/65 hover:bg-white/5"><Download :size="15"/>SVG</button><div class="flex rounded-xl border border-white/10 bg-black/15 p-1"><button v-for="tab in tabs" :key="tab" @click="active=tab" :class="['rounded-lg px-4 py-2 text-sm transition', active===tab ? 'bg-white text-[#121713]' : 'text-white/45 hover:text-white']">{{tab}}</button></div></div></div>
        <div class="overflow-hidden rounded-2xl border border-white/10 bg-[#ecebe4] text-[#1a211c]">
          <div class="flex items-center justify-between border-b border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-black/45"><span>{{ active }}</span><span>масштаб автоматически</span></div>
          <div class="grid min-h-[430px] place-items-center p-8">
            <div v-if="active==='Чертёж'" class="relative w-full max-w-[720px]" :style="{aspectRatio: innerL+'/'+innerW}"><div class="absolute inset-0 border-2 border-[#273229] bg-[linear-gradient(135deg,#f7f6ee,#e5e4dc)] shadow-xl"></div><div class="absolute inset-0 grid" :style="{gridTemplateColumns:`repeat(${p.cols},1fr)`,gridTemplateRows:`repeat(${p.rows},1fr)`}"><div v-for="n in cells" :key="n" class="grid place-items-center border border-[#556158]/60 text-[clamp(9px,1.2vw,14px)] text-black/35">{{n}}</div></div><span class="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs">{{ innerL.toFixed(0) }} мм</span><span class="absolute -right-16 top-1/2 -translate-y-1/2 rotate-90 text-xs">{{ innerW.toFixed(0) }} мм</span></div>
            <div v-else-if="active==='3D-модель'" class="relative h-[340px] w-full max-w-[620px] [perspective:900px]"><div class="absolute left-1/2 top-1/2 grid h-[250px] w-[440px] -translate-x-1/2 -translate-y-1/2 rotate-x-[62deg] rotate-z-[-28deg] border-4 border-[#2b342d] bg-[#d4b474] shadow-[-30px_35px_35px_#0004]" :style="{gridTemplateColumns:`repeat(${p.cols},1fr)`,gridTemplateRows:`repeat(${p.rows},1fr)`}"><div v-for="n in cells" :key="n" class="border-2 border-[#6a5737] bg-[#f0d79d]/60"></div></div><div class="absolute bottom-0 left-1/2 -translate-x-1/2 text-center"><b>{{cells}} ячеек</b><p class="text-sm text-black/45">внутренний короб {{innerL.toFixed(0)}} × {{innerW.toFixed(0)}} × {{boxHeight.toFixed(0)}} мм</p></div></div>
            <div v-else class="w-full"><div class="mb-5 flex flex-wrap justify-center gap-5"><div v-for="n in longStrips" :key="'l'+n" class="relative h-32 min-w-[280px] flex-1 border-2 border-[#58472f] bg-[#d8b877]"><span class="absolute left-2 top-2 text-xs">Продольная {{n}}</span><i v-for="x in crossStrips" :key="x" class="absolute bottom-0 h-1/2 border-x border-[#58472f] bg-[#ecebe4]" :style="{left:(x/p.cols*100)+'%',width:Math.max(3,p.slot/2)+'px'}"></i></div><div v-for="n in crossStrips" :key="'c'+n" class="relative h-32 min-w-[240px] flex-1 border-2 border-[#58472f] bg-[#e1c58c]"><span class="absolute left-2 top-2 text-xs">Поперечная {{n}}</span><i v-for="x in longStrips" :key="x" class="absolute top-0 h-1/2 border-x border-[#58472f] bg-[#ecebe4]" :style="{left:(x/p.rows*100)+'%',width:Math.max(3,p.slot/2)+'px'}"></i></div></div><p class="text-center text-xs text-black/45">Пазы: {{ p.slot }} мм · профиль {{ p.profile }} ({{ board }} мм) · глубина {{ (stripHeight / 2).toFixed(0) }} мм</p></div>
          </div>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div v-for="item in [[Box,'Внутренний короб',`${innerL.toFixed(0)} × ${innerW.toFixed(0)} × ${boxHeight.toFixed(0)} мм`],[Grid3X3,'Ячейка / профиль',`${cellL} × ${cellW} мм · ${p.profile}`],[Layers3,'Площадь картона',`${area} м²`],[Download,'Комплект / просечка',`${longStrips + crossStrips} полос · ${p.slot} мм`]]" :key="item[1]" class="rounded-xl border border-white/10 bg-[#171d18] p-4"><component :is="item[0]" :size="18" class="mb-4 text-[#d9ff64]"/><p class="text-xs text-white/40">{{item[1]}}</p><b class="mt-1 block text-sm">{{item[2]}}</b></div></div>
        <p class="mt-4 text-xs leading-5 text-white/35">Предварительный технологический расчёт. Для производства проверьте допуски, направление гофры, толщину материала и внутренние размеры конкретного короба.</p>
      </section>
    </main>
  </div>
</template>
