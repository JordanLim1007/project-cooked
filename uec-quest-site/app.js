const subjects = [
  {id:'physics',icon:'⚛️',name:'物理 Physics',desc:'Past Year 已导入',progress:38,ready:true},
  {id:'chem',icon:'🧪',name:'化学 Chemistry',desc:'等待导入 PDF',progress:0},
  {id:'math1',icon:'∫',name:'高数 I',desc:'等待导入 PDF',progress:0},
  {id:'math2',icon:'⃗',name:'高数 II',desc:'等待导入 PDF',progress:0},
  {id:'english',icon:'Aa',name:'英文 English',desc:'等待导入 PDF',progress:0},
  {id:'chinese',icon:'文',name:'华文 Chinese',desc:'等待导入 PDF',progress:0}
];

const questions = [
  {id:'2025-1',year:2025,qno:1,topic:'Kinematics',q:'A particle has a triangular v–t graph: from 0 to 1 s its velocity rises uniformly from 0 to 1 m s⁻¹; from 1 to 3 s it falls uniformly back to 0. Which quantity is the same over the intervals 0–1 s and 1–3 s?',o:['Displacement','Acceleration','Average speed','Change in momentum'],a:2,e:'Average speed = area under the v–t graph ÷ time. First interval: ½×1×1 / 1 = 0.5 m s⁻¹. Second: ½×2×1 / 2 = 0.5 m s⁻¹.'},
  {id:'2025-2',year:2025,qno:2,topic:'Forces',q:'A helicopter is rising vertically at constant velocity. What is the resultant force acting on it?',o:['Zero','Its weight downward','A larger upward force','Depends on its speed'],a:0,e:'Constant velocity means acceleration is zero. By F = ma, the resultant force is therefore zero.'},
  {id:'2025-4',year:2025,qno:4,topic:'Circular motion',q:'A conical pendulum moves in a horizontal circle. Which actual forces act on the pendulum ball?',o:['Weight and tension only','Weight and centripetal force','Tension and centripetal force','Weight, tension and an extra centripetal force'],a:0,e:'“Centripetal force” is not an extra force. It is the inward resultant of real forces. The real forces here are weight and string tension.'},
  {id:'2025-5',year:2025,qno:5,topic:'Momentum',q:'A 2 kg object moves right at 4 m s⁻¹, then later moves left at 10 m s⁻¹. Taking right as positive, what is its change in momentum?',o:['+20 kg m s⁻¹','+12 kg m s⁻¹','−12 kg m s⁻¹','−28 kg m s⁻¹'],a:3,e:'Δp = m(v−u) = 2[−10−(+4)] = −28 kg m s⁻¹.'},
  {id:'2025-6',year:2025,qno:6,topic:'Gravitation',q:'Given Earth radius R, surface gravitational acceleration g and gravitational constant G, which expression gives Earth’s average density?',o:['3g/(4πR²G)','3g/(4πRG)','g/(RG)','g/(R²G)'],a:1,e:'g = GM/R² ⇒ M = gR²/G. Density = M/(4πR³/3) = 3g/(4πRG).'},
  {id:'2025-7',year:2025,qno:7,topic:'Energy',q:'A motorcyclist moves around a vertical circular track of radius 6 m. If the speed at the top is 8 m s⁻¹ and g = 10 m s⁻², what is the speed at the bottom?',o:['11.2 m s⁻¹','13.5 m s⁻¹','15.3 m s⁻¹','17.3 m s⁻¹'],a:3,e:'Energy conservation over a height change 2R: ½mv_b² = ½mv_t² + mg(2R). So v_b² = 8² + 4(10)(6) = 304, giving ≈17.4 m s⁻¹.'},
  {id:'2025-8',year:2025,qno:8,topic:'Fluids',q:'Pressure in a liquid increases linearly from 0 Pa at depth 0 to 3000 Pa at 0.40 m. Taking g = 10 m s⁻², what is the liquid density?',o:['600 kg m⁻³','750 kg m⁻³','5900 kg m⁻³','7500 kg m⁻³'],a:1,e:'p = ρgh. The gradient p/h = 3000/0.40 = 7500 Pa m⁻¹ = ρg, so ρ = 750 kg m⁻³.'},

  {id:'2023-1',year:2023,qno:1,topic:'Newton’s laws',q:'Three identical objects move with different initial velocities on a smooth horizontal surface. The same acceleration is to be produced in each. Which requires the greatest applied force?',o:['The stationary object','The slower moving object','The faster moving object','All require the same force'],a:3,e:'All have the same mass and need the same acceleration. F = ma, so the required force is the same; initial velocity does not matter.'},
  {id:'2023-2',year:2023,qno:2,topic:'Moments',q:'A uniform ladder rests against a smooth vertical wall and rough horizontal floor. Its foot is 2a from the wall and its top is height h. Taking moments about the top contact A, which relation is correct?',o:['Wa + F_B h = 2Na','F_A a + Wa = F_B h','Wa + 2Na = F_B h','Wa − 2Na = 2F_B h'],a:0,e:'About A: the normal reaction N at B gives moment 2Na one way; W at the midpoint gives Wa and friction F_B gives F_Bh the opposite way. Equilibrium gives Wa + F_Bh = 2Na.'},
  {id:'2023-3',year:2023,qno:3,topic:'Gravitation',q:'Using Earth radius 6400 km, mass 6.0×10²⁴ kg and G = 6.67×10⁻¹¹ N m² kg⁻², what is the apparent weight of an 80 kg person at the equator (including Earth’s rotation)?',o:['788 N','784 N','782 N','779 N'],a:3,e:'Gravitational force is about 781.6 N. Earth’s rotation requires centripetal force mω²R ≈ 2.7 N, so apparent weight ≈ 778.9 N ≈ 779 N.'},
  {id:'2023-4',year:2023,qno:4,topic:'Springs',q:'A bead is pulled distance x sideways from the midpoint between two identical springs, each of natural length L and spring constant k. Which expression gives the required horizontal force?',o:['kx(1−L/√(x²+L²))','kx(1+L/√(x²+L²))','2kx(1−L/√(x²+L²))','2kx(1+L/√(x²+L²))'],a:2,e:'Each spring extends by √(x²+L²)−L. The horizontal component from both springs gives 2k(√(x²+L²)−L)·x/√(x²+L²) = 2kx(1−L/√(x²+L²)).'},
  {id:'2023-5',year:2023,qno:5,topic:'Work',q:'An elevator moves upward: first accelerating, then at constant velocity, then decelerating while still moving upward. What is the sign of the work done by the floor’s normal force on the person?',o:['Positive, then zero, then negative','Positive, then negative, then negative','Positive, then positive, then negative','Positive throughout'],a:3,e:'The person’s displacement is upward throughout and the normal force is upward throughout. Therefore N·s is positive in all three stages, even when the elevator is decelerating.'},
  {id:'2023-6',year:2023,qno:6,topic:'Projectile motion',q:'A marble is launched horizontally at 3 m s⁻¹ and reaches a wall after falling 0.8 m. Take g = 10 m s⁻². What is its speed just before hitting the wall?',o:['2 m s⁻¹','3 m s⁻¹','4 m s⁻¹','5 m s⁻¹'],a:3,e:'Vertical speed after falling 0.8 m: v_y = √(2gh)=4 m s⁻¹. Horizontal speed remains 3 m s⁻¹. Resultant speed = √(3²+4²)=5 m s⁻¹.'},
  {id:'2023-7',year:2023,qno:7,topic:'Circular motion',q:'Two identical balls move in horizontal circles at different heights inside a smooth hemispherical bowl. Ball A is higher than B. Which statement is true?',o:['Their tangential speeds are equal','A has the larger angular velocity','A has the smaller centripetal acceleration','Their normal forces are equal'],a:1,e:'For a ball at angle θ from the vertical, vertical equilibrium gives N cosθ = mg and horizontal motion gives N sinθ = mω²R sinθ, so ω² = g/(R cosθ). Higher A has larger θ, smaller cosθ, hence larger ω.'},
  {id:'2023-8',year:2023,qno:8,topic:'Gas pressure',q:'A trapped air column is separated from the atmosphere by a mercury column of height h. Upright, the trapped air pressure is p; inverted, it is p′. If atmospheric pressure is p₀, which relation is correct?',o:['p₀ < p′','p′−p = h','p₀ = ½(p+p′)','ρgh = ½(p′−p)'],a:2,e:'Upright: p = p₀ + ρgh. Inverted: p′ = p₀ − ρgh. Adding gives p+p′ = 2p₀, so p₀ = ½(p+p′).'}
];

