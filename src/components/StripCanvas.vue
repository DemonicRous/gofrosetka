<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({ title: String, length: Number, height: Number, quantity: Number, slots: Array, slotWidth: Number, slotDepth: Number, fromTop: Boolean })
const canvas = ref(null)
let observer

const arrow = (ctx, x1, x2, y, label) => {
  ctx.strokeStyle = '#3d463f'; ctx.fillStyle = '#3d463f'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
  for (const [x, d] of [[x1, 1], [x2, -1]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * 7, y - 3); ctx.lineTo(x + d * 7, y + 3); ctx.closePath(); ctx.fill() }
  ctx.fillStyle = '#28302a'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${label.toFixed(1)} мм`, (x1 + x2) / 2, y - 6)
}

const draw = () => {
  const el = canvas.value, rect = el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2)
  el.width = rect.width * dpr; el.height = rect.height * dpr
  const ctx = el.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, rect.width, rect.height)
  const padX = 34, top = 72, availableW = rect.width - padX * 2, availableH = rect.height - top - 48
  const scale = Math.min(1.25, availableW / props.length, availableH / props.height)
  const drawW = props.length * scale, drawH = props.height * scale, startX = (rect.width - drawW) / 2
  const sx = scale, sy = scale
  ctx.fillStyle = props.fromTop ? '#e1c58c' : '#d8b877'; ctx.strokeStyle = '#58472f'; ctx.lineWidth = 2
  ctx.fillRect(startX, top, drawW, drawH); ctx.strokeRect(startX, top, drawW, drawH)
  for (const pos of props.slots) {
    const x = startX + pos * sx, sw = Math.max(3, props.slotWidth * sx), depth = Math.min(props.height, props.slotDepth) * sy
    ctx.fillStyle = '#ecebe4'; ctx.strokeStyle = '#58472f'
    const y = props.fromTop ? top : top + drawH - depth
    ctx.fillRect(x - sw / 2, y, sw, depth + 1); ctx.strokeRect(x - sw / 2, y, sw, depth + 1)
    ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x, top - 5); ctx.lineTo(x, top + drawH + 5); ctx.stroke(); ctx.setLineDash([])
  }
  const points = [0, ...props.slots, props.length]
  for (let i = 0; i < points.length - 1; i++) arrow(ctx, startX + points[i] * sx, startX + points[i + 1] * sx, top + drawH + 27, points[i + 1] - points[i])
  arrow(ctx, startX, startX + drawW, top - 16, props.length)
  const dimX = startX - 17
  ctx.strokeStyle = '#3d463f'; ctx.fillStyle = '#3d463f'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(dimX, top); ctx.lineTo(dimX, top + drawH); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(dimX, top); ctx.lineTo(dimX - 3, top + 7); ctx.lineTo(dimX + 3, top + 7); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(dimX, top + drawH); ctx.lineTo(dimX - 3, top + drawH - 7); ctx.lineTo(dimX + 3, top + drawH - 7); ctx.closePath(); ctx.fill()
  ctx.save(); ctx.translate(dimX - 9, top + drawH / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#28302a'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${props.height.toFixed(0)} мм`, 0, 0); ctx.restore()
  ctx.fillStyle = '#28302a'; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`${props.title} · ${props.quantity} шт.`, startX, 18)
  ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#667169'; ctx.fillText(`Просечка ${props.slotWidth} × ${props.slotDepth.toFixed(1)} мм`, startX, 37)
}
onMounted(() => { observer = new ResizeObserver(draw); observer.observe(canvas.value); draw() })
watch(() => [props.length, props.height, props.quantity, props.slots, props.slotWidth, props.slotDepth], draw, { deep: true })
onBeforeUnmount(() => observer?.disconnect())
</script>

<template><canvas ref="canvas" class="w-full rounded-xl border border-black/10 bg-[#f5f3ea]" :style="{height: `${Math.min(520, Math.max(270, height * 1.25 + 125))}px`}"></canvas></template>
