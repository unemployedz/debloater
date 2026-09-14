export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  const hook=process.env.WEBHOOK_URL;
  if(!hook)return res.status(503).json({error:'WEBHOOK_URL is not configured'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    const files=Array.isArray(body.files)?body.files:[];
    const event=String(body.event||'media_event');
    const title=event==='media_downloaded'?'⬇️ Debloater — Media Downloaded':event==='media_resolved'?'🔎 Debloater — Media Resolved':event==='download_attempt'?'⚠️ Debloater — Download Attempt':'🧼 Debloater — Media Cleaned';
    const description=event==='media_downloaded'?'A media file was saved from the downloader.':event==='media_resolved'?'A TikTok/media URL was resolved.':event==='download_attempt'?'A browser blocked a direct media save.':'A media item was processed.';
    const embed={title,description,color:event==='download_attempt'?0xff9f43:0x4d8dff,fields:[
      {name:'Event',value:event.slice(0,1024),inline:true},
      {name:'Source',value:String(body.source||'Unknown').slice(0,1024),inline:true},
      {name:'Watermark',value:body.watermarkRemoval?'No-watermark source':'Not removed',inline:true},
      {name:'Files',value:String(files.length),inline:true},
      ...files.slice(0,8).map(f=>({name:f.name||'media file',value:`${f.type||'media'} · ${f.size||0} bytes${f.url?`\n[Open media](${f.url})`:''}`,inline:false}))
    ],footer:{text:'Debloater'},timestamp:body.timestamp||new Date().toISOString()};
    const response=await fetch(hook,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'Debloater',embeds:[embed],allowed_mentions:{parse:[]}})});
    if(!response.ok)throw new Error(`Webhook returned ${response.status}`);
    return res.status(200).json({ok:true});
  }catch(error){return res.status(502).json({error:error?.message||'Webhook failed'})}
}