const state = JSON.parse(localStorage.getItem('uecQuestV2') || '{}');
state.xp ??= 0; state.hearts ??= 5; state.streak ??= 1; state.mistakes ??= []; state.answered ??= 0; state.correct ??= 0;
let quiz = [], idx = 0, selected = null, answered = false;

function save(){localStorage.setItem('uecQuestV2', JSON.stringify(state));}
function updateUI(){
  document.querySelectorAll('#xp').forEach(e=>e.textContent=state.xp);
  document.querySelectorAll('#hearts').forEach(e=>e.textContent=state.hearts);
  document.querySelectorAll('#streak').forEach(e=>e.textContent=state.streak);
  document.getElementById('bigXp').textContent=state.xp;
  document.getElementById('answeredCount').textContent=state.answered;
  document.getElementById('accuracy').textContent=state.answered ? Math.round(state.correct/state.answered*100)+'%' : '—';
  const pct=Math.min(100,state.xp%100); document.getElementById('ring').style.background=`conic-gradient(var(--green) ${pct}%,#ececec 0)`;
  document.getElementById('ringXp').textContent=`${state.xp%100} XP`;
}
function switchView(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===id));if(id==='past')renderQuestionBrowser();if(id==='mistakes')renderMistakes();updateUI();window.scrollTo(0,0)}
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>switchView(b.dataset.view));

