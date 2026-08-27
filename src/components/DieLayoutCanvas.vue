<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({ layout: Object })
const canvas = ref(null)
let observer
const draw = () => {
  const el = canvas.value, rect = el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2)
  el.width = rect.width * dpr; el.height = rect.height * dpr
  const ctx = el.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, rect.width, rect.height)
  if (!props.layout?.items?.length) return
  const pad = 38, labelH = 34, scale = Math.min((rect.width - pad * 2) / props.layout.sheetW, (rect.height - pad * 2 - labelH) / props.layout.sheetH)
  const w = props.layout.sheetW * scale, h = props.layout.sheetH * scale, ox = (rect.width - w) / 2, oy = labelH + (rect.height - labelH - h) / 2
  ctx.fillStyle = '#f8f5ea'; ctx.strokeStyle = '#38433b'; ctx.lineWidth = 2; ctx.fillRect(ox, oy, w, h); ctx.strokeRect(ox, oy, w, h)
  for (const item of props.layout.items) {
    ctx.fillStyle = item.type === 'L' ? '#d8b877' : '#e1c58c'; ctx.strokeStyle = '#725c38'; ctx.lineWidth = 1
    ctx.fillRect(ox + (item.x + 10) * scale, oy + (item.y + 12.5) * scale, item.w * scale, item.h * scale)
    ctx.strokeRect(ox + (item.x + 10) * scale, oy + (item.y + 12.5) * scale, item.w * scale, item.h * scale)
    if (item.w * scale > 42) { ctx.fillStyle = '#443821'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${item.type} · К${item.kit}`, ox + (item.x + 10 + item.w / 2) * scale, oy + (item.y + 12.5 + item.h / 2) * scale + 3) }
  }
  ctx.fillStyle = '#28302a'; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`Штамп ${props.layout.sheetW} × ${props.layout.sheetH} мм · ${props.layout.kits} компл.`, ox, 16)
  ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#667169'; ctx.fillText('Подача и гофра ↓   припуск 25 мм по гофре / 20 мм против гофры', ox, 31)
}
onMounted(() => { observer = new ResizeObserver(draw); observer.observe(canvas.value); draw() })
watch(() => props.layout, draw, { deep: true })
onBeforeUnmount(() => observer?.disconnect())
</script>

<template><canvas ref="canvas" class="h-[420px] w-full rounded-xl border border-black/10 bg-[#f5f3ea]"></canvas></template>
