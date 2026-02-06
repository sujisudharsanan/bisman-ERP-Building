const{Pool}=require('pg');const p=new Pool({connectionString:'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway'});
(async()=>{
  const r=await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='users'");
  console.log(r.rows.map(x=>x.column_name).join(', '));
  p.end();
})();
