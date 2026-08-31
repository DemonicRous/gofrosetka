// Renders the PDF fixture only: no interaction with the user's browser or project UI.
import {createRequire} from 'node:module'
import {writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
try {
  const page=await browser.newPage({viewport:{width:1400,height:1100}})
  page.on('pageerror',e=>console.error(e.message))
  await page.goto('http://127.0.0.1:5174/scripts/pdf-render-test.html')
  await page.waitForFunction(()=>window.renderResult?.status!=='loading'&&window.renderResult?.status,{timeout:60000})
  const result=await page.evaluate(()=>window.renderResult)
  assert.equal(result.status,'ready',result.message);assert.equal(result.pages,3)
  await writeFile('tmp/pdfs/browser-export.pdf',Buffer.from(result.pdf,'base64'))
  await writeFile('tmp/pdfs/scene.png',Buffer.from(result.image,'base64'))
  console.log('Real WebGL capture and browser PDF generation passed.')
} finally {await browser.close()}
