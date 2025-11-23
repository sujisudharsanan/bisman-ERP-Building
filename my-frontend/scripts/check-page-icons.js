(async()=>{
  try{
    const reg = await import('../src/common/config/page-registry.ts');
    const PAGE_REGISTRY = reg.PAGE_REGISTRY || reg.default;
    if(!PAGE_REGISTRY) { console.error('PAGE_REGISTRY not found'); process.exit(2); }
    const bad = [];
    for(const p of PAGE_REGISTRY){
      const icon = p.icon;
      if(icon === undefined || icon === null) bad.push({id:p.id, name:p.name, icon});
      else if(typeof icon !== 'function' && typeof icon !== 'object') bad.push({id:p.id, name:p.name, iconType: typeof icon});
    }
    console.log('Total pages:', PAGE_REGISTRY.length);
    console.log('Bad icons count:', bad.length);
    if(bad.length) console.log(JSON.stringify(bad,null,2));
    process.exit(bad.length?1:0);
  }catch(e){
    console.error('ERR', e && e.message);
    process.exit(2);
  }
})();
