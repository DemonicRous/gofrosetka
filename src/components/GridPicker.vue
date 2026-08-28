<script setup>
import { computed, ref } from 'vue'
import { ArrowRight, Sparkles } from 'lucide-vue-next'

const emit = defineEmits(['select'])
const requested = ref(100)
const options = computed(() => {
  const need = Math.max(1, Math.min(400, Math.round(Number(requested.value) || 1)))
  const extra = Math.max(12, Math.ceil(need * .15)), maxTotal = need + extra
  const found = []
  for (let rows = 1; rows <= 30; rows++) {
    for (let cols = rows; cols <= 30; cols++) {
      const total = rows * cols, ratio = cols / rows
      if (total < need || total > maxTotal) continue
      if (need > 8 && rows < 3) continue
      if (ratio > 3) continue
      const excess = total - need
      const score = (excess / need) * 3 + Math.log(ratio) * .4
      found.push({ rows, cols, total, excess, ratio, score })
    }
  }
  return found.sort((a, b) => a.score - b.score || a.total - b.total).slice(0, 6)
})
</script>

<template>
  <main class="mx-auto w-full max-w-7xl px-5 py-10 lg:px-9 lg:py-16">
    <div class="mx-auto max-w-3xl text-center"><div class="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#d9ff64] text-[#121713]"><Sparkles :size="22"/></div><p class="text-xs font-bold uppercase tracking-[.2em] text-[#d9ff64]">Подбор композиции</p><h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Сколько ячеек вам нужно?</h1><p class="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">Подберём компактные варианты без вытянутых конструкций вроде 50×2. Для простых чисел предложим ближайшее количество ячеек с небольшим запасом.</p></div>
    <div class="mx-auto mt-8 flex max-w-md items-end gap-3 rounded-2xl border border-white/10 bg-[#171d18] p-4"><label class="flex-1 text-xs text-white/45">Минимальное количество ячеек<input v-model.number="requested" type="number" min="1" max="400" class="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xl font-semibold text-white outline-none focus:border-[#d9ff64]/60"></label><span class="mb-3 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/35">до 400</span></div>
    <div v-if="options.length" class="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="(option, index) in options" :key="`${option.cols}x${option.rows}`" class="group rounded-2xl border border-white/10 bg-[#171d18] p-5 transition hover:-translate-y-0.5 hover:border-[#d9ff64]/35">
        <div class="flex items-start justify-between"><div><p class="text-xs text-white/35">{{ index === 0 ? 'Оптимальный вариант' : `Вариант ${index + 1}` }}</p><h2 class="mt-1 text-2xl font-semibold">{{ option.cols }} × {{ option.rows }}</h2></div><span :class="['rounded-full px-2.5 py-1 text-xs', option.excess ? 'bg-white/5 text-white/45' : 'bg-[#d9ff64]/15 text-[#d9ff64]']">{{ option.excess ? `+${option.excess} яч.` : 'точно' }}</span></div>
        <div class="my-5 grid aspect-[1.7] gap-px overflow-hidden rounded-xl bg-[#475349] p-px" :style="{gridTemplateColumns:`repeat(${option.cols},1fr)`,gridTemplateRows:`repeat(${option.rows},1fr)`}"><i v-for="n in option.total" :key="n" class="min-h-0 min-w-0 bg-[#d7bd83]"></i></div>
        <div class="flex items-center justify-between"><div><b class="text-sm">{{ option.total }} ячеек</b><p class="mt-0.5 text-xs text-white/35">пропорция {{ option.ratio.toFixed(2) }} : 1</p></div><button @click="emit('select', option)" class="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-medium text-[#121713] hover:bg-[#d9ff64]">Применить<ArrowRight :size="15"/></button></div>
      </article>
    </div>
    <div v-else class="mt-10 rounded-2xl border border-white/10 p-10 text-center text-white/45">Для такого количества не найден компактный вариант в пределах 30×30.</div>
  </main>
</template>
