const{Pool}=require('pg');const p=new Pool({connectionString:'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway'});
(async()=>{
  const r=await p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_id'");
  console.log(r.rows);
  p.end();
})();
