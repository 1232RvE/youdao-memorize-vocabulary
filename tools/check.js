const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');let failures=0;
function check(ok,msg){console.log((ok?'PASS ':'FAIL ')+msg);if(!ok)failures++;}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const appJson=JSON.parse(fs.readFileSync(path.join(root,'src/app.json'),'utf8'));
check(/^800\d{13}$/.test(pkg.appid),'package appid configured: '+pkg.appid);
check(appJson.appid===pkg.appid,'app.json appid matches package.json');
check(!!appJson.pages.index,'index page registered in app.json');
check(fs.existsSync(path.join(root,'src',appJson.pages.index)),'index page entry file exists');
check(appJson.entryPage==='index','entryPage is index');
const dictDir=path.join(root,'src/assets/dicts');let total=0;
for(const f of fs.readdirSync(dictDir).filter(x=>x.endsWith('.json'))){
  const d=JSON.parse(fs.readFileSync(path.join(dictDir,f),'utf8'));
  check(Array.isArray(d.words)&&d.words.length>0,f+' has words');
  check(d.words.every(w=>w.word&&w.translation!==undefined),f+' records normalized');
  total+=d.words.length;
}
check(total===4007,'all dictionary entries exported (got '+total+')');
const vue=fs.readFileSync(path.join(root,'src/pages/index/index.vue'),'utf8');
for(const token of ['beginStudy','beginReview','chooseDict','answer(i)','chooseStudy','submitStudy','onUnload'])check(vue.includes(token),'UI contract '+token);
// Weex 只支持单类选择器：禁止出现能被构建器丢弃的复合/后代选择器
const styleBlock=(vue.match(/<style[^>]*>([\s\S]*?)<\/style>/)||[])[1]||'';
const badSelectors=[...styleBlock.matchAll(/(^|[},])\s*([.#][A-Za-z][\w-]*(?:\s*[.#][A-Za-z][\w-]*)+)\s*\{/g)].map(m=>m[2]);
check(badSelectors.length===0,'no dropped Weex selectors'+(badSelectors.length?' -> '+badSelectors.join(', '):''));
const engine=fs.readFileSync(path.join(root,'src/services/engine.js'),'utf8');
check(engine.includes('e.startStudy')&&engine.includes('e.startReview')&&engine.includes('e.submitStudy'),'study engine actions');
// 学习会话必须可终止：反复答错同一个词时不得无限循环
(function(){
  let src=engine.replace(/^export function/m,'function');
  let createEngine;
  try{ createEngine = new Function(src+'; return createEngine;')(); }
  catch(e){ check(false,'engine evaluates: '+e.message); return; }
  let worstFail=0;
  for(let t=0;t<30;t++){
    const dict={id:'d1',name:'t',words:Array.from({length:30},(_,i)=>({id:i+1,word:'w'+i,translation:'t'+i}))};
    const e=createEngine([dict],{dictId:'d1',batchSize:6},()=>{});
    e.startStudy();
    const hard=new Set(e.queue.slice(0,1).map(w=>w.id)); // 只有一个词始终『不认识』
    let g=0;
    while(e.page!=='summary'&&g<3000){g++; e.chooseStudyRating(hard.has(e.current.id)?1:0); e.submitStudy();}
    if(g>=3000)worstFail++;
  }
  check(worstFail===0,'study session terminates when one word is always unknown (failed '+worstFail+'/30)');
})();
// base.less 必须存在(被 index.vue @import)
check(fs.existsSync(path.join(root,'src/styles/base.less')),'styles/base.less exists');

// 释义里不得残留字面反斜杠转义(笔上会原样显示成 "\n")
(function(){
  let bad=0;
  for(const f of fs.readdirSync(dictDir).filter(x=>x.endsWith('.json'))){
    const d=JSON.parse(fs.readFileSync(path.join(dictDir,f),'utf8'));
    for(const w of d.words){ if((w.translation||'').indexOf('\\')>=0||(w.definition||'').indexOf('\\')>=0) bad++; }
  }
  check(bad===0,'dictionary text has no literal escapes (found '+bad+')');
})();

// 禁用固定 px 字号：全部使用视口单位
(function(){
  const walk=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    if(e.isDirectory())return walk(p);
    return /\.(vue|less|js|json)$/.test(e.name)?[p]:[];
  });
  const offenders=[];
  for(const f of walk(path.join(root,'src'))){
    if(/dicts[\\/].*\.json$/.test(f))continue;
    const txt=fs.readFileSync(f,'utf8');
    if(/[0-9.]+px\b/.test(txt))offenders.push(path.relative(root,f));
  }
  check(offenders.length===0,'no fixed px units in sources'+(offenders.length?' -> '+offenders.join(', '):''));
})();

// 禁用 Emoji：笔上没有 emoji 字体，会出现方块
(function(){
  const re=/[\u2190-\u21FF\u2600-\u27BF\u2B00-\u2BFF\uFE0F]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDFFF]/;
  const walk=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    if(e.isDirectory())return walk(p);
    return /\.(vue|less|js|json)$/.test(e.name)?[p]:[];
  });
  const offenders=[];
  for(const f of walk(path.join(root,'src'))){ if(re.test(fs.readFileSync(f,'utf8')))offenders.push(path.relative(root,f)); }
  check(offenders.length===0,'no emoji glyphs in sources'+(offenders.length?' -> '+offenders.join(', '):''));
})();
if(failures)process.exit(1);console.log('All static checks passed.');
