(async function(){
  try{
    const mod = await import('../src/common/config/page-registry');
    const registry = (mod as any).PAGE_REGISTRY ?? (mod as any).default ?? (mod as any);
    if(!registry) return console.error('No PAGE_REGISTRY found');
    const bad = [] as any[];
    for(const p of registry){
      const icon = p.icon;
      const ok = typeof icon === 'function' || (icon && typeof icon === 'object') || Boolean(icon);
      // More strict: ensure icon has a render or prototype
      const isComponent = typeof icon === 'function' || (icon && (((icon as any).render) || ((icon as any).displayName)));
      if(!isComponent){
        bad.push({ id: p.id, name: p.name, icon });
      }
    }
    if(bad.length){
      console.log('Pages with invalid/missing icons:');
      bad.forEach(b=>console.log('-', b.id, '|', b.name, '| icon=', String(b.icon)));
      process.exit(0);
    }
    console.log('All pages have icon references. Total:', registry.length);
  }catch(e){
    console.error('Error checking registry:', e);
    process.exit(2);
  }
})();