function renderSubjects(){
  const root=document.getElementById('subjects');root.innerHTML='';
  subjects.forEach(s=>{const el=document.createElement('div');el.className='card subject'+(s.ready?'':' locked');el.innerHTML=`<div class="subject-icon">${s.icon}</div><h3>${s.name}</h3><div class="tiny">${s.desc}</div><div class="progress" style="margin-top:14px"><div style="width:${s.progress}%"></div></div>`;el.onclick=()=>s.ready?switchView('past'):toast('这个科目之后导入 Past Year PDF 就能解锁 📄');root.appendChild(el)})
}
function topics(){return [...new Set(questions.map(q=>q.topic))].sort()}
function renderQuestionBrowser(){
  const t=document.getElementById('topicFilter'); if(t.options.length===1)topics().forEach(x=>t.add(new Option(x,x)));
  const yr=document.getElementById('yearFilter').value, tp=t.value;
  const list=questions.filter(q=>(yr==='all'||String(q.year)===yr)&&(tp==='all'||q.topic===tp));
  document.getElementById('questionBrowser').innerHTML=list.map(q=>`<div class="card q-row"><div class="q-number">${q.qno}</div><div><h4>${q.year} · Paper 1 · ${q.topic}</h4><div class="tiny">${q.q}</div></div><button onclick="startSingle('${q.id}')">做这题</button></div>`).join('');
}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function startQuickPractice(){startQuiz(shuffle(questions).slice(0,5))}
function startPaper(year){startQuiz(questions.filter(q=>q.year===year))}
function startSingle(id){startQuiz([questions.find(q=>q.id===id)])}
function startQuiz(arr){quiz=arr;idx=0;selected=null;answered=false;if(state.hearts<=0)state.hearts=5;switchView('quiz');loadQuestion()}
function loadQuestion(){
  if(idx>=quiz.length){finishQuiz();return}
  const q=quiz[idx]; selected=null;answered=false;
  document.getElementById('quizProgress').style.width=(idx/quiz.length*100)+'%';
  document.getElementById('quizHearts').textContent=state.hearts;
  document.getElementById('sourceChip').textContent=`${q.year} · Paper 1 · Q${q.qno} · ${q.topic}`;
  document.getElementById('qCount').textContent=`${idx+1} / ${quiz.length}`;
  document.getElementById('questionText').textContent=q.q;
  const root=document.getElementById('options');root.innerHTML='';q.o.forEach((o,i)=>{const b=document.createElement('button');b.className='option';b.textContent=`${String.fromCharCode(65+i)}. ${o}`;b.onclick=()=>selectOption(i,b);root.appendChild(b)});
  document.getElementById('feedback').className='feedback';document.getElementById('checkBtn').style.display='inline-block';document.getElementById('checkBtn').disabled=true;document.getElementById('nextBtn').style.display='none';
}
function selectOption(i,b){if(answered)return;selected=i;document.querySelectorAll('.option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');document.getElementById('checkBtn').disabled=false}
function checkAnswer(){
  if(answered||selected===null)return;answered=true;const q=quiz[idx];const buttons=[...document.querySelectorAll('.option')];buttons[q.a].classList.add('correct');state.answered++;
  const fb=document.getElementById('feedback');
  if(selected===q.a){state.correct++;state.xp+=10;fb.className='feedback show good';document.getElementById('feedbackTitle').textContent='✅ Correct · +10 XP';toast('+10 XP ⚡')}
  else{buttons[selected].classList.add('wrong');state.hearts=Math.max(0,state.hearts-1);fb.className='feedback show bad';document.getElementById('feedbackTitle').textContent='❌ Not quite';addMistake(q)}
  document.getElementById('explanation').textContent=q.e;document.getElementById('quizHearts').textContent=state.hearts;document.getElementById('checkBtn').style.display='none';document.getElementById('nextBtn').style.display='inline-block';save();updateUI();
}
function addMistake(q){state.mistakes=state.mistakes.filter(m=>m.id!==q.id);state.mistakes.unshift({id:q.id,when:Date.now()});state.mistakes=state.mistakes.slice(0,100)}
function nextQuestion(){idx++;if(state.hearts<=0 && idx<quiz.length){save();toast('爱心用完了 💙 先复习错题');switchView('mistakes');return}loadQuestion()}
function finishQuiz(){document.getElementById('quizProgress').style.width='100%';save();alert(`完成！\n这次做了 ${quiz.length} 题。\n当前总 XP：${state.xp}`);switchView('home')}
function exitQuiz(){switchView('home')}
function renderMistakes(){
  const root=document.getElementById('mistakeList');
  if(!state.mistakes.length){root.innerHTML='<div class="card empty">🎉 目前没有错题。继续刷题吧。</div>';return}
  root.innerHTML=state.mistakes.map(m=>questions.find(q=>q.id===m.id)).filter(Boolean).map(q=>`<div class="card mistake"><span class="chip blue">${q.year} · Q${q.qno} · ${q.topic}</span><b>${q.q}</b><div class="tiny">正确答案：${String.fromCharCode(65+q.a)} · ${q.o[q.a]}</div><div style="margin-top:10px"><button class="btn blue" onclick="startSingle('${q.id}')">重做</button></div></div>`).join('')
}
function clearMistakes(){if(!state.mistakes.length)return; if(confirm('确定清空错题本？')){state.mistakes=[];save();renderMistakes();toast('已清空')}}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1700)}

document.addEventListener('keydown',e=>{if(!document.getElementById('quiz').classList.contains('active'))return;if(['1','2','3','4'].includes(e.key)&&!answered){const i=Number(e.key)-1;const b=document.querySelectorAll('.option')[i];if(b)selectOption(i,b)}if(e.key==='Enter'){answered?nextQuestion():checkAnswer()}})

renderSubjects();updateUI();
