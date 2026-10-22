try {
  const r=await fetch('http://127.0.0.1:3000/health/ready',{signal:AbortSignal.timeout(5000),redirect:'error'});
  if(!r.ok || (await r.json()).status!=='ok')process.exitCode=1;
}catch{process.exitCode=1;}
