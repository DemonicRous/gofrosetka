<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const props = defineProps({
  length: Number, width: Number, height: Number, gridHeight: Number,
  rows: Number, cols: Number, cellL: Number, cellW: Number, board: Number,
})
const host = ref(null)
const productVisible = ref(true)
let renderer, scene, camera, controls, gridGroup, product, frame, observer

const disposeGroup = (group) => {
  group?.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() })
  if (group) scene.remove(group)
}

const rebuild = () => {
  disposeGroup(gridGroup)
  gridGroup = new THREE.Group()
  scene.add(gridGroup)
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
  const productMat = new THREE.MeshPhysicalMaterial({ color: 0x72b8c8, transparent: true, opacity: .42, roughness: .2, transmission: .12, depthWrite: false })
  product = new THREE.Mesh(new THREE.BoxGeometry(props.length * unit, props.height * unit, props.width * unit), productMat)
  const firstX = -totalX / 2 + (props.cellL - 2.5) / 2
  const firstZ = -totalZ / 2 + (props.cellW - 2.5) / 2
  product.position.set(firstX * unit, props.height * unit / 2, firstZ * unit)
  product.userData.targetY = product.position.y
  gridGroup.add(product)
  product.visible = productVisible.value
  controls.target.set(0, h * .35, 0)
  camera.position.set(8.5, 7, 9)
  controls.update()
}

const toggleProduct = () => {
  productVisible.value = !productVisible.value
  if (productVisible.value) { product.visible = true; product.position.y = product.userData.targetY + 4 }
}

onMounted(() => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xecebe4)
  camera = new THREE.PerspectiveCamera(38, 1, .1, 100)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  host.value.appendChild(renderer.domElement)
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
    if (productVisible.value && product?.visible) product.position.y += (product.userData.targetY - product.position.y) * .09
    else if (product?.visible) { product.position.y += .11; if (product.position.y > product.userData.targetY + 4) product.visible = false }
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
    <div class="absolute left-4 top-4 rounded-lg bg-white/80 px-3 py-2 text-xs text-black/55 backdrop-blur">Потяните для вращения · колесо для масштаба</div>
    <button @click="toggleProduct" class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-[#18201a] px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-[#263129]">{{ productVisible ? 'Убрать продукт' : 'Вставить продукт' }}</button>
  </div>
</template>
