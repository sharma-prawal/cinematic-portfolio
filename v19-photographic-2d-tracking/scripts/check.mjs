import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const root=new URL('../report/',import.meta.url).pathname;
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1672,height:1051},deviceScaleFactor:1});
page.on('pageerror',e=>console.log('PAGE ERROR',String(e)));
await page.goto('http://127.0.0.1:61919/?method=static');
await page.waitForFunction(()=>window.__v19.ready);
await page.locator('canvas').screenshot({path:root+'native-neutral.png'});
for(const m of ['a','b']){
 await page.getByRole('button',{name:`Method ${m.toUpperCase()}`,exact:true}).click();
 await page.mouse.move(1580,120);await page.waitForTimeout(700);
 await page.screenshot({path:root+`initial-${m}-upper-right.png`});
}
await fs.writeFile(root+'initial-metrics.json',JSON.stringify(await page.evaluate(()=>window.__v19.metrics()),null,2));
await browser.close();
