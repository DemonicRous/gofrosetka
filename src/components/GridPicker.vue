<script setup>
import { computed, ref } from 'vue'
import { ArrowRight, Sparkles, Ruler, Grid3X3, PackageOpen, AlertTriangle } from 'lucide-vue-next'

const emit = defineEmits(['select'])
const profiles = { F: 1, E: 2, D: 2.5, B: 3, C: 4, BE: 5, BD: 5, BC: 7 }
const edgeTrim = 2.5
const mode = ref('count')
const quantityRule = ref('exact')
const boxLength = ref(300)
const boxWidth = ref(200)
const requested = ref(12)
const profile = ref('D')
const gap = ref(1)
const productLength = ref(null)
const productWidth = ref(null)

const normalizedNeed = computed(() => Math.max(1, Math.min(400, Math.round(Number(requested.value) || 1))))
const hasProduct = computed(() => Number(productLength.value) > 0 && Number(productWidth.value) > 0)

const options = computed(() => {
  const need = normalizedNeed.value
  const maxTotal = quantityRule.value === 'exact' ? need : Math.min(400, need + Math.max(12, Math.ceil(need * .2)))
  const length = Math.max(1, Number(boxLength.value) || 300)
  const width = Math.max(1, Number(boxWidth.value) || 200)
  const board = profiles[profile.value]
  const itemL = Number(productLength.value) || 0
  const itemW = Number(productWidth.value) || 0
  const found = []

  for (let rows = 1; rows <= 30; rows++) {
    for (let cols = 1; cols <= 30; cols++) {
      const total = rows * cols
      if (total < need || total > maxTotal) continue
      if (mode.value === 'count') {
        if (rows > cols) continue
        const layoutRatio = cols / rows
        if (quantityRule.value === 'minimum' && need > 8 && rows < 3) continue
        if (quantityRule.value === 'minimum' && layoutRatio > 3) continue
        const excess = total - need
        found.push({ rows, cols, total, excess, score: (excess / need) * 4 + Math.log(layoutRatio) * .5, key: `${cols}x${rows}` })
        continue
      }

      const cellL = (length + edgeTrim * 2 - board * (cols - 1)) / cols
      const cellW = (width + edgeTrim * 2 - board * (rows - 1)) / rows
      const usefulL = cellL - Math.max(0, Number(gap.value) || 0)
      const usefulW = cellW - Math.max(0, Number(gap.value) || 0)
      if (usefulL <= 0 || usefulW <= 0) continue
      const directFit = !hasProduct.value || (itemL <= usefulL && itemW <= usefulW)
      const rotatedFit = hasProduct.value && itemW <= usefulL && itemL <= usefulW
      if (!directFit && !rotatedFit) continue
      const rotated = !directFit && rotatedFit
      const fittedL = rotated ? itemW : itemL
      const fittedW = rotated ? itemL : itemW
      const clearance = hasProduct.value ? Math.min(usefulL - fittedL, usefulW - fittedW) : null
      const cellRatio = Math.max(cellL, cellW) / Math.min(cellL, cellW)
      const layoutRatio = Math.max(cols / rows, rows / cols)
      const excess = total - need
      const warnings = []
      if (Math.min(usefulL, usefulW) < 30) warnings.push('Очень узкая ячейка — проверьте технологичность')
      if (clearance != null && clearance < 2) warnings.push('Малый запас: менее 2 мм до размера продукции')
      if (Math.min(cellL, cellW) < board * 8) warnings.push('Размер ячейки мал относительно толщины профиля')
      found.push({
        rows, cols, total, excess, cellL, cellW, usefulL, usefulW, rotated, clearance, warnings,
        strips: Math.max(0, rows - 1) + Math.max(0, cols - 1),
        stripLength: Math.max(0, rows - 1) * length + Math.max(0, cols - 1) * width,
        score: (excess / need) * 4 + Math.log(cellRatio) * .7 + Math.log(layoutRatio) * .12 + (rotated ? .03 : 0),
        key: `${cols}x${rows}`,
      })
    }
  }
  return found.sort((a, b) => a.score - b.score || a.excess - b.excess).slice(0, 6)
})

