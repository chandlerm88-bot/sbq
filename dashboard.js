(function(){
const $=id=>document.getElementById(id), cloud=window.QuestCloud;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent=(n,d)=>d?Math.round(100*n/d)+'%':'—';
const fmtTime=n=>Math.floor(n/3600)+'h '+Math.floor((n%3600)/60)+'m';
window.initDashboard=async function(){
 try{const {data,error}=await cloud.client.rpc('quest_players');if(error)throw error;
 const sel=$('studentSelect');sel.replaceChildren(new Option('Choose Noah’s account',''));
 (data||[]).filter(p=>p.user_id!==cloud.uid).forEach(p=>sel.add(new Option(p.username,p.user_id)));
 if(sel.options.length===2){sel.selectedIndex=1;loadDashboard()}
 }catch(e){$('dashboard').textContent='Dashboard setup needed: '+e.message}
};
async function allRows(table,user){let out=[],start=0;for(;;){const {data,error}=await cloud.client.from(table).select('*').eq('user_id',user).order(table==='answer_events'?'answered_at':'recorded_at',{ascending:false}).range(start,start+999);if(error)throw error;out.push(...data);if(data.length<1000||out.length>=20000)break;start+=1000}return out}
async function loadDashboard(){const user=$('studentSelect').value;if(!user)return;const area=$('dashboard');area.textContent='Loading progress…';try{
const [answers,sessions,saveResp]=await Promise.all([allRows('answer_events',user),allRows('play_sessions',user),cloud.client.from('player_saves').select('save_data,updated_at').eq('user_id',user).maybeSingle()]);if(saveResp.error)throw saveResp.error;
const total=answers.length,correct=answers.filter(x=>x.correct).length,seconds=sessions.reduce((n,x)=>n+(x.seconds||0),0),cats={};
for(const a of answers){const c=a.category||'General Knowledge';cats[c]??={count:0,correct:0};cats[c].count++;cats[c].correct+=Number(a.correct)}
const entries=Object.entries(cats).sort((a,b)=>b[1].count-a[1].count);
const d=saveResp.data?.save_data||{};const g=d.noah_scholars_quest_adventure_v1||{};const pet=d.scholars_quest_creature_v1||{};
const stats=[['Questions answered',total],['Correct answers',correct],['Accuracy',percent(correct,total)],['Game time tracked',fmtTime(seconds)],['Coins',g.coins??'—'],['XP',g.xp??'—']];
const cards=stats.map(([k,v])=>`<div style="background:#0d1d3c;border:1px solid #466299;border-radius:12px;padding:14px;min-width:140px;flex:1"><small>${safe(k)}</small><div style="font-size:27px;font-weight:900">${safe(v)}</div></div>`).join('');
const categories=entries.length?entries.map(([name,v])=>`<tr><td>${safe(name)}</td><td>${v.count}</td><td>${v.correct}</td><td>${percent(v.correct,v.count)}</td><td><div style="background:#283c67;border-radius:8px;height:9px"><div style="width:${Math.round(100*v.correct/v.count)}%;background:#86dcbb;border-radius:8px;height:9px"></div></div></td></tr>`).join(''):'<tr><td colspan="5">No recorded answers yet.</td></tr>';
const recent=answers.slice(0,100).map(a=>`<tr><td>${safe(new Date(a.answered_at).toLocaleString())}</td><td>${safe(a.category)}</td><td>${safe(a.question_text)}</td><td>${a.correct?'✅ Correct':'❌ Missed'}</td></tr>`).join('');
const daily={};for(const a of answers){const day=a.answered_at.slice(0,10);daily[day]??={n:0,c:0};daily[day].n++;daily[day].c+=Number(a.correct)}
const trends=Object.entries(daily).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14).map(([day,v])=>`<tr><td>${day}</td><td>${v.n}</td><td>${percent(v.c,v.n)}</td></tr>`).join('');
area.innerHTML=`<div class="row" style="margin:16px 0">${cards}</div><p class="muted">Creature: ${safe(pet.name||'Not hatched / not yet synced')} • Last save: ${safe(saveResp.data?.updated_at?new Date(saveResp.data.updated_at).toLocaleString():'Not yet saved')}</p><h3>Accuracy by subject</h3><div style="overflow:auto"><table style="width:100%;border-collapse:collapse;text-align:left"><thead><tr><th>Subject</th><th>Answered</th><th>Correct</th><th>Rate</th><th>Visual</th></tr></thead><tbody>${categories}</tbody></table></div><h3>Daily study results (last 14 active days)</h3><div style="overflow:auto"><table style="width:100%;text-align:left"><thead><tr><th>Date</th><th>Questions</th><th>Accuracy</th></tr></thead><tbody>${trends||'<tr><td colspan="3">No activity yet.</td></tr>'}</tbody></table></div><h3>Question-by-question history (latest 100)</h3><div style="overflow:auto;max-height:430px"><table style="width:100%;text-align:left"><thead><tr><th>Time</th><th>Subject</th><th>Question</th><th>Result</th></tr></thead><tbody>${recent||'<tr><td colspan="4">No answers yet.</td></tr>'}</tbody></table></div><p class="muted">Time counts active browser intervals while the game is visible; it is an estimate, not guaranteed attention or study time. Self-graded tournament answers reflect the player's own marking. Tracking begins with this edition; earlier activity is not backfilled.</p>`;
}catch(e){area.textContent='Could not load dashboard: '+e.message}}
$('loadDashboard').onclick=loadDashboard;$('studentSelect').onchange=loadDashboard;
})();
