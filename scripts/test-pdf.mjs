// Run with CANVAS_MODULE pointing to the bundled native canvas package.
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {createCanvas,Image}=require(process.env.CANVAS_MODULE||'canvas')
globalThis.document={createElement:()=>createCanvas(1,1)}
globalThis.Image=class extends Image {async decode(){}}
const {buildPdf}=await import('../src/lib/pdfExport.js')
const model={length:100,width:100,height:200,gridHeight:160,rows:3,cols:3,profile:'D',board:2.5,slot:6,slotDepth:85,
  cellL:101,cellW:101,stripL:303,stripW:303,boxL:308,boxW:308,boxH:202.5,longSlots:[99.75,203.25],crossSlots:[99.75,203.25],methodLabel:'Плоттер',
  layout:{title:'Плоттер',sheetW:2500,sheetH:1600,kits:18,perKit:4/18,offsetX:20,offsetY:20,marginText:'20 мм с каждой стороны',items:Array.from({length:72},(_,i)=>({x:i%8*303,y:Math.floor(i/8)*160,w:303,h:160,type:i%4<2?'L':'P',kit:Math.floor(i/4)+1}))}}
await mkdir('tmp/pdfs',{recursive:true})
// Scene image is a fixture here; WebGL capture is handled by GridScene in the app.
const fixture=createCanvas(1600,1000);const ctx=fixture.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1600,1000);ctx.fillStyle='#bda06d';ctx.fillRect(400,300,800,400)
for(const [name,keys] of [['drawing-pages',['plan','strips','layout']],['all-pages',['plan','scene','strips','layout']],['single-page',['strips']]]) {
  const pdf=await buildPdf(model,keys,fixture.toDataURL())
  assert.equal(pdf.getNumberOfPages(),keys.length)
  assert.equal(Math.round(pdf.internal.pageSize.getWidth()),297)
  await writeFile(`tmp/pdfs/${name}.pdf`,Buffer.from(pdf.output('arraybuffer')))
}
await assert.rejects(buildPdf(model,[]),/Выберите/)
await assert.rejects(buildPdf({...model,layout:null},['layout']),/нет раскладки/)
await assert.rejects(buildPdf({...model,rows:1.5},['plan']),/целое/)
console.log('PDF checks passed: 4/3/1 pages, A4 landscape, selection and validation.')
