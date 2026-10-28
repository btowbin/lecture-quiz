/* =====================================================================
   COURSE: Systems Biology (id 'sysbio')
   ---------------------------------------------------------------------
   Each question is one object:
     id     unique, never reuse (progress + live sessions refer to it)
     lec    lecture number 1-6  (7 = "More exam topics")
     diff   difficulty: 1 = easy (recall), 2 = medium (apply a concept / short calculation), 3 = hard (multi-step reasoning)
     topic  short label shown above the question
     q      question text. $...$ = inline LaTeX, $$...$$ = display LaTeX. HTML allowed.
     opts   answer options.  *** THE FIRST OPTION IS THE CORRECT ONE ***
            (the app shuffles them for display; same order for everybody in live mode)
            Use  ans:<index>  + fixed:true  to keep your own order instead.
     exp    explanation shown after the answer is revealed
     src    optional: where the question is modelled on
     fig    optional: figure spec (see plot() further down)
   ===================================================================== */
QUIZ.course('sysbio', () => {

const r = String.raw;

// helper: reproduction table (days 1-7) for the "early vs late reproduction" questions
const tbl = (A, B) => '<table class="tbl"><tr><th>Day after birth</th>' + [1,2,3,4,5,6,7].map(d => '<th>' + d + '</th>').join('') +
  '</tr><tr><th>Progeny / day, strain A</th>' + A.map(v => '<td>' + v + '</td>').join('') +
  '</tr><tr><th>Progeny / day, strain B</th>' + B.map(v => '<td>' + v + '</td>').join('') + '</tr></table>';

// helper: standard 3-node feed-forward loop diagram  (sYZ: '+' or '-', gate: 'AND' | 'OR' | '')
const ffl = (sYZ, gate, names) => { const [X,Y,Z] = names || ['X','Y','Z'];
  return { net:true, w:440, h:215, nodes:{ [X]:[200,38], [Y]:[330,108], [Z]:[200,178] },
    edges:[ {a:X,b:Y,t:'+'}, {a:Y,b:Z,t:sYZ}, {a:X,b:Z,t:'+'} ],
    texts: gate ? [ {x:Z.length>2?Z.length*4.6+238:250, y:183, t:gate, b:true, c:'a', a:'start'} ] : [] }; };
// helper: growth-rate curves of the two environments (Lecture 5)
const envFig = { x:[0,3], y:[-1.2,2.3], xl:'expression x', yl:'growth rate μ (doublings/h)', ticks:true,
  curves:[ {fn:'1-(x-1)**2', c:'a', lab:'μ₁ (E1)', labx:0.42, laby:-0.25}, {fn:'-1.5*(x-2)**2+2', c:'b', lab:'μ₂ (E2)', labx:2.62, laby:-0.3} ] };

const LECTURES = {
  1: 'Simple regulation',
  2: 'Autoregulation & Hill function',
  3: 'Feed-forward loops',
  4: 'Two-dimensional systems',
  5: 'Optimality & growth',
  6: 'Noise & robustness',
  7: { name:'More exam topics', plain:true }
};

const QUESTIONS = [

/* ============================ LECTURE 1 ============================ */
{ id:'L1-01', lec:1, diff:2, topic:'Response time', src:'Exam HS22–24 · Q1b/c',
  q:r`Simple regulation is described by $\dot y=\beta-\alpha y$. After an ON switch from $y=0$, the production rate $\beta$ is <b>doubled</b>. How do the steady state and the response time (time to reach half of the steady state) change?`,
  opts:[r`Steady state doubles, response time is unchanged`, r`Steady state doubles, response time is halved`, r`Steady state is unchanged, response time is halved`, r`Steady state doubles, response time doubles`],
  exp:r`$y_{st}=\beta/\alpha$ doubles, but $t_{1/2}=\ln 2/\alpha$ does not contain $\beta$. A higher production rate raises the plateau and the initial speed by the same factor, so the halfway point is reached at the same time.` },

{ id:'L1-02', lec:1, diff:1, topic:'Steady state & response time',
  q:r`A protein is produced at $\beta=6\ \mu\mathrm{M/h}$ and removed with $\alpha=2\ \mathrm{h^{-1}}$ (ON switch from zero). What are its steady state and response time?`,
  opts:[r`$y_{st}=3\ \mu$M and $t_{1/2}=\ln 2/2\approx 0.35$ h`, r`$y_{st}=3\ \mu$M and $t_{1/2}=2\ln 2\approx 1.4$ h`, r`$y_{st}=12\ \mu$M and $t_{1/2}\approx 0.35$ h`, r`$y_{st}=12\ \mu$M and $t_{1/2}\approx 1.4$ h`],
  exp:r`$y_{st}=\beta/\alpha=6/2=3\ \mu$M and $t_{1/2}=\ln2/\alpha=0.69/2\approx0.35$ h.` },

{ id:'L1-03', lec:1, diff:2, topic:'Faster response, same steady state', src:'Exam HS21–24 · Q1d',
  q:r`You want a gene under simple regulation to respond <b>twice as fast</b> (half the response time) <b>without changing its steady state</b>. What must you change?`,
  opts:[r`Double $\alpha$ <i>and</i> double $\beta$`, r`Double $\beta$ only`, r`Double $\alpha$ only`, r`Halve $\alpha$ and double $\beta$`],
  exp:r`$t_{1/2}=\ln2/\alpha$ needs $\alpha\to2\alpha$. To keep $y_{st}=\beta/\alpha$ constant, $\beta$ must double as well. This is costly: the cell has to produce <i>and</i> destroy the protein twice as fast.` },

{ id:'L1-04', lec:1, diff:2, topic:'Dilution as removal',
  q:r`A completely stable protein (no degradation at all) is expressed in bacteria that divide every 60 minutes. After an ON switch, how long does it take to reach half of its new steady state?`,
  opts:[r`About 60 min (one doubling time)`, r`About 30 min`, r`About 90 min`, r`It never reaches a steady state, because it is not degraded`],
  exp:r`Growth dilutes the protein, so $\alpha=\ln2/T_{double}$ even without degradation. Then $t_{1/2}=\ln2/\alpha=T_{double}$. This is why the cell-division time is the lower limit for the removal rate of most proteins.` },

{ id:'L1-05', lec:1, diff:1, topic:'OFF switch',
  q:r`Two genes with the same removal rate $\alpha$ are switched OFF at $t=0$. Gene 1 was expressed at 10 µM, gene 2 at 1 µM. Which gene needs longer to fall to half of its initial level?`,
  opts:[r`Both need the same time, $\ln2/\alpha$`, r`Gene 1 (higher level)`, r`Gene 2 (lower level)`, r`This cannot be said without knowing $\beta$`],
  exp:r`$y(t)=y_0e^{-\alpha t}$: half of $y_0$ is reached at $t=\ln2/\alpha$ whatever $y_0$ is. The response time of an OFF switch is independent of the initial expression level.` },

{ id:'L1-06', lec:1, diff:1, topic:'Separation of timescales',
  q:r`The model $\dot y=\beta-\alpha y$ assumes that protein production starts immediately when the gene is activated. Why is this often a good approximation?`,
  opts:[r`mRNA production and the other intermediate steps are fast compared with the slow accumulation of the protein, which is governed by $\alpha$`, r`mRNA is never degraded`, r`Transcription and translation happen at the very same instant`, r`The model contains only one parameter`],
  exp:r`Separation of timescales: if the mRNA half-life is much shorter than the protein half-life, the mRNA reaches its steady state quickly and can be neglected. For unstable proteins or very stable mRNAs the assumption can fail (Assignment 1, Q4).` },

{ id:'L1-07', lec:1, diff:2, topic:'Change of production rate', src:'Assignment 1 · Q1',
  q:r`Protein X is produced at $\beta_1=1\ \mu$mol/h and removed with $\alpha=1\ \mathrm{h^{-1}}$. At $t=0$ production switches to $\beta_2=2\ \mu$mol/h. How long does X need to reach the point <b>half-way</b> between old and new steady state?`,
  opts:[r`$\ln2\approx0.69$ h`, r`1 h`, r`$\ln2/2\approx0.35$ h`, r`1.5 h`],
  exp:r`Old steady state 1, new 2, so half-way is 1.5 µmol. With $x(t)=2-e^{-t}$ we get $e^{-t}=1/2$, so $t=\ln2/\alpha$ — again independent of the production rates.` },

{ id:'L1-08', lec:1, diff:2, topic:'How many response times?',
  q:r`After an ON switch in simple regulation, which fraction of the final steady state has been reached after <b>three response times</b> ($t=3\,t_{1/2}$)?`,
  opts:[r`87.5 %`, r`75 %`, r`93.75 %`, r`100 %`],
  exp:r`$y/y_{st}=1-e^{-\alpha t}=1-2^{-t/t_{1/2}}=1-2^{-3}=87.5\,\%$. Each additional response time halves the remaining distance.` },

{ id:'L1-09', lec:1, diff:2, topic:'Reading the curves',
  q:r`The dashed curve is the ON switch of a gene with $\alpha=1$ and $\beta=1$. Which solid curve is obtained when <b>both</b> $\alpha$ and $\beta$ are doubled?`,
  fig:{ x:[0,6], y:[0,2.3], xl:'time', yl:'protein y', hlines:[],
    curves:[ {fn:'1-exp(-x)', c:'ink', dash:true},
             {fn:'2*(1-exp(-x))', c:'a', lab:'1', labx:5.6},
             {fn:'1-exp(-2*x)', c:'b', lab:'2', labx:2.6},
             {fn:'2*(1-exp(-0.5*x))', c:'c', lab:'3', labx:5.6} ] },
  opts:[r`Curve 2`, r`Curve 1`, r`Curve 3`, r`None — the curve does not change`],
  exp:r`Doubling both keeps $y_{st}=\beta/\alpha=1$ but halves $t_{1/2}$ (curve 2: same plateau, faster). Curve 1 is $\beta\times2$ only (plateau doubles, same response time); curve 3 is $\alpha$ halved and $\beta$ unchanged: higher and slower.` },

{ id:'L1-10', lec:1, diff:2, topic:'Initial speed vs. stability',
  q:r`Proteins P and Q are produced at the same rate $\beta$, but Q is twice as stable ($\alpha_Q=\alpha_P/2$). Both are switched ON from zero. Which statement is correct?`,
  opts:[r`Both initially accumulate equally fast ($\dot y(0)=\beta$), but Q reaches a twice higher steady state, more slowly`, r`Q accumulates faster at the beginning because it is more stable`, r`P accumulates faster at the beginning and reaches the higher steady state`, r`Both reach the same steady state but Q needs twice as long`],
  exp:r`At $t=0$ nothing is yet removed, so $\dot y(0)=\beta$ for both. Later removal matters: $y_{st}=\beta/\alpha$ is twice as high for Q and its response time $\ln2/\alpha$ twice as long.` },


/* ============================ LECTURE 2 ============================ */
{ id:'L2-01', lec:2, diff:1, topic:'Hill function', src:'Exam HS21–23 · Q3a',
  q:r`In the Hill model $\rho=\dfrac{(x/K)^n}{1+(x/K)^n}$, what fraction of the promoters is bound when $x=K$?`,
  opts:[r`50 %, independent of $n$`, r`50 %, but only for $n=1$`, r`100 % if $n>1$`, r`$K/(1+K)$`],
  exp:r`$\rho(K)=1^n/(1+1^n)=1/2$ for every $n$. $K$ is the concentration at which half of the promoters are bound; $n$ only changes the steepness.` },

{ id:'L2-02', lec:2, diff:1, topic:'Hill coefficient',
  q:r`The figure shows binding curves $\rho(x)$ for three Hill coefficients ($n=1$, $n=2$, $n=10$). Which curve has the strongest cooperativity?`,
  fig:{ x:[0,4], y:[0,1.08], xl:'concentration x', yl:'bound fraction ρ',
    xticks:[[1,'K']], yticks:[[0.5,'0.5'],[1,'1']], vlines:[{x:1,dash:true}], hlines:[{y:0.5,dash:true}],
    curves:[ {fn:'x**2/(1+x**2)', c:'a', lab:'1', labx:3.2},
             {fn:'x/(1+x)', c:'b', lab:'2', labx:3.4},
             {fn:'x**10/(1+x**10)', c:'c', lab:'3', labx:1.35} ] },
  opts:[r`Curve 3`, r`Curve 1`, r`Curve 2`, r`All three — they cross at $x=K$`],
  exp:r`A higher Hill coefficient gives a steeper, more switch-like (sigmoidal) curve that approaches a step function at $x=K$. Curve 3 is $n=10$, curve 1 is $n=2$ and curve 2 is $n=1$. All curves pass through $(K,0.5)$, which says nothing about $n$.` },

{ id:'L2-03', lec:2, diff:1, topic:'Cooperative binding',
  q:r`How can a Hill coefficient $n\ge2$ arise biologically for a transcription factor acting on a promoter?`,
  opts:[r`Several binding sites for the TF in the promoter (or TF multimers) whose binding events stabilise each other`, r`The TF binds extremely tightly (very small $K$)`, r`The TF is degraded very quickly`, r`The promoter has a single binding site that is always occupied`],
  exp:r`Cooperative binding — e.g. multiple binding sites in the same promoter — makes the binding curve sigmoidal ($n>1$).`,
  src:'Exam HS22 · Q3c' },

{ id:'L2-04', lec:2, diff:1, topic:'Activator vs. repressor', src:'Exam HS22/23 · Q3',
  q:r`A gene is regulated by a transcription factor $Y$ acting as a <b>repressor</b> (maximal rate $\beta$, Hill function with $K$, $n$). Which expression gives its transcription rate?`,
  opts:[r`$\beta\,\dfrac{K^n}{Y^n+K^n}$`, r`$\beta\,\dfrac{Y^n}{Y^n+K^n}$`, r`$\beta\,(1+\rho)$`, r`$\beta\,\rho^{\,n}$`],
  exp:r`The simplest model: a promoter is active whenever it is <i>un</i>bound. Transcription $=\beta(1-\rho)=\beta K^n/(Y^n+K^n)$. For an activator the activity is $\beta\rho$. The binding function $\rho$ itself is the same.` },

{ id:'L2-05', lec:2, diff:2, topic:'Negative autoregulation: steady state', src:'Assignment 2 · Q1a',
  q:r`A protein X represses its own production (negative autoregulation): $f(X)=\beta$ for $X \lt K$ and $0$ for $X\ge K$, with $\dot X=f(X)-\alpha X$, $\alpha=1/$h, $\beta=500\ \mu$mol/h, $K=1\ \mu$mol. What is the steady state of X?`,
  fig:{ net:true, w:440, h:130, nodes:{ X:[220,82] }, edges:[ {a:'X',b:'X',t:'-',loop:'up'} ] },
  opts:[r`About 1 µmol ($\approx K$)`, r`500 µmol ($=\beta/\alpha$)`, r`250 µmol`, r`0.5 µmol`],
  exp:r`Production stops as soon as $X$ reaches $K$, so the level fluctuates around $K$. The steady state is set by $K$ and is independent of $\beta$ and $\alpha$ (as long as $\beta/\alpha\gg K$).` },

{ id:'L2-06', lec:2, diff:2, topic:'Negative autoregulation: response time', src:'Assignment 2 · Q1b',
  q:r`A protein X represses its own production: it is produced at $\beta=500\ \mu$mol/h as long as $X \lt K=1\ \mu$mol, and not at all above $K$; it is removed with $\alpha=1/$h. Its steady state is therefore $\approx K$. Starting from $X=0$, how long until X is at half of its steady state? (Neglect removal during the initial accumulation.)`,
  fig:{ net:true, w:440, h:130, nodes:{ X:[220,82] }, edges:[ {a:'X',b:'X',t:'-',loop:'up'} ] },
  opts:[r`$\approx0.001$ h ($\approx3.6$ s)`, r`$\approx0.69$ h`, r`$\approx0.5$ h`, r`$\approx0.002$ h ($\approx7$ s)`],
  exp:r`X rises linearly with slope $\beta$ until $K$: $t_{1/2}\approx (K/2)/\beta=0.5/500=0.001$ h. It depends on $\beta$ and $K$ and (for large $\beta/\alpha$) not on $\alpha$.` },

{ id:'L2-07', lec:2, diff:3, topic:'Negative autoregulation vs. simple regulation', src:'Assignment 2 · Q1d,e',
  q:r`Protein X represses its own production: it is made at $\beta=500\ \mu$mol/h while $X \lt K=1\ \mu$mol and not at all above, so it settles at $\approx1\ \mu$mol. Protein Y is under simple regulation (constant production) and reaches the same steady state of 1 µmol. Both are removed with $\alpha=1/$h. Roughly how much faster is X than Y in an ON switch (time to half of the steady state)?`,
  fig:{ net:true, w:440, h:150, nodes:{ X:[130,95], Y:[310,95] }, edges:[ {a:'X',b:'X',t:'-',loop:'up'} ],
        texts:[ {x:130,y:143,t:'negative autoregulation'}, {x:310,y:143,t:'simple regulation'} ] },
  opts:[r`About 700-fold`, r`About 2-fold`, r`About 10-fold`, r`Equally fast`],
  exp:r`Y needs $\beta_s=\alpha K=1\ \mu$mol/h, so $t_{1/2}=\ln2/\alpha=0.69$ h. X needs 0.001 h. The ratio is $\approx 690$. Negative autoregulation lets the cell use a huge production rate without overshooting.` },

{ id:'L2-08', lec:2, diff:2, topic:'Negative autoregulation: OFF switch',
  q:r`Does negative autoregulation also accelerate the <b>OFF</b> switch compared with simple regulation?`,
  opts:[r`No — once production stops, the decline is governed by $\alpha$ alone, as in simple regulation`, r`Yes — the feedback pushes the level down faster`, r`Yes, but only if $n>1$`, r`No — it makes the OFF switch slower`],
  exp:r`NAR accelerates the ON switch only. After the OFF switch there is no production, and the protein decays with the same $\alpha$ as in simple regulation.` },

{ id:'L2-09', lec:2, diff:2, topic:'Robustness of negative autoregulation',
  q:r`Why is the steady state of a negatively autoregulated gene robust to changes in the removal rate $\alpha$?`,
  opts:[r`The production curve is very steep around the fixpoint, so changing the slope of the removal line barely shifts the intersection`, r`$\alpha$ cancels out of the equation $\dot y=\beta f(y)-\alpha y$`, r`Negative autoregulation removes protein degradation`, r`Because the Hill coefficient is always 1`],
  exp:r`In the graphical analysis the fixpoint is where production and removal curves cross. If the production curve falls steeply there, tilting the removal line (changing $\alpha$) hardly changes the crossing point.` },

{ id:'L2-10', lec:2, diff:2, topic:'Positive autoregulation (n = 1)',
  q:r`Gene X activates its own production (positive autoregulation, $n=1$); gene Y is under simple regulation. Both have the same steady state and the same removal rate. How does X respond to an ON switch, compared with Y?`,
  fig:{ net:true, w:440, h:150, nodes:{ X:[130,95], Y:[310,95] }, edges:[ {a:'X',b:'X',t:'+',loop:'up'} ],
        texts:[ {x:130,y:143,t:'positive autoregulation'}, {x:310,y:143,t:'simple regulation'} ] },
  opts:[r`Slower — production minus removal is smaller everywhere`, r`Faster — the feedback amplifies production`, r`Equally fast`, r`Faster, but only in the OFF switch`],
  exp:r`In the production/removal plot, the distance between the two curves (the net rate of change) is always smaller for PAR with $n=1$. PAR slows the response (for ON and for OFF).` },

{ id:'L2-11', lec:2, diff:2, topic:'Flow on the line', src:'Exam HS21–23 · Q2a,b',
  q:r`$\dot y=\beta_0+\beta\frac{(y/K)^n}{1+(y/K)^n}-\alpha y$ (here $n=4$) describes positive autoregulation with basal production $\beta_0$. The graph shows the production and the removal term. How many fixpoints are there, and how many of them are stable?`,
  fig:{ x:[0,5], y:[0,4.8], xl:'y', yl:'rate',
    curves:[ {fn:'0.3+4*x**4/(16+x**4)', c:'c', lab:'production', labx:4.0, laby:-0.55}, {fn:'1.05*x', c:'b', lab:'removal', labx:1.25, laby:0.38} ],
    pts:[ {x:0.2873,y:0.3017,lab:'1',fill:'n'}, {x:1.8049,y:1.8952,lab:'2',fill:'n'}, {x:3.8321,y:4.0237,lab:'3',fill:'n'} ] },
  opts:[r`3 fixpoints, 2 stable`, r`3 fixpoints, 1 stable`, r`3 fixpoints, all stable`, r`1 fixpoint, stable`],
  exp:r`Where production exceeds removal, $y$ increases; where removal exceeds production, $y$ decreases. Fixpoints 1 and 3 attract (stable), fixpoint 2 repels (unstable). The system is bistable.` },

{ id:'L2-12', lec:2, diff:3, topic:'Bistability and hysteresis', src:'Exam HS21–23 · Q2c,d',
  q:r`Positive autoregulation with basal production: $\dot y=\beta_0+\beta\frac{(y/K)^4}{1+(y/K)^4}-\alpha y$. The graph shows production and removal, which cross at the fixpoints 1, 2 and 3 (1 and 3 stable, 2 unstable). A cell starts at $y=0$ and settles. Then $\beta_0$ is increased 100-fold for a short time (a bifurcation) and afterwards set back to its original value. Where is the system now?`,
  fig:{ x:[0,5], y:[0,4.8], xl:'y', yl:'rate',
    curves:[ {fn:'0.3+4*x**4/(16+x**4)', c:'c', lab:'production', labx:4.0, laby:-0.55}, {fn:'1.05*x', c:'b', lab:'removal', labx:1.25, laby:0.38} ],
    pts:[ {x:0.2873,y:0.3017,lab:'1',fill:'n'}, {x:1.8049,y:1.8952,lab:'2',fill:'n'}, {x:3.8321,y:4.0237,lab:'3',fill:'n'} ] },
  opts:[r`Fixpoint 3 — the system keeps the memory of the pulse (hysteresis)`, r`Fixpoint 1 — it returns to where it started`, r`Fixpoint 2`, r`It oscillates between 1 and 3`],
  exp:r`From $y=0$ the cell settles at fixpoint 1. The pulse in $\beta_0$ removes the low fixpoint and drives the system to the high one. When $\beta_0$ returns, the high fixpoint (3) still exists and the cell stays there: it has memorised the pulse.` },

{ id:'L2-13', lec:2, diff:3, topic:'Ranking robustness', src:'Assignment 2 · Q3b',
  q:r`Four genes have the same steady state: two with negative autoregulation (NAR, Hill coefficient $n=5$ or $n=1$), one under simple regulation, and one with positive autoregulation (PAR, $n=1$). Rank them by the robustness of their steady state against changes of the removal rate $\alpha$ (most robust first).`,
  opts:[r`NAR ($n=5$) > NAR ($n=1$) > simple regulation > PAR ($n=1$)`, r`Simple regulation > NAR ($n=1$) > NAR ($n=5$) > PAR ($n=1$)`, r`PAR ($n=1$) > simple regulation > NAR ($n=1$) > NAR ($n=5$)`, r`NAR ($n=1$) > NAR ($n=5$) > PAR ($n=1$) > simple regulation`],
  exp:r`The steeper the production curve at the fixpoint, the less the intersection moves when the removal line is tilted. NAR with $n=5$ is steepest; NAR $n=1$ steep; simple regulation has a flat production curve; PAR ($n=1$) is rising, so the intersection moves the most.` },

{ id:'L2-14', lec:2, diff:2, topic:'Fastest and slowest circuit', src:'Assignment 2 · Q2d',
  q:r`X (constant production), Y (negative autoregulation) and Z (positive autoregulation) have the same $\alpha$ and the same steady state. Order them by ON-switch response time, fastest first.`,
  fig:{ net:true, w:440, h:150, nodes:{ X:[80,95], Y:[220,95], Z:[360,95] }, edges:[ {a:'Y',b:'Y',t:'-',loop:'up'}, {a:'Z',b:'Z',t:'+',loop:'up'} ],
        texts:[ {x:80,y:143,t:'simple'}, {x:220,y:143,t:'NAR'}, {x:360,y:143,t:'PAR'} ] },
  opts:[r`Y < X < Z`, r`X < Y < Z`, r`Z < X < Y`, r`Y < Z < X`], fixed:true, ans:0,
  exp:r`NAR has the biggest gap between production and removal curve (fastest). PAR ($n=1$) has the smallest gap (slowest). Simple regulation is in between.` },


/* ============================ LECTURE 3 ============================ */
{ id:'L3-01', lec:3, diff:1, topic:'Network motifs',
  q:r`What defines a <b>network motif</b>, such as the feed-forward loop in the <i>E. coli</i> regulatory network?`,
  opts:[r`A connection pattern that occurs significantly more often in the real network than in randomised networks with the same numbers of genes and connections`, r`Any pattern consisting of exactly three genes`, r`The most complex circuit in the network`, r`A pattern found in every organism`],
  exp:r`Milo et al. (2002): the FFL appears 42 times in the <i>E. coli</i> network versus $1.7\pm1.2$ times in randomised networks. Over-representation suggests that the pattern has a conserved function.` },

{ id:'L3-02', lec:3, diff:1, topic:'Coherent vs. incoherent',
  q:r`In the I1-FFL, X activates Y, Y represses Z, and X activates Z (diagram). Why is it called <i>incoherent</i>?`,
  fig:ffl('-',''),
  opts:[r`The direct effect of X on Z (+) and its indirect effect via Y (net −) have opposite signs`, r`Both Y and Z are repressors`, r`It has three nodes`, r`X is not regulated by any other gene`],
  exp:r`In coherent FFLs the direct and the indirect path have the same net sign, in incoherent FFLs they have opposite signs.` },

{ id:'L3-03', lec:3, diff:1, topic:'Logic gates',
  q:r`X and Y are both activators of Z. With $X=1$ and $Y=0$, Z is expressed for…`,
  opts:[r`the OR gate, but not the AND gate`, r`the AND gate, but not the OR gate`, r`both gates`, r`neither gate`],
  exp:r`An AND gate needs both inputs; an OR gate is satisfied by either one.` },

{ id:'L3-04', lec:3, diff:2, topic:'C1-FFL with AND gate',
  q:r`X activates Y, and X <b>AND</b> Y are both required to activate Z (coherent type-1 FFL with AND gate). What does the circuit do to Z, compared with simple regulation of Z by X?`,
  fig:ffl('+','AND'),
  opts:[r`Delays Z after the ON switch of X, but not after the OFF switch`, r`Delays Z after the OFF switch of X, but not after the ON switch`, r`Delays both ON and OFF`, r`Accelerates the ON switch`],
  exp:r`After the ON switch Z must wait until Y has crossed its threshold (delay). After the OFF switch, X disappearing immediately switches Z production off (no delay): sign-sensitive delay.` },

{ id:'L3-05', lec:3, diff:2, topic:'C1-FFL with OR gate',
  q:r`X activates Y, and Z is activated by X <b>OR</b> Y (coherent type-1 FFL with OR gate). Compared with simple regulation of Z by X, where is Z delayed?`,
  fig:ffl('+','OR'),
  opts:[r`After the OFF switch of X only`, r`After the ON switch of X only`, r`After both`, r`Nowhere`],
  exp:r`ON: Z is activated as soon as X appears (no delay). OFF: Y is still present for a while and keeps Z on, so shut-off is delayed. This is what keeps the flagellar system running despite brief loss of signal.` },

{ id:'L3-06', lec:3, diff:2, topic:'Arabinose system',
  q:r`In <i>E. coli</i>, <i>araBAD</i> is controlled by a C1-FFL with AND gate: CRP–cAMP activates AraC, and both (AraC only with arabinose) are needed to activate <i>araBAD</i>. What is the likely benefit?`,
  fig:ffl('+','AND',['CRP','AraC','araBAD']),
  opts:[r`The ON delay filters out brief arabinose pulses, so the system is switched on only after a sustained need`, r`It accelerates the response when arabinose appears`, r`It stores a memory of previous arabinose exposure`, r`It generates oscillations`],
  exp:r`Short pulses end before Y has accumulated beyond its threshold, so Z is never turned on — a noise filter. Because the OFF step is not delayed, the system is shut off quickly when arabinose disappears (Mangan et al. 2003).` },

{ id:'L3-07', lec:3, diff:2, topic:'I1-FFL accelerates response', src:'Exam HS23/24 · Q3a,c',
  q:r`Z reaches the same steady state in network A (X activates Z by simple regulation) and in network B (X activates Z via an incoherent FFL). Which statement about the response times of Z is correct?`,
  fig:{ net:true, w:440, h:215, nodes:{ X:[90,38], Z:[90,178], X2:{x:250,y:38,lab:'X'}, Y2:{x:375,y:108,lab:'Y'}, Z2:{x:250,y:178,lab:'Z'} },
        edges:[ {a:'X',b:'Z',t:'+'}, {a:'X2',b:'Y2',t:'+'}, {a:'Y2',b:'Z2',t:'-'}, {a:'X2',b:'Z2',t:'+'} ],
        texts:[ {x:40,y:113,t:'A',b:true,s:18}, {x:200,y:113,t:'B',b:true,s:18} ] },
  opts:[r`B is faster for the ON switch, and the same for the OFF switch`, r`B is faster for both ON and OFF`, r`B is faster for the OFF switch, and the same for the ON switch`, r`A is faster for the ON switch`],
  exp:r`In the I1-FFL, Z is initially produced at a high rate, later repressed by Y. To reach the same steady state, the simple system would need the lower production rate $\beta_2$, hence responds slower. In the OFF switch both decay with $\alpha$.` },

{ id:'L3-08', lec:3, diff:2, topic:'Pulse generation',
  q:r`The figure shows an ON switch of X in a three-node circuit. What motif and behaviour does Z reveal?`,
  fig:{ x:[0,10], y:[0,2.2], xl:'time', yl:'concentration',
    curves:[ {fn:'x<1?0:1', c:'ink', lab:'X', labx:9.2, laby:0.1},
             {fn:'x<1?0:1-exp(-(x-1))', c:'b', lab:'Y', labx:4, laby:-0.16},
             {fn:'x<1?0:(x<1.693?2*(1-exp(-(x-1))):0.5+0.5*exp(-(x-1.693)))', c:'a', lab:'Z', labx:2.9, laby:-0.1, lw:3} ] },
  opts:[r`I1-FFL: Z overshoots, then settles at a lower steady state — a pulse and a faster response`, r`C1-FFL with AND gate: Z is delayed`, r`C1-FFL with OR gate: Z has a delayed OFF response`, r`Simple regulation: Z follows X directly`],
  exp:r`Z is produced strongly first; once Y has accumulated beyond its threshold, Y represses Z, and Z settles at a lower steady state. This is the signature of an incoherent FFL.` },

{ id:'L3-09', lec:3, diff:2, topic:'Identify the motif',
  q:r`X is switched ON at $t=1$ and OFF at $t=7$. Which circuit produces these dynamics of Z?`,
  fig:{ x:[0,12], y:[0,1.15], xl:'time', yl:'concentration',
    curves:[ {fn:'x<1?0:(x<7?1:0)', c:'ink', lab:'X', labx:5.6, laby:0.07},
             {fn:'x<1?0:(x<7?1-exp(-(x-1)):0.9975*exp(-(x-7)))', c:'b', lab:'Y', labx:9.6, laby:0.08},
             {fn:'x<1.693?0:(x<7?1-exp(-(x-1.693)):0.995*exp(-(x-7)))', c:'a', lab:'Z', labx:3.8, laby:0.07, lw:3} ] },
  opts:[r`C1-FFL with AND gate`, r`C1-FFL with OR gate`, r`I1-FFL`, r`Simple regulation`],
  exp:r`Z starts rising only after Y has crossed its threshold (delay at ON), but drops immediately when X is switched off (no delay at OFF): sign-sensitive delay of the C1-FFL with AND gate.` },

{ id:'L3-10', lec:3, diff:3, topic:'Effect of β in an I1-FFL', src:'Exam HS23/24 · Q3d',
  fig:ffl('-',''),
  q:r`In an I1-FFL (diagram), Z is produced at rate $\beta$ while $Y \lt K$ and at the lower rate $\beta'<\beta$ once $Y \gt K$. Assume Z reaches half of its final level ($\beta'/2\alpha$) <b>before</b> Y crosses $K$. What happens to the response time of Z at the ON switch when $\beta$ is increased (with $\beta'$ fixed)?`,
  opts:[r`It gets smaller`, r`It gets bigger`, r`It does not change`, r`Z no longer reaches a steady state`], fixed:true, ans:0,
  exp:r`Before repression Z rises as $\frac{\beta}{\alpha}(1-e^{-\alpha t})$. A higher $\beta$ reaches the target level $\beta'/(2\alpha)$ earlier. The final steady state ($\beta'/\alpha$) is unchanged.` },

{ id:'L3-11', lec:3, diff:2, topic:'Non-monotonic input function',
  q:r`In the galactose system an I1-FFL controls the target: CRP activates GalS, GalS represses <i>galETK</i>, and CRP activates <i>galETK</i>. How does <i>galETK</i> expression depend on the CRP–cAMP level?`,
  fig:ffl('-','',['CRP','GalS','galETK']),
  opts:[r`Non-monotonic: highest at intermediate CRP, lower at high CRP`, r`Monotonically increasing`, r`Monotonically decreasing`, r`A sharp step function`],
  exp:r`At intermediate X, Z is strongly activated while Y is still too low to repress. At high X, Y becomes high enough to repress Z. This non-monotonic response disappears in <i>galS</i> mutants (Kaplan et al. 2008).` },

{ id:'L3-11b', lec:3, diff:3, topic:'Summary of mechanisms',
  q:r`Which mechanism accelerates the <b>ON</b> switch (but not the OFF switch) <b>and works for any target gene</b>, not only for transcription factors?`,
  opts:[r`I1-FFL`, r`Negative autoregulation`, r`Positive autoregulation`, r`C1-FFL with AND gate`],
  exp:r`NAR accelerates the ON switch too, but requires that the target is itself a transcription factor. The I1-FFL works for any Z. PAR and the C1-FFL slow responses down.` },

{ id:'L3-12', lec:3, diff:2, topic:'Summary of mechanisms',
  q:r`Which of these mechanisms slows down <b>both</b> the ON and the OFF switch of a target gene?`,
  opts:[r`Positive autoregulation`, r`Negative autoregulation`, r`I1-FFL`, r`C1-FFL with AND gate`],
  exp:r`PAR slows both (and can create bistability). The C1-FFL is sign-sensitive (delays either ON or OFF depending on the gate). NAR and I1-FFL accelerate the ON switch.` },


/* ============================ LECTURE 4 ============================ */
{ id:'L4-01', lec:4, diff:2, topic:'Stability in 1D', src:'Assignment 3 · Q2',
  q:r`Consider $\dot x=f(x)=(x-1)(x-2)$ (graph). Which statement is correct?`,
  fig:{ x:[0,3], y:[-0.45,1.4], xl:'x', yl:'dx/dt', ticks:true,
    curves:[ {fn:'(x-1)*(x-2)', c:'a'} ], pts:[ {x:1,y:0,lab:'x₁',fill:'n'}, {x:2,y:0,lab:'x₂',fill:'n'} ] },
  opts:[r`$x=1$ is stable and $x=2$ is unstable`, r`$x=1$ is unstable and $x=2$ is stable`, r`Both fixpoints are stable`, r`Both fixpoints are unstable`],
  exp:r`A fixpoint is stable if $f'(x^*)<0$. Here $f'(x)=2x-3$: $f'(1)=-1<0$ (stable), $f'(2)=+1>0$ (unstable). On the graph: $f>0$ means $x$ increases, $f<0$ means it decreases.` },

{ id:'L4-02', lec:4, diff:2, topic:'Bifurcation', src:'Assignment 3 · Q2c',
  q:r`For $\dot x=(x-1)(x-2)+c$, at which value of $c$ do the two fixpoints disappear?`,
  opts:[r`$c=1/4$`, r`$c=0$`, r`$c=2$`, r`$c=-1/4$`],
  exp:r`Fixpoints solve $x^2-3x+2+c=0$ with discriminant $1-4c$. It vanishes at $c=1/4$; for $c>1/4$ there is no fixpoint. This is a (saddle-node) bifurcation.` },

{ id:'L4-03', lec:4, diff:2, topic:'Bifurcation',
  q:r`The graph shows $\dot x=(x-1)(x-2)+c$ for $c=0$, with its two fixpoints. What happens to the two fixpoints as $c$ is increased from 0 to $1/4$?`,
  fig:{ x:[0,3], y:[-0.45,1.4], xl:'x', yl:'dx/dt', ticks:true, curves:[ {fn:'(x-1)*(x-2)', c:'a', lab:'c = 0', labx:2.75, laby:0.1} ], pts:[ {x:1,y:0,fill:'n'}, {x:2,y:0,fill:'n'} ] },
  opts:[r`The stable and the unstable fixpoint approach each other, collide and annihilate`, r`The stable fixpoint becomes unstable and both remain`, r`They move apart from each other`, r`A third fixpoint appears between them`],
  exp:r`Increasing $c$ shifts the curve upward. The stable (left) and unstable (right) fixpoints move together and vanish at $c=1/4$. This is how a pulse can switch a bistable system.` },

{ id:'L4-04', lec:4, diff:2, topic:'Fixpoints in 2D',
  q:r`Find the fixpoint of $\dot x=-2x+y+5,\ \ \dot y=x-2y+5$.`,
  opts:[r`$(x,y)=(5,5)$`, r`$(x,y)=(0,0)$`, r`$(x,y)=(2.5,2.5)$`, r`$(x,y)=(10,10)$`],
  exp:r`Set $\dot x=\dot y=0$: from the first equation $y=2x-5$; inserted into the second: $x-4x+10+5=0\Rightarrow x=5$, $y=5$. (Here all arrows point toward it — a stable fixpoint.)` },

{ id:'L4-05', lec:4, diff:3, topic:'Fixpoint type',
  q:r`For $\dot x=2x+y-15,\ \dot y=-x-3y+20$, where is the fixpoint and what is its type? (Lecture slides)`,
  opts:[r`$(5,5)$, saddle — unstable`, r`$(5,5)$, stable node`, r`$(3,3)$, saddle`, r`$(5,5)$, stable spiral`],
  exp:r`$\dot x=\dot y=0$ gives $y=15-2x$ and $x+3y=20$, so $x=y=5$. Trajectories approach along one direction and leave along another: a saddle, which is unstable.` },

{ id:'L4-06', lec:4, diff:1, topic:'Nullclines',
  q:r`What is the <b>x-nullcline</b> of a two-dimensional system?`,
  opts:[r`The set of points where $\dot x=0$ (x does not change)`, r`The set of points where $x=0$`, r`The set of points where $\dot x=\dot y=0$`, r`The set of points where $\dot y=0$`],
  exp:r`Nullclines are obtained by setting a time derivative to zero. Where an x-nullcline and a y-nullcline intersect, both derivatives vanish: that is a fixpoint.` },

{ id:'L4-07', lec:4, diff:2, topic:'Toggle switch', src:'Exam HS21–24 · Q5',
  q:r`Two repressors: $\dot x=\frac{2}{1+y^4}-x$, $\dot y=\frac{2}{1+x^4}-y$. The nullclines are drawn. How many fixpoints exist, and how many are stable?`,
  fig:{ x:[0,2.4], y:[0,2.4], xl:'x', yl:'y',
    ticks:true,
    curves:[ {fx:'2/(1+y**4)', c:'a', lab:"x' = 0", laby:1.3, labx:0.28, lw:2.5}, {fn:'2/(1+x**4)', c:'b', lab:"y' = 0", labx:1.35, laby:0.2, lw:2.5} ],
    pts:[ {x:0.1177,y:1.9996,fill:'n'}, {x:1,y:1,fill:'n'}, {x:1.9996,y:0.1177,fill:'n'} ] },
  opts:[r`3 fixpoints, 2 stable`, r`3 fixpoints, all stable`, r`3 fixpoints, 1 stable`, r`1 fixpoint, stable`],
  exp:r`The nullclines cross at (0.12, 2.0), (1, 1) and (2.0, 0.12). The two asymmetric ones (one gene ON, one OFF) are stable; the symmetric one in the middle is a saddle (unstable). The circuit is bistable.` },

{ id:'L4-08', lec:4, diff:2, topic:'Memory in the toggle switch', src:'Exam HS21–24 · Q5c',
  q:r`Mutual repression: $\dot x=\frac{2}{1+y^n}-x$, $\dot y=\frac{2}{1+x^n}-y$. For which Hill coefficient can the circuit implement <b>cellular memory</b>?`,
  opts:[r`Only for $n>2$ (two stable fixpoints)`, r`Only for $n=1$`, r`For both $n=1$ and $n>2$`, r`For neither`],
  exp:r`For $n=1$ the nullclines cross only once, at (1,1): a single stable fixpoint, no memory. For $n>2$ they cross three times: two stable fixpoints, and the state depends on history.` },

{ id:'L4-09', lec:4, diff:2, topic:'Mutual activation', src:'Assignment 3 · Q4',
  q:r`Two transcription factors X and Y activate each other (Hill coefficients $n=4$). How does this compare with the toggle switch, in which they repress each other?`,
  fig:{ net:true, w:440, h:150, nodes:{ X:[50,70], Y:[175,70], X2:{x:265,y:70,lab:'X'}, Y2:{x:390,y:70,lab:'Y'} },
        edges:[ {a:'X',b:'Y',t:'+',bend:0.25}, {a:'Y',b:'X',t:'+',bend:0.25}, {a:'X2',b:'Y2',t:'-',bend:0.25}, {a:'Y2',b:'X2',t:'-',bend:0.25} ],
        texts:[ {x:112,y:140,t:'mutual activation'}, {x:328,y:140,t:'toggle switch'} ] },
  opts:[r`Also bistable and able to store memory, but the states are "both low" and "both high" instead of exclusive expression`, r`Also bistable, with exclusive expression: either X or Y is high`, r`Only one stable fixpoint, no memory`, r`The system oscillates`],
  exp:r`Mutual activation gives two stable states (both OFF / both ON) plus an unstable one in between. With Hill coefficients of 1 only one stable fixpoint (both ON) remains, so the memory is lost (Assignment 3, Q4e).` },

{ id:'L4-10', lec:4, diff:2, topic:'From diagram to equations', src:'Lecture 4 · Exam HS24 Q5a',
  q:r`Wiring diagram: X activates its own production (Hill, $n=1$); X activates the production of Y; Y <b>activates the removal</b> of X (dashed arrow = removal). Which model matches?`,
  fig:{ net:true, w:440, h:215, nodes:{ X:[150,88], Y:[320,88], D:{x:150,y:196,kind:'sink'} },
        edges:[ {a:'X',b:'X',t:'+',loop:'up'}, {a:'X',b:'Y',t:'+'}, {a:'X',b:'D',t:'f'}, {a:'Y',b:'@2',t:'+',bend:-0.15} ],
        texts:[ {x:140,y:178,t:'removal',a:'end',s:12} ] },
  opts:[r`$\dot x=\beta_x\frac{x}{x+K_{xx}}-(\alpha_x+\alpha_{xy}\,y)\,x,\quad \dot y=\beta_y\frac{x}{x+K_{xy}}-\alpha_y\,y$`,
        r`$\dot x=\beta_x\frac{x}{x+K_{xx}}-\alpha_x x,\quad \dot y=\beta_y\frac{x}{x+K_{xy}}-(\alpha_y+\alpha_{yx}\,x)\,y$`,
        r`$\dot x=\beta_x\frac{x}{x+K_{xx}}\cdot\frac{K_{yx}}{y+K_{yx}}-\alpha_x x,\quad \dot y=\beta_y\frac{x}{x+K_{xy}}-\alpha_y\,y$`,
        r`$\dot x=\beta_x-(\alpha_x+\alpha_{xy}\,y)\,x,\quad \dot y=\beta_y\frac{K_{xy}}{x+K_{xy}}-\alpha_y\,y$`],
  exp:r`Production of X: Hill term in x. Removal of X: passive ($\alpha_x$) plus active degradation by Y ($\alpha_{xy}y$). Production of Y: activated by X. The other options put the effect on the wrong target (removal of Y), make Y repress production, or drop the self-activation.` },

{ id:'L4-11', lec:4, diff:2, topic:'From equations to diagram', src:'Exam HS22–24 · Q7/Q5b',
  q:r`$\dot x=\dfrac{x}{1+x}-2xy,\qquad \dot y=\dfrac{x}{2+x}-y^2$. Which interaction is <b>not</b> encoded?`,
  opts:[r`Y represses the production of X`, r`X activates its own production`, r`Y enhances the removal of X`, r`X activates the production of Y`],
  exp:r`$x/(1+x)$ is self-activation of X; $-2xy$ is removal of X promoted by Y; $x/(2+x)$ is activation of Y's production by X. Y does not appear in the production term of X.` },

{ id:'L4-12', lec:4, diff:1, topic:'Oscillator ingredients',
  q:r`Which ingredients are required for a genetic oscillator (cf. the shower analogy)?`,
  opts:[r`Negative feedback, delay (slow variable) and ultrasensitivity`, r`Positive feedback, bistability and noise`, r`Cooperativity, high degradation and noise`, r`Autoregulation, a feed-forward loop and a third node`],
  exp:r`Like the badly regulated shower: negative feedback (you adjust the tap), delay (the water temperature responds late) and ultrasensitivity (an almost step-wise response) together lead to over-shooting in both directions.` },

{ id:'L4-13', lec:4, diff:3, topic:'Relaxation oscillator',
  q:r`In a two-variable relaxation oscillator, x is fast and y is slow. The x-nullcline (graph) has a valley and a peak, which separate a left, a middle and a right branch. Where must the fixpoint (its intersection with the y-nullcline) lie for the system to oscillate?`,
  fig:{ x:[-2.4,2.4], y:[-1.4,1.4], xl:'x (fast)', yl:'y (slow)',
    curves:[ {fn:'x-x**3/3', c:'a', lab:"x-nullcline", labx:1.95, laby:0.55} ],
    pts:[ {x:-1,y:-0.6667,lab:'valley'}, {x:1,y:0.6667,lab:'peak'} ] },
  opts:[r`On the middle branch of the x-nullcline between peak and valley, where it is unstable`, r`On the outer branch, right of the peak, where it is stable`, r`Anywhere, as long as there is exactly one fixpoint`, r`Only if the y-nullcline is also non-monotonic`],
  exp:r`If the fixpoint sits between peak and valley it is unstable: the system creeps along a branch, jumps quickly to the other branch at the peak/valley, and repeats forever. If the fixpoint lies on an outer branch the system settles there. A small parameter change can switch between these cases (bifurcation).` },

{ id:'L4-14', lec:4, diff:2, topic:'C. elegans oscillator', src:'Slides 5 · Stojanovski et al. 2022',
  q:r`In <i>C. elegans</i> an oscillating clock controls larval stage duration. Destabilising one oscillator component (faster degradation of BLMP-1) speeds up the oscillation. Growth is unchanged. What happens to the animals?`,
  opts:[r`They become smaller, because each larval stage ends at a smaller size`, r`They become larger`, r`Their size is unchanged`, r`Their development stops`],
  exp:r`Faster oscillations accelerate development with the same growth rate, so animals reach the next stage — and adulthood — at a smaller size.` },


/* ===================== MORE EXAM TOPICS (HS24) ===================== */
{ id:'X-01', lec:7, diff:1, topic:'Michaelis–Menten', src:'Exam HS24 · Q7',
  q:r`In the Michaelis–Menten approximation $\dfrac{dp}{dt}=V_{max}\dfrac{S}{K_M+S}$. At which substrate concentration is the rate half-maximal?`,
  opts:[r`$S=K_M$`, r`$S=V_{max}/2$`, r`$S=2K_M$`, r`$S=K_M/2$`],
  exp:r`At $S=K_M$ the rate is $V_{max}\cdot\frac12$. For $S\ll K_M$ the rate grows linearly with $S$; for $S\gg K_M$ it saturates at $V_{max}$.` },

{ id:'X-02', lec:7, diff:1, topic:'Michaelis–Menten',
  q:r`For $S\gg K_M$, how does the rate of product formation depend on the substrate concentration?`,
  opts:[r`It saturates at $\approx V_{max}$, independent of $S$`, r`It increases linearly with $S$`, r`It decreases towards zero`, r`It equals $K_M$`],
  exp:r`$S/(K_M+S)\to1$: all enzyme molecules are busy (saturated), and adding substrate does not increase the rate.` },

{ id:'X-03', lec:7, diff:2, topic:'Michaelis–Menten units',
  q:r`If $p$ is a concentration (M) and time is in seconds, what are the units of $K_M$ and $V_{max}$ in $\dfrac{dp}{dt}=V_{max}\dfrac{S}{K_M+S}$?`,
  opts:[r`$K_M$: M; $V_{max}$: M/s`, r`$K_M$: M/s; $V_{max}$: M`, r`$K_M$: 1/s; $V_{max}$: M`, r`Both: M/s`],
  exp:r`$S/(K_M+S)$ must be dimensionless, so $K_M$ has the units of a concentration (it is the half-saturating concentration). $V_{max}$ has the units of $dp/dt$.` },

{ id:'X-04', lec:7, diff:2, topic:'MAPK cascade with feedback', src:'Exam HS24 · Q8b',
  q:r`In a MAPK cascade with constant input, ERKp rises to a plateau. How does the response change when ERKp inhibits the phosphorylation of Raf (negative feedback)?`,
  opts:[r`The response may overshoot and then settle at a lower steady-state level`, r`ERKp settles at a higher level, but more slowly`, r`The system becomes bistable and ERKp remains at zero`, r`There is no change`],
  exp:r`Negative feedback reduces the activity of the upstream kinase once ERKp has built up, so ERKp comes down from its early peak to a lower plateau (adaptation). With enough delay and nonlinearity it can even oscillate.` },


/* ============================ LECTURE 5 ============================ */
{ id:'L5-01', lec:5, diff:2, topic:'Exponential growth', src:'Assignment 4 · Q1',
  q:r`Strain A doubles every 30 min, strain B every 33 min. Both start with 100 cells and grow exponentially without limitation. What is $n_A/n_B$ after 10 h?`,
  opts:[r`About 3.5`, r`About 1.1`, r`About 10`, r`About 100`],
  exp:r`$n_A/n_B=2^{10/0.5-10/0.55}=2^{20-18.18}=2^{1.82}\approx3.5$. After 5 h the ratio is 1.9, after 20 h it is 12.4 — a 10 % difference in growth time is amplified exponentially.` },

{ id:'L5-02', lec:5, diff:1, topic:'Competition', src:'Exam HS21 · Q6',
  q:r`Strain A doubles every 1 h, strain B every 2 h. You start with 100 cells of each and let them grow for 10 h without interaction and with unlimited nutrients. What is $n_A/n_B$?`,
  opts:[r`32`, r`5`, r`10`, r`1024`],
  exp:r`$n_A=100\cdot2^{10}$, $n_B=100\cdot2^{5}$, so $n_A/n_B=2^5=32$.` },

{ id:'L5-03', lec:5, diff:1, topic:'Early vs. late reproduction', src:'Exam HS21/22 · Q7/Q9a',
  q:r`Which strain has the faster rate of population increase?` + tbl([0,0,0,2,2,0,0],[0,0,0,3,3,0,0]),
  opts:[r`Strain B`, r`Strain A`, r`Both increase at the same rate`, r`Cannot be decided`], 
  exp:r`Both reproduce at the same ages, but B has more progeny each time, so it grows faster.` },

{ id:'L5-04', lec:5, diff:3, topic:'Early vs. late reproduction', src:'Exam HS21/22 · Q7/Q9c',
  q:r`Which strain has the faster rate of population increase?` + tbl([0,2,2,0,0,0,0],[0,0,0,0,0,3,3]),
  opts:[r`Strain A (earlier, fewer progeny)`, r`Strain B (later, more progeny)`, r`Both increase at the same rate`, r`Cannot be decided`],
  exp:r`Solving the Euler–Lotka equation $\sum_x m_x e^{-rx}=1$: A ($2e^{-2r}+2e^{-3r}=1$) gives $r\approx0.57$ per day, B ($3e^{-6r}+3e^{-7r}=1$) gives $r\approx0.28$ per day. Early offspring "earn compound interest" sooner.` },

{ id:'L5-05', lec:5, diff:3, topic:'Alternating environments', src:'Assignment 4 · Q2',
  q:r`Strain A adjusts to the environment: doubling time 1 h in both E1 and E2. Strain B is an E1 specialist: 0.5 h in E1, 10 h in E2. Let $f$ be the fraction of time spent in E1. For which $f$ is the long-run growth rate of A higher than that of B?`,
  opts:[r`$f<0.47$ (E1 is rare)`, r`$f>0.47$`, r`$f<0.1$`, r`For every $f$`],
  exp:r`$\mu_A=\ln2$; $\mu_B(f)=\ln2\,[2f+0.1(1-f)]=\ln2\,(0.1+1.9f)$. They are equal at $f^*=0.9/1.9\approx0.47$; A wins when E1 is occurring less than about 47 % of the time.` },

{ id:'L5-06', lec:5, diff:2, topic:'Optimal expression', src:'Assignment 4 · Q3',
  q:r`In environment B the growth rate depends on the expression level $x$ as $\mu_B(x)=-2(x-0.25)^2+1.125$ (graph); in environment A the optimum is $x^*_A=0.5$. A strain keeps $x=0.5$ in B. How large is its growth disadvantage compared with a strain adapted to B ($x^*_B=0.25$)?`,
  fig:{ x:[0,0.8], y:[0.4,1.25], xl:'expression x', yl:'growth rate μ_B', ticks:true, curves:[ {fn:'-2*(x-0.25)**2+1.125', c:'b'} ] },
  opts:[r`About 11 %`, r`About 50 %`, r`About 25 %`, r`None`],
  exp:r`$\mu_B(0.5)=-2(0.25)^2+1.125=1.0$ versus $\mu_B(0.25)=1.125$. The disadvantage is $0.125/1.125\approx11\,\%$ — enough for strong selection.` },

{ id:'L5-07', lec:5, diff:1, topic:'Optimal expression', src:'Exam HS23 · Q8b',
  q:r`Growth rates depend on the expression level $x$: $\mu_1(x)=-(x-1)^2+1$ in E1 and $\mu_2(x)=-1.5(x-2)^2+2$ in E2 (graph, in doublings per hour). Strain A keeps $x=x_1^*=1$ in both environments. What is its growth rate in E2?`,
  fig:envFig,
  opts:[r`0.5 h$^{-1}$`, r`1 h$^{-1}$`, r`2 h$^{-1}$`, r`$-0.5$ h$^{-1}$`],
  exp:r`$\mu_2(1)=-1.5(1-2)^2+2=0.5$ h$^{-1}$, compared with the maximum $\mu_2(2)=2$ h$^{-1}$.` },

{ id:'L5-08', lec:5, diff:2, topic:'Optimal expression', src:'Exam HS23 · Q8c',
  q:r`In environment E2, strain B (which adjusts its expression to the optimum) grows at $\mu_B=2$ h$^{-1}$ and strain A (which does not) at $\mu_A=0.5$ h$^{-1}$. The cells grow as $n(t)=n_0\,2^{\mu t}$. You start both with equal numbers in E2. When are there 8 times more cells of B than of A?`,
  opts:[r`After 2 h`, r`After 4 h`, r`After 1.5 h`, r`After 3 h`],
  exp:r`$n_B/n_A=2^{(2-0.5)t}=8=2^3\Rightarrow1.5\,t=3\Rightarrow t=2$ h.` },

{ id:'L5-09', lec:5, diff:2, topic:'Fluctuating environments', src:'Exam HS24 · Q6b',
  q:r`Growth rates depend on the expression level $x$: $\mu_1(x)=-(x-1)^2+1$ in E1 and $\mu_2(x)=-1.5(x-2)^2+2$ in E2 (graph, in doublings per hour). Strain A always keeps $x=2$, so it grows at $\mu_{1,A}=0$ in E1 and $\mu_{2,A}=2$ h$^{-1}$ in E2. Strain B adapts its expression ($\mu_1=1$, $\mu_2=2$ h$^{-1}$). The environment switches between E1 and E2 every hour. What is $n_B/n_A$ after 4 h, starting with equal numbers?`,
  fig:envFig,
  opts:[r`4`, r`2`, r`8`, r`16`],
  exp:r`In 4 h there are 2 h of E1 and 2 h of E2. B gains $2^{1\cdot2}$ on A in E1 (A does not grow), and nothing in E2 (both grow at 2 h$^{-1}$): $n_B/n_A=2^2=4$.` },

{ id:'L5-10', lec:5, diff:3, topic:'Fluctuating environments', src:'Exam HS24 · Q6b',
  q:r`The environment alternates every hour between E1 and E2. Strain B adapts its expression and grows at 1 doubling/h in E1 and 2 doublings/h in E2. Strain A does not grow at all in E1. What is the minimal growth rate $\mu_{2,A}'$ that A needs in E2 so that it is not out-competed by B in the long run?`,
  opts:[r`3 h$^{-1}$`, r`2 h$^{-1}$`, r`1.5 h$^{-1}$`, r`4 h$^{-1}$`],
  exp:r`Long-run growth rate = average over the cycle. B: $(1+2)/2=1.5$. A: $(0+\mu'_{2,A})/2\ge1.5\Rightarrow\mu'_{2,A}\ge3$ h$^{-1}$.` },

{ id:'L5-11', lec:5, diff:2, topic:'Growth model: R and C', src:'Towbin et al. 2017 · Lecture 5',
  q:r`In the simple growth model the proteome consists of ribosomes R and metabolic enzymes C ($R+C=1$); C produces the intermediate x, ribosomes turn x into protein. The graph sketches the growth rate as a function of R. Why is growth maximal at an intermediate ribosome fraction?`,
  fig:{ x:[0,1], y:[0,1.15], xl:'ribosome fraction R  (C = 1 − R)', yl:'growth rate (schematic)', xticks:[[0,'0'],[0.5,'0.5'],[1,'1']], yticks:[],
    curves:[ {fn:'4*x*(1-x)', c:'c'} ] },
  opts:[r`Too few ribosomes limit protein synthesis; too few enzymes starve the ribosomes of the substrate x`, r`Ribosomes become toxic at high levels`, r`Enzymes C are cheap, so a larger C is always better`, r`Growth is highest when $R=1$`],
  exp:r`Growth rate is the rate at which ribosomes convert x into protein. Many C but few R leaves ribosomes saturated and surplus C wasted; many R but few C leaves ribosomes idle for lack of x. The optimum balances both.` },

{ id:'L5-12', lec:5, diff:2, topic:'Environment quality',
  q:r`In the proteome-allocation growth model (ribosomes R and metabolic enzymes C, $R+C=1$; C produces the intermediate x at a rate proportional to $\beta C$), the environment gets better: higher $\beta$, so producing x requires less C. How does the growth-maximising enzyme fraction C change?`,
  opts:[r`It decreases (more ribosomes can be afforded), and the growth rate is higher`, r`It increases`, r`It is unchanged`, r`It oscillates`],
  exp:r`Better environment means less C is needed per unit of x, so the proteome can shift towards ribosomes. The maxima for different $\beta$ lie on a near-linear "C-line".` },

{ id:'L5-13', lec:5, diff:2, topic:'Feedback control of allocation',
  q:r`Which regulatory interaction lets <i>E. coli</i> adjust C to the optimal level in many environments?`,
  opts:[r`Negative feedback: the intermediate x represses the synthesis of C (via CRP–cAMP)`, r`Positive feedback: x activates the synthesis of C`, r`Constitutive expression of C`, r`A feed-forward loop from R to C`],
  exp:r`If C is too high, x accumulates, and repression of further C synthesis lowers C. If C is too low, x is depleted, repression is relieved, and C synthesis rises. CRP is activated when the internal carbon pool is depleted.` },

{ id:'L5-14', lec:5, diff:3, topic:'Galactose exception',
  q:r`Why do <i>E. coli</i> grow suboptimally on galactose, with too much C and too little R?`,
  opts:[r`<i>galETK</i> is under non-monotonic control by CRP (I1-FFL via GalS): when starved cells raise CRP, <i>galETK</i> falls, which aggravates the starvation`, r`Galactose is toxic to the cells`, r`CRP is absent on galactose`, r`Galactose genes are under positive autoregulation`],
  exp:r`The wrong sign of the response at high CRP creates a vicious cycle until growth is very slow. In <i>galS</i> mutants the FFL is broken, control is monotonic and cells grow optimally, as the model predicts.` },


/* ============================ LECTURE 6 ============================ */
{ id:'L6-01', lec:6, diff:1, topic:'Coefficient of variation',
  q:r`Population A has expression values 3, 4, 5, 6, 7; population B has 1, 3, 5, 7, 9 (graph). Both have a mean of 5. Which statement is correct?`,
  fig:{ x:[0,10], y:[0.4,2.6], h:190, xl:'expression', xticks:[[1,'1'],[3,'3'],[5,'5'],[7,'7'],[9,'9']], yticks:[[1,'B'],[2,'A']], vlines:[{x:5,dash:true}],
    pts:[3,4,5,6,7].map(x=>({x,y:2,fill:true})).concat([1,3,5,7,9].map(x=>({x,y:1,fill:true}))) },
  opts:[r`B has the larger CV (more heterogeneous)`, r`A has the larger CV`, r`Both have the same CV`, r`CVs cannot be compared when the means are equal`],
  exp:r`$\mathrm{CV}=\mathrm{std}/\mathrm{mean}$. With equal means, the broader distribution (B) has the larger standard deviation and thus the larger CV.` },

{ id:'L6-02', lec:6, diff:1, topic:'Coefficient of variation',
  q:r`A new microscope setting makes all measured fluorescence values 10 times brighter. What happens to the CV of a population?`,
  opts:[r`It is unchanged (std and mean both scale by 10)`, r`It increases 10-fold`, r`It decreases 10-fold`, r`It increases $\sqrt{10}$-fold`],
  exp:r`The CV is dimensionless: multiplying all values by a constant multiplies both standard deviation and mean by it.` },

{ id:'L6-03', lec:6, diff:2, topic:'Poisson noise',
  q:r`Two genes have an average of 5 and 500 mRNA molecules per cell, respectively. Which gene shows the larger relative (Poisson) noise from random mRNA numbers?`,
  opts:[r`The gene with 5 mRNAs`, r`The gene with 500 mRNAs`, r`Both equal`, r`Poisson noise depends only on the protein half-life`],
  exp:r`For Poisson statistics std $=\sqrt{m}$, so CV $=1/\sqrt m$: $\approx0.45$ for 5 molecules, $\approx0.045$ for 500. Small molecule numbers cause large relative noise.` },

{ id:'L6-04', lec:6, diff:2, topic:'Bursty transcription',
  q:r`Two genes have the same average mRNA level. In gene 1 the promoter switches between ON and OFF states and transcribes in bursts (two-state model); gene 2 is transcribed constitutively. How do the noise levels compare?`,
  opts:[r`Gene 1 (bursty) is noisier than Poisson noise alone would predict`, r`Gene 1 is less noisy`, r`The same, since the means are the same`, r`Bursting only matters for protein, not mRNA`],
  exp:r`Bursts of mRNA production followed by silence add variability beyond the Poisson noise of constitutive expression.` },

{ id:'L6-05', lec:6, diff:2, topic:'Intrinsic vs. extrinsic noise',
  q:r`Two identical promoters drive CFP and YFP in the same cell. In many cells both reporters are high or low together, with little independent difference. Which noise source dominates?`,
  opts:[r`Extrinsic noise (shared factors such as ribosomes, polymerase, cell size)`, r`Intrinsic noise (random events at each gene)`, r`Measurement noise only`, r`There is no noise`],
  exp:r`Extrinsic noise affects all genes in a cell in the same direction. Intrinsic noise would make the two identical reporters differ independently within the same cell.` },

{ id:'L6-06', lec:6, diff:1, topic:'Noise and feedback', src:'Slides 2 · Becskei & Serrano 2000',
  q:r`How does negative autoregulation affect the cell-to-cell variability (CV) of expression, compared with an unregulated gene of the same mean?`,
  opts:[r`It reduces noise`, r`It increases noise`, r`It has no effect on noise`, r`It makes expression bimodal`],
  exp:r`Negative feedback pulls fluctuations back towards the set point, so the distribution is narrower (Becskei & Serrano 2000).` },

{ id:'L6-07', lec:6, diff:2, topic:'Bimodality', src:'Slides 2 · Ozbudak et al. 2004',
  q:r`At intermediate inducer concentration (TMG), cells of the lac operon circuit split into two subpopulations of low and high expression. Which circuit property explains this best?`,
  opts:[r`Positive feedback creating bistability (and hysteresis)`, r`Negative autoregulation`, r`An incoherent feed-forward loop`, r`Fast mRNA degradation`],
  exp:r`Bimodal distributions at intermediate input are the signature of bistable systems with positive feedback, where individual cells settle in one of two stable states.` },

{ id:'L6-08', lec:6, diff:2, topic:'Size uniformity', src:'Slides 5 · C. elegans',
  q:r`Individual <i>C. elegans</i> differ in growth rate by about 10 %. Nevertheless, adult sizes differ only by about 10 % as well, much less than exponential growth would predict. What explains this?`,
  opts:[r`Slow growers grow for longer, so all individuals undergo the same fold-change in body volume`, r`Growth rates do not really differ`, r`Size is determined only by the amount of food`, r`Fast growers stop growing early because they run out of food`],
  exp:r`Exponential growth would turn a 10 % rate difference into a roughly 60 % size difference. Developmental timing is coordinated with growth, so each animal reaches the same final size.` },

{ id:'L6-09', lec:6, diff:2, topic:'Proportion control', src:'Slides 6 · pharynx vs. body',
  q:r`Inhibiting growth of the <i>C. elegans</i> pharynx alone also slows body growth, and pharynx-to-body proportions deviate by less than about 5–8 %. If tissues grew <i>independently</i>, what would you expect?`,
  opts:[r`Strong divergence of pharynx-to-body proportions, so growth must be coordinated between tissues`, r`The same near-perfect proportions`, r`Larger worms with larger pharynx`, r`Nothing, since pharynx growth is not exponential`],
  exp:r`Two independent exponentially growing tissues would drift apart rapidly after growth inhibition. The observed robustness implies coordination (systemic feedback) between tissues.` },

{ id:'L6-10', lec:6, diff:1, topic:'Bet hedging', src:'Slides 6 · Balaban et al. 2004',
  q:r`Which statement describes antibiotic <b>persisters</b> (Balaban et al. 2004) best?`,
  opts:[r`A small subpopulation of slow-growing, antibiotic-tolerant cells, generated stochastically — a bet-hedging strategy`, r`Genetically resistant mutants`, r`Dead cells that stain positive`, r`Cells that acquired a plasmid with a resistance gene`],
  exp:r`Persisters are phenotypic, non-inherited variants. A few cells in a clonal population are in a dormant state, ensuring survival of the population if an antibiotic arrives.` }

];

return {
  title: 'Systems Biology',
  description: 'Exam-style multiple-choice questions on the Systems Biology lectures, with explanations. Practise on your own, or join the live quiz during the lecture.',
  unit: 'Lecture',
  lectures: LECTURES,
  questions: QUESTIONS
};
});
