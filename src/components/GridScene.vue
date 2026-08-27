<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const props = defineProps({
  length: Number, width: Number, height: Number, gridHeight: Number,
  rows: Number, cols: Number, cellL: Number, cellW: Number, board: Number,
})
const host = ref(null)
const selectedCells = ref(new Set())
let renderer, scene, camera, controls, gridGroup, frame, observer, hitTargets = [], products = new Map(), pointerStart

const disposeGroup = (group) => {
  group?.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() })
  if (group) scene.remove(group)
}

const rebuild = () => {
  disposeGroup(gridGroup)
  gridGroup = new THREE.Group()
  scene.add(gridGroup)
  hitTargets = []
  products = new Map()
  const unit = 1 / Math.max(props.length * props.cols, props.width * props.rows) * 7
  const totalX = props.cellL * props.cols + props.board * (props.cols - 1) - 5
  const totalZ = props.cellW * props.rows + props.board * (props.rows - 1) - 5
  const h = props.gridHeight * unit
  const t = Math.max(props.board * unit, .035)
  const cardboard = new THREE.MeshStandardMaterial({ color: 0xcaa86b, roughness: .78, metalness: 0, side: THREE.DoubleSide })
  const edge = new THREE.LineBasicMaterial({ color: 0x6d5634 })
  const addStrip = (sx, sz, x, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), cardboard.clone())
    mesh.position.set(x, h / 2, z)
    gridGroup.add(mesh)
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edge.clone())
    outline.position.copy(mesh.position)
    gridGroup.add(outline)
  }
  for (let r = 1; r < props.rows; r++) {
    const z = (-totalZ / 2 + r * props.cellW + (r - .5) * props.board - 2.5) * unit
    addStrip(totalX * unit, t, 0, z)
  }
  for (let c = 1; c < props.cols; c++) {
    const x = (-totalX / 2 + c * props.cellL + (c - .5) * props.board - 2.5) * unit
    addStrip(t, totalZ * unit, x, 0)
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(totalX * unit + .18, .08, totalZ * unit + .18), new THREE.MeshStandardMaterial({ color: 0x2b332c, roughness: .9 }))
  base.position.y = -.06
  gridGroup.add(base)
  const productMat = new THREE.MeshPhysicalMaterial({ color: 0x58b4c7, transparent: true, opacity: .44, roughness: .18, transmission: .18, depthWrite: false })
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  const centers = (count, cell, total) => {
    let cursor = -total / 2
    return Array.from({ length: count }, (_, i) => {
      const size = cell - (i === 0 ? 2.5 : 0) - (i === count - 1 ? 2.5 : 0)
      const center = cursor + size / 2
      cursor += size + (i < count - 1 ? props.board : 0)
      return { center, size }
    })
  }
  const xs = centers(props.cols, props.cellL, totalX), zs = centers(props.rows, props.cellW, totalZ)
  const valid = new Set()
  zs.forEach((z, row) => xs.forEach((x, col) => {
    const key = `${row}:${col}`; valid.add(key)
    const targetH = Math.max(props.height, props.gridHeight) * unit
    const hit = new THREE.Mesh(new THREE.BoxGeometry(x.size * unit, targetH, z.size * unit), hitMat.clone())
    hit.position.set(x.center * unit, targetH / 2, z.center * unit); hit.userData.cellKey = key
    gridGroup.add(hit); hitTargets.push(hit)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(props.length * unit, props.height * unit, props.width * unit), productMat.clone())
    mesh.position.set(x.center * unit, props.height * unit / 2, z.center * unit); mesh.userData.targetY = mesh.position.y; mesh.visible = selectedCells.value.has(key)
    gridGroup.add(mesh); products.set(key, mesh)
  }))
  selectedCells.value = new Set([...selectedCells.value].filter(key => valid.has(key)))
  controls.target.set(0, h * .5, 0)
  camera.position.set(9, h * .5 + 6.5, 9)
  controls.update()
}

const toggleCell = (key) => {
  const next = new Set(selectedCells.value), mesh = products.get(key)
  if (next.has(key)) next.delete(key)
  else { next.add(key); mesh.visible = true; mesh.position.y = mesh.userData.targetY + 4 }
  selectedCells.value = next
}
const clearProducts = () => { selectedCells.value = new Set() }

onMounted(() => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xecebe4)
  camera = new THREE.PerspectiveCamera(38, 1, .1, 100)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  host.value.appendChild(renderer.domElement)
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
  renderer.domElement.addEventListener('pointerdown', e => { pointerStart = { x: e.clientX, y: e.clientY } })
  renderer.domElement.addEventListener('pointerup', e => {
    if (!pointerStart || Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5) return
    const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(hitTargets, false)[0]; if (hit) toggleCell(hit.object.userData.cellKey)
  })
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.minDistance = 5
  controls.maxDistance = 24
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5b664f, 2.1))
  const sun = new THREE.DirectionalLight(0xffffff, 2.6)
  sun.position.set(6, 10, 4)
  scene.add(sun)
  rebuild()
  observer = new ResizeObserver(() => {
    const { width, height } = host.value.getBoundingClientRect()
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  })
  observer.observe(host.value)
  const animate = () => {
    frame = requestAnimationFrame(animate)
    products.forEach((mesh, key) => {
      if (selectedCells.value.has(key) && mesh.visible) mesh.position.y += (mesh.userData.targetY - mesh.position.y) * .09
      else if (mesh.visible) { mesh.position.y += .11; if (mesh.position.y > mesh.userData.targetY + 4) mesh.visible = false }
    })
    controls.update()
    renderer.render(scene, camera)
  }
  animate()
})

watch(() => [props.length, props.width, props.height, props.gridHeight, props.rows, props.cols, props.cellL, props.cellW, props.board], rebuild)
onBeforeUnmount(() => { cancelAnimationFrame(frame); observer?.disconnect(); controls?.dispose(); disposeGroup(gridGroup); renderer?.dispose() })
</script>

<template>
  <div class="relative h-[430px] w-full overflow-hidden">
    <div ref="host" class="h-full w-full cursor-grab active:cursor-grabbing"></div>
    <div class="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-white/80 px-3 py-2 text-xs text-black/55 backdrop-blur">Клик по ячейке — продукт · потяните для вращения · колесо для масштаба</div>
    <button v-if="selectedCells.size" @click="clearProducts" class="absolute bottom-4 right-4 rounded-xl bg-[#18201a] px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-[#263129]">Очистить · {{ selectedCells.size }}</button>
  </div>
</template>
