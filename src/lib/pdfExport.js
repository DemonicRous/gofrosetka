// Browser-only PDF rendering. Cyrillic is rasterized with the browser font at 200+ dpi.
const W = 2376, H = 1680, M = 100
const fmt = n => Number(n.toFixed(2)).toLocaleString('ru-RU')
function text(c, value, x, y, size = 26, weight = 400, align = 'left') {
  c.fillStyle = '#26332b'; c.font = `${weight} ${size}px Arial, sans-serif`; c.textAlign = align
  c.fillText(value, x, y)
}
function line(c, x1, y1, x2, y2) {
  c.strokeStyle = '#5a695f'; c.lineWidth = 2; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke()
}
function dimension(c, x1, y1, x2, y2, label) {
  c.save(); c.translate(x1,y1); c.rotate(Math.atan2(y2-y1,x2-x1))
  const length = Math.hypot(x2-x1,y2-y1)
  line(c,0,0,length,0)
  c.fillStyle = '#5a695f'
  for (const [x,d] of [[0,1],[length,-1]]) { c.beginPath(); c.moveTo(x,0); c.lineTo(x+d*12,-5); c.lineTo(x+d*12,5); c.closePath(); c.fill() }
  text(c,label,length/2,-12,24,400,'center'); c.restore()
}
export function validatePdfModel(m) {
  if (![m.length,m.width,m.height,m.gridHeight,m.stripL,m.stripW,m.board].every(n => Number.isFinite(n) && n > 0)
    || ![m.rows,m.cols].every(n => Number.isInteger(n) && n >= 1 && n <= 30)) throw new Error('Проверьте размеры и целое количество рядов и колонок (1–30).')
}
function basePage(title,m,index,total) {
  const canvas = document.createElement('canvas'); canvas.width=W; canvas.height=H
  const c = canvas.getContext('2d'); c.fillStyle='#fff'; c.fillRect(0,0,W,H)
  text(c,'ГОФРОСЕТКА / ТЕХНИЧЕСКИЙ ПРОЕКТ',M,70,22,700)
  text(c,title,M,142,48,700)
  text(c,`${m.cols} × ${m.rows} · ${m.rows*m.cols} ячеек  |  ${m.methodLabel}  |  профиль ${m.profile}, ${fmt(m.board)} мм`,M,198)
  line(c,M,226,W-M,226)
  text(c,`Продукт ${fmt(m.length)} × ${fmt(m.width)} × ${fmt(m.height)} мм   ·   Ячейка ${fmt(m.cellL)} × ${fmt(m.cellW)} мм`,M,276)
  text(c,`Короб внутри ${fmt(m.boxL)} × ${fmt(m.boxW)} × ${fmt(m.boxH)} мм   ·   Высота решётки ${fmt(m.gridHeight)} мм`,M,320)
  line(c,M,H-100,W-M,H-100)
  text(c,'Размеры в мм. Масштаб вписан в лист, не 1:1. Перед производством согласовать допуски.',M,H-54,22)
  text(c,`${index} / ${total}`,W-M,H-54,24,700,'right')
  return {canvas,c}
}
function drawPlan(c,m) {
  const scale = Math.min(1900/m.stripL,970/m.stripW), w=m.stripL*scale,h=m.stripW*scale
  const x=(W-w)/2,y=400+(1040-h)/2
  c.fillStyle='#f7f4ec'; c.fillRect(x,y,w,h); c.strokeStyle='#69766d'; c.lineWidth=2; c.strokeRect(x,y,w,h)
  c.fillStyle='#c1a269'
  for(const pos of m.longSlots) c.fillRect(x+(pos-m.board/2)*scale,y,Math.max(2,m.board*scale),h)
  for(const pos of m.crossSlots) c.fillRect(x,y+(pos-m.board/2)*scale,w,Math.max(2,m.board*scale))
  if(m.cols*m.rows <= 144) for(let r=0;r<m.rows;r++) for(let col=0;col<m.cols;col++) text(c,`${r*m.cols+col+1}`,x+(col+.5)*w/m.cols,y+(r+.5)*h/m.rows+8,22,400,'center')
  dimension(c,x,y+h+50,x+w,y+h+50,`${fmt(m.stripL)} мм`)
  dimension(c,x-48,y+h,x-48,y,`${fmt(m.stripW)} мм`)
  text(c,`Габарит решётки ${fmt(m.stripL)} × ${fmt(m.stripW)} мм. Короб: +5 мм к каждой длине полосы.`,M,1520,24)
}
function drawStrip(c,m,{length,slots,quantity,title,top},panelY) {
  text(c,`${title} · ${quantity} шт. · ${fmt(length)} × ${fmt(m.gridHeight)} мм`,M,panelY,30,700)
  text(c,`Просечка: ширина ${fmt(m.slot)} мм, глубина ${fmt(m.slotDepth)} мм (H/2 + 5)`,M,panelY+42,24)
  if(!quantity) { text(c,'Полосы этого типа в комплекте отсутствуют.',M,panelY+130); return }
  const scale=Math.min(2000/length,230/m.gridHeight),w=length*scale,h=m.gridHeight*scale,x=(W-w)/2,y=panelY+124
  const points=[0,...slots,length]
  c.font='400 24px Arial, sans-serif'
  const chainFits=slots.length<=12&&points.slice(1).every((p,i)=>(p-points[i])*scale>c.measureText(fmt(p-points[i])).width+24)
  const indicesFit=points.slice(1).every((p,i)=>(p-points[i])*scale>32)
  c.fillStyle=top?'#e1c58c':'#d8b877';c.fillRect(x,y,w,h);c.strokeStyle='#6a5735';c.lineWidth=2;c.strokeRect(x,y,w,h)
  slots.forEach((pos,i)=>{
    const cx=x+pos*scale,sw=m.slot*scale,depth=m.slotDepth*scale,sy=top?y:y+h-depth
    c.fillStyle='#fff';c.fillRect(cx-sw/2,sy,sw,depth);c.strokeRect(cx-sw/2,sy,sw,depth)
    c.setLineDash([6,5]);line(c,cx,y-7,cx,y+h+10);c.setLineDash([])
    if(!chainFits&&indicesFit) text(c,`${i+1}`,cx,y+h+40,20,400,'center')
  })
  dimension(c,x,y-22,x+w,y-22,`${fmt(length)} мм`)
  dimension(c,x-40,y+h,x-40,y,`${fmt(m.gridHeight)} мм`)
  if(chainFits) {
    for(let i=0;i<points.length-1;i++) dimension(c,x+points[i]*scale,y+h+48,x+points[i+1]*scale,y+h+48,fmt(points[i+1]-points[i]))
  }
  text(c,'Центры просечек от левого края, мм:',M,panelY+440,23,700)
  if(!slots.length) text(c,'Без просечек',M,panelY+478,23)
  for(let i=0;i<slots.length;i+=10) text(c,slots.slice(i,i+10).map((p,j)=>`${i+j+1}: ${fmt(p)}`).join('   |   '),M,panelY+478+Math.floor(i/10)*32,22)
}
function drawLayout(c,m) {
  const l=m.layout,scale=Math.min(1830/l.sheetW,930/l.sheetH),w=l.sheetW*scale,h=l.sheetH*scale,x=(W-w)/2,y=455+(930-h)/2
  text(c,`${l.title} · лист ${l.sheetW} × ${l.sheetH} мм · ${l.kits} полных комплектов`,M,385,30,700)
  c.fillStyle='#f5f3ed';c.fillRect(x,y,w,h);c.strokeStyle='#536459';c.strokeRect(x,y,w,h)
  for(const item of l.items) {
    const ix=x+(item.x+l.offsetX)*scale,iy=y+(item.y+l.offsetY)*scale,iw=item.w*scale,ih=item.h*scale
    c.fillStyle=item.type==='L'?'#d8b877':'#e1c58c';c.fillRect(ix,iy,iw,ih);c.strokeStyle='#7f6c48';c.lineWidth=1;c.strokeRect(ix,iy,iw,ih)
    if(iw>65&&ih>25) text(c,`${item.type==='L'?'ПР':'ПО'} · ${item.kit}`,ix+iw/2,iy+ih/2+7,18,400,'center')
  }
  dimension(c,x,y+h+42,x+w,y+h+42,`${l.sheetW} мм · против гофры`)
  dimension(c,x-45,y+h,x-45,y,`${l.sheetH} мм · по гофре`)
  dimension(c,x+w+55,y+20,x+w+55,y+240,'ГОФРА / ПОДАЧА')
  text(c,`Поля: ${l.marginText}`,M,1480,24)
  const sheetArea=l.sheetW*l.sheetH/1e6
  text(c,`Площадь на комплект: ${fmt(sheetArea)} м² / ${l.kits} = ${l.perKit.toFixed(4)} м².  ПР - продольная, ПО - поперечная.`,M,1525,24)
}
export async function buildPdf(m,selected,sceneImage) {
  validatePdfModel(m)
  const keys=['plan','scene','strips','layout'].filter(k=>selected.includes(k))
  if(!keys.length) throw new Error('Выберите хотя бы одну страницу.')
  if(keys.includes('layout')&&!m.layout) throw new Error('Для текущих параметров нет раскладки листа.')
  const {jsPDF}=await import('jspdf')
  const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true})
  pdf.setProperties({title:`Gofrosetka ${m.cols}x${m.rows}`,author:'Gofrosetka',subject:'Grid technical drawings'})
  const titles={plan:'Чертёж решётки / вид сверху',scene:'3D-модель / общий вид',strips:'Развёртка комплекта решётки',layout:'Раскладка листа'}
  for(let i=0;i<keys.length;i++) {
    const key=keys[i],{canvas,c}=basePage(titles[key],m,i+1,keys.length)
    if(key==='plan') drawPlan(c,m)
    if(key==='strips') {
      drawStrip(c,m,{length:m.stripL,slots:m.longSlots,quantity:m.rows-1,title:'Продольная полоса',top:false},395)
      drawStrip(c,m,{length:m.stripW,slots:m.crossSlots,quantity:m.cols-1,title:'Поперечная полоса',top:true},990)
    }
    if(key==='layout') drawLayout(c,m)
    if(key==='scene') {
      if(!sceneImage) throw new Error('Не удалось получить 3D-модель. Попробуйте экспорт без этой страницы.')
      const image=new Image();image.src=sceneImage;await image.decode()
      const s=Math.min((W-2*M)/image.width,1150/image.height),w=image.width*s,h=image.height*s
      c.drawImage(image,(W-w)/2,365+(1150-h)/2,w,h)
    }
    if(i) pdf.addPage('a4','landscape')
    pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,297,210,undefined,'FAST')
    canvas.width=1;canvas.height=1
  }
  return pdf
}
