(function(){
 const cfg=window.QUEST_CONFIG||{};
 const ready=!!(cfg.supabaseUrl?.startsWith('https://') && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.startsWith('PASTE_'));
 const client=ready&&window.supabase?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}}):null;
 const email=(username)=>username.toLowerCase().trim()+'@'+(cfg.usernameDomain||'players.scholarsbowl.invalid');
 const validUser=u=>/^[a-z][a-z0-9_]{2,19}$/.test(u);
 const validPin=p=>/^\d{8,12}$/.test(p);
 const localKeys=['noah_scholars_quest_adventure_v1','scholars_quest_creature_v1'];
 const cloud={client,ready,email,validUser,validPin,uid:null,username:null,packs:[],onProgress:null,lastSyncedAt:null,
  async login(username,pin,register=false){
   username=username.toLowerCase().trim();
   if(!validUser(username))throw Error('Use 3–20 lowercase letters, numbers, or underscores; start with a letter.');
   if(!validPin(pin))throw Error('Use a private 8–12 digit PIN.');
   if(!client)throw Error('Supabase is not configured yet. See README.');
   const result=register?await client.auth.signUp({email:email(username),password:pin,options:{data:{username}}}):await client.auth.signInWithPassword({email:email(username),password:pin});
   if(result.error)throw result.error;
   if(!result.data.session)throw Error('Account requires confirmation. Disable email confirmation only for private testing; use verified email for public launch.');
   this.uid=result.data.user.id;this.username=username;
   return result.data.user;
  },
  async restore(){if(!client)return null;const {data}=await client.auth.getUser();if(!data.user)return null;this.uid=data.user.id;this.username=data.user.user_metadata?.username||'Player';return data.user},
  async logout(){if(client)await client.auth.signOut();this.uid=null;this.username=null;this.packs=[];},
  async loadProgress(){if(!client||!this.uid)return;const {data,error}=await client.from('player_saves').select('save_data,updated_at').eq('user_id',this.uid).maybeSingle();if(error)throw error;this.lastSyncedAt=data?.updated_at||null;const d=data?.save_data||{};for(const k of localKeys){if(d[k]!=null)localStorage.setItem(k,JSON.stringify(d[k]));}},
  async saveProgress(){if(!client||!this.uid)return;
   const {data:remote,error:checkErr}=await client.from('player_saves').select('updated_at').eq('user_id',this.uid).maybeSingle();
   if(!checkErr&&remote?.updated_at&&this.lastSyncedAt&&new Date(remote.updated_at).getTime()>new Date(this.lastSyncedAt).getTime()+1500){
     throw Error('Another device saved more recently. To protect that progress, this device did not overwrite it. Reload this page to load the latest save, then retry.');
   }
   const d={};for(const k of localKeys){try{d[k]=JSON.parse(localStorage.getItem(k)||'null')}catch{d[k]=null}}
   const ts=new Date().toISOString();
   const {error}=await client.from('player_saves').upsert({user_id:this.uid,save_data:d,updated_at:ts});if(error)throw error;this.lastSyncedAt=ts;},
  async getPacks(){if(!client)return[];const {data,error}=await client.from('question_packs').select('id,title,questions,updated_at').eq('published',true).order('updated_at',{ascending:false});if(error)throw error;this.packs=data||[];return this.packs},
  getQuestions(){return this.packs.flatMap(p=>(Array.isArray(p.questions)?p.questions:[]).map(q=>({...q,source:q.source||p.title})))},
  async isAdmin(){if(!client||!this.uid)return false;const {data,error}=await client.from('admins').select('user_id').eq('user_id',this.uid).maybeSingle();if(error)throw error;return !!data},
  async ticketBalance(){if(!client||!this.uid)return null;const {data,error}=await client.rpc('quest_ticket_balance');if(error)throw error;const r=Array.isArray(data)?data[0]:data;return r||{earned:0,spent:0,adjusted:0,balance:0}},
  async spendTicket(game){if(!client||!this.uid)throw Error('Not connected');const {data,error}=await client.rpc('quest_spend_ticket',{game});if(error)throw error;return data},
  async listPacks(){const {data,error}=await client.from('question_packs').select('*').order('updated_at',{ascending:false});if(error)throw error;return data||[]},
  async upsertPack(pack){const {data,error}=await client.from('question_packs').upsert(pack).select().single();if(error)throw error;return data},
  async deletePack(id){const {error}=await client.from('question_packs').delete().eq('id',id);if(error)throw error;}
 };
 window.QuestCloud=cloud;
})();