const select = option => emit('select', mode.value === 'count'
  ? { rows: option.rows, cols: option.cols }
  : { ...option, productL: option.usefulL, productW: option.usefulW, profile: profile.value, gap: Math.max(0, Number(gap.value) || 0) })
const setMode = next => { mode.value = next }
const mm = value => `${Math.round(Number(value))} мм`
</script>

<template>
  <main class="mx-auto w-full max-w-7xl px-5 py-10 lg:px-9 lg:py-14">
    <div class="mx-auto max-w-3xl text-center">
      <div class="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#d9ff64] text-[#121713]"><Sparkles :size="22"/></div>
      <p class="text-xs font-bold uppercase tracking-[.2em] text-[#d9ff64]">Подбор решётки</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Найдём подходящую раскладку</h1>
      <p class="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">Выберите подбор по количеству ячеек или точный расчёт по коробу и продукции.</p>
    </div>

    <div class="mx-auto mt-7 flex max-w-xl rounded-xl border border-white/10 bg-black/20 p-1">
      <button @click="setMode('count')" :class="['flex-1 rounded-lg px-3 py-2.5 text-sm transition', mode==='count' ? 'bg-white text-[#121713]' : 'text-white/45 hover:text-white']">Только по количеству</button>
      <button @click="setMode('box')" :class="['flex-1 rounded-lg px-3 py-2.5 text-sm transition', mode==='box' ? 'bg-white text-[#121713]' : 'text-white/45 hover:text-white']">По размеру короба</button>
    </div>

    <section class="mx-auto mt-8 max-w-5xl rounded-2xl border border-white/10 bg-[#171d18] p-5 sm:p-6">
      <div :class="['grid gap-4', mode==='box' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'mx-auto max-w-xl sm:grid-cols-2']">
        <label v-if="mode==='box'" class="text-xs text-white/45">Внутренняя длина, мм<input v-model.number="boxLength" type="number" min="1" step="1" class="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-lg font-semibold outline-none focus:border-[#d9ff64]/60"></label>
        <label v-if="mode==='box'" class="text-xs text-white/45">Внутренняя ширина, мм<input v-model.number="boxWidth" type="number" min="1" step="1" class="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-lg font-semibold outline-none focus:border-[#d9ff64]/60"></label>
        <label class="text-xs text-white/45">Количество ячеек<input v-model.number="requested" type="number" min="1" max="400" class="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-lg font-semibold outline-none focus:border-[#d9ff64]/60"></label>
        <label v-if="mode==='box'" class="text-xs text-white/45">Профиль картона<select v-model="profile" class="mt-2 w-full rounded-xl border border-white/10 bg-[#121713] px-4 py-3 text-lg font-semibold outline-none focus:border-[#d9ff64]/60"><option v-for="(thickness, name) in profiles" :key="name" :value="name">{{ name }} · {{ thickness }} мм</option></select></label>
        <label class="text-xs text-white/45">Условие подбора<select v-model="quantityRule" class="mt-2 w-full rounded-xl border border-white/10 bg-[#121713] px-4 py-3 text-lg font-semibold outline-none focus:border-[#d9ff64]/60"><option value="exact">Ровно указанное</option><option value="minimum">Не менее указанного</option></select></label>
      </div>
      <div v-if="mode==='box'" class="mt-5 grid gap-4 border-t border-white/8 pt-5 sm:grid-cols-3">
        <label class="text-xs text-white/45">Длина продукции, мм <span class="text-white/25">(необязательно)</span><input v-model.number="productLength" type="number" min="1" placeholder="Не указана" class="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 outline-none focus:border-[#d9ff64]/60"></label>
        <label class="text-xs text-white/45">Ширина продукции, мм <span class="text-white/25">(необязательно)</span><input v-model.number="productWidth" type="number" min="1" placeholder="Не указана" class="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 outline-none focus:border-[#d9ff64]/60"></label>
        <label class="text-xs text-white/45">Допуск ячейки, мм<input v-model.number="gap" type="number" min="0" step="0.5" class="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 outline-none focus:border-[#d9ff64]/60"></label>
      </div>
    </section>

    <div v-if="options.length" :class="['mx-auto mt-8 grid w-full gap-5', options.length === 1 ? 'max-w-sm' : options.length === 2 ? 'max-w-5xl md:grid-cols-2' : 'max-w-7xl md:grid-cols-2 xl:grid-cols-3']">
      <article v-for="(option, index) in options" :key="option.key" class="group rounded-2xl border border-white/10 bg-[#171d18] p-5 transition hover:-translate-y-0.5 hover:border-[#d9ff64]/35">
        <div class="flex items-start justify-between"><div><p class="text-xs text-white/35">{{ options.length === 1 ? 'Единственный подходящий вариант' : index === 0 ? 'Рекомендуемый вариант' : `Вариант ${index + 1}` }}</p><h2 class="mt-1 text-2xl font-semibold">{{ option.cols }} × {{ option.rows }}</h2></div><span :class="['rounded-full px-2.5 py-1 text-xs', option.excess ? 'bg-white/5 text-white/45' : 'bg-[#d9ff64]/15 text-[#d9ff64]']">{{ option.excess ? `+${option.excess} яч.` : 'точно' }}</span></div>
        <svg class="my-5 block aspect-[5/3] w-full overflow-hidden rounded-xl" viewBox="0 0 600 360" preserveAspectRatio="none" role="img" :aria-label="`Схема решётки ${option.cols} на ${option.rows}`">
          <rect x="0" y="0" width="600" height="360" rx="16" fill="#d7bd83"/>
          <g fill="none" stroke="#475349" stroke-width="1" vector-effect="non-scaling-stroke">
            <line v-for="i in option.cols - 1" :key="`v${i}`" :x1="600 * i / option.cols" y1="0" :x2="600 * i / option.cols" y2="360"/>
            <line v-for="i in option.rows - 1" :key="`h${i}`" x1="0" :y1="360 * i / option.rows" x2="600" :y2="360 * i / option.rows"/>
          </g>
          <rect x="0.75" y="0.75" width="598.5" height="358.5" rx="15.25" fill="none" stroke="#475349" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
        </svg>
        <div class="space-y-2 border-b border-white/8 pb-4 text-sm">
          <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-white/40"><Grid3X3 :size="14"/>Ячеек</span><b>{{ option.total }}</b></div>
          <template v-if="mode==='box'">
            <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-white/40"><Ruler :size="14"/>Внутренний короб</span><b>{{ Math.round(boxLength) }} × {{ Math.round(boxWidth) }} мм</b></div>
            <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-white/40"><Ruler :size="14"/>Размер ячейки</span><b>{{ Math.round(option.cellL) }} × {{ Math.round(option.cellW) }} мм</b></div>
            <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-white/40"><PackageOpen :size="14"/>Размер продукции</span><b>{{ Math.round(option.usefulL) }} × {{ Math.round(option.usefulW) }} мм</b></div>
            <div class="flex items-center justify-between"><span class="text-white/40">Полос / общая длина</span><b>{{ option.strips }} / {{ (option.stripLength / 1000).toFixed(1) }} м</b></div>
            <p v-if="option.rotated" class="rounded-lg bg-[#d9ff64]/10 px-3 py-2 text-xs text-[#d9ff64]">Продукция помещается при повороте на 90°</p>
            <p v-for="warning in option.warnings" :key="warning" class="flex gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-200"><AlertTriangle :size="14" class="shrink-0"/>{{ warning }}</p>
          </template>
          <div v-else class="flex items-center justify-between"><span class="text-white/40">Пропорция сетки</span><b>{{ (option.cols / option.rows).toFixed(2) }} : 1</b></div>
        </div>
        <button @click="select(option)" class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-medium text-[#121713] hover:bg-[#d9ff64]">Открыть в конструкторе<ArrowRight :size="15"/></button>
      </article>
    </div>
    <div v-else class="mt-8 rounded-2xl border border-white/10 p-10 text-center text-white/45">{{ mode === 'box' ? 'Подходящих вариантов нет. Проверьте размер продукции, короб, количество ячеек или профиль.' : 'Для точного количества нет компактной раскладки. Попробуйте режим «Не менее указанного».' }}</div>

    <p v-if="mode==='box'" class="mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-white/30">Размеры в карточках округлены до целого миллиметра. Расчёт конструктора сохраняет точные значения.</p>
  </main>
</template>
