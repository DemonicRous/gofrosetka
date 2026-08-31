<script setup>
import {ref,computed,onMounted,onBeforeUnmount,defineAsyncComponent,onErrorCaptured,nextTick} from 'vue'
import {buildPdf,validatePdfModel} from '../lib/pdfExport.js'
const props=defineProps({model:{type:Object,required:true}})
const emit=defineEmits(['close'])
const GridScene=defineAsyncComponent(()=>import('./GridScene.vue'))
const dialog=ref(null),scene=ref(null),renderScene=ref(false),busy=ref(false),error=ref(''),progress=ref('')
const selected=ref(['plan','scene','strips',...(props.model.layout?['layout']:[])])
const pages=computed(()=>[
  {key:'plan',title:'Чертёж',description:'Вид сверху, габариты решётки и внутреннего короба'},
  {key:'scene',title:'3D-модель',description:'Центрированный общий вид, независимо от масштаба экрана'},
  {key:'strips',title:'Развёртка решётки',description:'Оба типа полос, размеры и координаты центров просечек'},
  {key:'layout',title:props.model.method==='PLOTTER'?'Раскладка плоттера':'Раскладка штампа',description:props.model.layout?'Полный лист, направление гофры, поля и расход на комплект':props.model.method==='RODA'?'Для RODA отдельная раскладка листа не предусмотрена':'Нет раскладки: комплект не помещается в рабочую область',disabled:!props.model.layout},
])
onMounted(()=>dialog.value.showModal())
onBeforeUnmount(()=>dialog.value?.close())
onErrorCaptured(()=>{error.value='Не удалось создать 3D-модель. Снимите выбор этой страницы или попробуйте ещё раз.';return false})
async function download() {
  error.value='';busy.value=true
  try {
    validatePdfModel(props.model)
    await document.fonts.ready
    let image=null
    if(selected.value.includes('scene')) {
      progress.value='Подготовка 3D-модели…';renderScene.value=true;await nextTick()
      const deadline=Date.now()+15000
      while(!scene.value?.captureForPdf) {if(error.value||Date.now()>deadline) throw new Error(error.value||'Не удалось загрузить 3D-модель. Можно скачать PDF без этой страницы.');await new Promise(r=>setTimeout(r,50))}
      image=scene.value.captureForPdf()
    }
    progress.value='Формирование страниц PDF…'
    const pdf=await buildPdf(props.model,[...selected.value],image)
    pdf.save(`gofrosetka-${props.model.cols}x${props.model.rows}-${props.model.method.toLowerCase()}.pdf`)
    emit('close')
  } catch(e) {error.value=e.message||'Не удалось сформировать PDF. Попробуйте ещё раз.'}
  finally {busy.value=false;renderScene.value=false}
}
</script>

<template>
  <dialog ref="dialog" class="pdf-dialog" aria-labelledby="pdf-title" @cancel="busy ? $event.preventDefault() : emit('close')" @close="emit('close')">
    <h2 id="pdf-title" class="text-2xl font-semibold">Сохранить в PDF</h2>
    <p class="mt-2 text-sm text-white/50">Выберите страницы. Альбомный A4, единый масштаб осей и размерные подписи.</p>
    <fieldset :disabled="busy" class="my-6 space-y-3">
      <label v-for="(item,index) in pages" :key="item.key" :class="['flex gap-3 rounded-xl border border-white/10 p-4',item.disabled?'opacity-40':'cursor-pointer hover:bg-white/5']">
        <input v-model="selected" :value="item.key" :disabled="item.disabled" type="checkbox" class="mt-1 h-4 w-4 accent-[#d9ff64]">
        <span><b class="block text-sm">{{index+1}}. {{item.title}}</b><span class="mt-1 block text-xs leading-5 text-white/50">{{item.description}}</span></span>
      </label>
    </fieldset>
    <p v-if="error" role="alert" class="mb-4 text-sm text-red-300">{{error}}</p>
    <p v-if="busy" role="status" class="mb-4 text-sm text-[#d9ff64]">{{progress}}</p>
    <div class="flex justify-end gap-3"><button :disabled="busy" @click="emit('close')" class="rounded-xl border border-white/20 px-4 py-2.5 disabled:opacity-40">Отмена</button><button :disabled="busy||!selected.length" @click="download" class="rounded-xl bg-[#d9ff64] px-4 py-2.5 font-medium text-[#121713] disabled:opacity-40">{{busy?'Подготовка…':`Скачать PDF · ${selected.length} стр.`}}</button></div>
    <div v-if="renderScene" aria-hidden="true" class="pdf-offscreen"><GridScene ref="scene" :length="model.length" :width="model.width" :height="model.height" :grid-height="model.gridHeight" :rows="model.rows" :cols="model.cols" :cell-l="model.cellL" :cell-w="model.cellW" :board="model.board" :initial-cells="model.occupiedCells"/></div>
  </dialog>
</template>

<style scoped>
.pdf-dialog{position:fixed;inset:0;margin:auto;width:min(560px,calc(100% - 32px));max-height:90vh;overflow:auto;padding:28px;border:1px solid #ffffff26;border-radius:20px;background:#171d18;color:#eef4ef;}
.pdf-dialog::backdrop{background:#000a;backdrop-filter:blur(4px)}
.pdf-offscreen{position:fixed;left:-10000px;top:0;width:1600px;pointer-events:none}
</style>
