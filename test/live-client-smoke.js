const end=performance.now()+80000;
while(!window.PokeBonkAFK?.status().connected&&performance.now()<end)await new Promise(r=>setTimeout(r,300));
const status=window.PokeBonkAFK?.status();
await new Promise(r=>setTimeout(r,900));
return {connected:!!status?.connected,status,gameBuild:document.querySelector('meta[name="pokebonk-build"]')?.content,desktop:window.pokebonkDesktop?.version,enabled:status?.enabled,screen:document.querySelector('#ui')?.textContent?.slice(0,700)};
