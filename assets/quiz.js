/* 風土百草堂・問診
   題庫與診斷資料由 build.js 從 src/quiz.json 產生成 assets/quiz-data.js。
   要改題目或藥引，改那個 JSON 再跑 build.js。 */
(function(){
  var D = window.SHUISHANG_QUIZ;
  var root = document.getElementById('quiz');
  if(!D || !root) return;

  var CN = ['零','一','二','三','四','五','六','七','八','九','十'];
  var idx = 0;
  var answers = new Array(D.questions.length).fill(null);
  var dxKey = null;
  var picks = [null,null,null,null];

  var $ = function(s){ return root.querySelector(s); };
  function el(tag, cls, text){
    var e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text != null) e.textContent = text;   // 一律 textContent，內容不會被當成標籤
    return e;
  }
  function show(name){
    ['cover','ask','result'].forEach(function(k){
      root.querySelector('#q-'+k).hidden = (k !== name);
    });
  }

  /* ── 問題 ── */
  function renderQuestion(){
    var Q = D.questions[idx];
    $('#q-num').textContent = '第' + CN[idx+1] + '帖 ／ 共十帖';
    var dots = $('#q-dots'); dots.innerHTML = '';
    D.questions.forEach(function(_, i){
      var d = el('span', 'q-dot' + (i < idx ? ' done' : '') + (i === idx ? ' now' : ''));
      dots.appendChild(d);
    });

    var card = $('#q-card');
    card.innerHTML = '';
    card.appendChild(el('h2', 'q-text', Q.q));
    var opts = el('div', 'q-opts');
    Q.o.forEach(function(t, i){
      var b = el('button', 'q-opt' + (answers[idx] === D.keys[i] ? ' picked' : ''), t);
      b.type = 'button';
      b.onclick = function(){
        answers[idx] = D.keys[i];
        if(idx < D.questions.length - 1){ idx++; renderQuestion(); }
        else finish();
      };
      opts.appendChild(b);
    });
    card.appendChild(opts);

    $('#q-back').disabled = (idx === 0);
    card.classList.remove('fade'); void card.offsetWidth; card.classList.add('fade');
  }

  /* ── 計分：取最高票，平手時以較前面的答案優先 ── */
  function tally(){
    var count = {};
    D.keys.forEach(function(k){ count[k] = 0; });
    answers.forEach(function(a){ if(a) count[a]++; });
    var best = D.keys[0];
    D.keys.forEach(function(k){ if(count[k] > count[best]) best = k; });
    return best;
  }

  /* ── 診斷書 ── */
  function finish(){
    dxKey = tally();
    picks = [null,null,null,null];
    var R = D.results[dxKey];
    var box = $('#q-result');
    box.innerHTML = '';

    var head = el('div', 'dx-head');
    head.appendChild(el('p', 'en', 'DIAGNOSIS ' + R.no.replace(/\D/g, '')));
    head.appendChild(el('h2', 'dx-name', R.name));
    head.appendChild(el('p', 'dx-judge', R.judge));
    if(R.plain) head.appendChild(el('p', 'dx-plain', R.plain));
    box.appendChild(head);

    [['症狀剖析', R.symptom], ['漢方處方解說', R.rx]].forEach(function(pair){
      var s = el('div', 'dx-sec');
      s.appendChild(el('h3', null, pair[0]));
      s.appendChild(el('p', null, pair[1]));
      box.appendChild(s);
    });

    box.appendChild(el('h3', 'dx-pick-h', '風土四味・各挑一帖'));
    R.wei.forEach(function(w, wi){
      var g = el('div', 'wei');
      var top = el('div', 'wei-top');
      top.appendChild(el('span', 'wei-t', w.t));
      top.appendChild(el('span', 'wei-s', w.s));
      g.appendChild(top);
      var list = el('div', 'wei-list');
      w.items.forEach(function(it, ii){
        var b = el('button', 'pick');
        b.type = 'button';
        b.setAttribute('aria-pressed', 'false');
        b.appendChild(el('span', 'pick-n', it.n));
        b.appendChild(el('span', 'pick-src', it.src));
        b.appendChild(el('span', 'pick-fit', '適合：' + it.fit));
        b.onclick = function(){
          picks[wi] = ii;
          [].forEach.call(list.children, function(c, ci){
            c.classList.toggle('picked', ci === ii);
            c.setAttribute('aria-pressed', String(ci === ii));
          });
          $('#q-notice').textContent = '';
        };
        list.appendChild(b);
      });
      g.appendChild(list);
      box.appendChild(g);
    });

    var acts = el('div', 'dx-acts');
    var make = el('button', 'btn btn-sun', '煎出我的藥單');
    make.type = 'button'; make.onclick = makeSlip;
    var again = el('button', 'btn', '重新問診');
    again.type = 'button'; again.onclick = restart;
    acts.appendChild(make); acts.appendChild(again);
    box.appendChild(acts);
    box.appendChild(el('p', 'q-notice', '')).id = 'q-notice';
    box.appendChild(el('div', null)).id = 'q-slip';

    show('result');
    root.scrollIntoView({block:'start'});
  }

  /* ── 藥單 ── */
  function makeSlip(){
    var R = D.results[dxKey];
    var missing = [];
    picks.forEach(function(p, i){ if(p === null) missing.push('【' + R.wei[i].t + '】'); });
    if(missing.length){
      document.getElementById('q-notice').textContent = '尚有 ' + missing.join('、') + ' 未抓藥。';
      return;
    }
    var d = new Date();
    var stamp = d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0');

    var slip = el('div', 'slip fade');
    var top = el('div', 'slip-top');
    top.appendChild(el('p', 'slip-title', '水上風土藥單'));
    top.appendChild(el('p', 'slip-meta', R.no + '　·　' + stamp));
    slip.appendChild(top);
    slip.appendChild(el('p', 'slip-dx', R.name));

    var list = el('ol', 'slip-list');
    picks.forEach(function(p, i){
      var w = R.wei[i], it = w.items[p];
      var li = el('li');
      li.appendChild(el('span', 'slip-k', w.t));
      li.appendChild(el('span', 'slip-n', it.n));
      li.appendChild(el('span', 'slip-place', it.src));
      list.appendChild(li);
    });
    slip.appendChild(list);
    slip.appendChild(el('p', 'slip-note', '此帖以水上風土為引，行前請先向店家確認營業時間。'));

    var foot = el('div', 'slip-foot');
    foot.appendChild(el('span', null, '23.5° 剛剛好的城市　·　嘉義水上'));
    var seal = el('span', 'slip-seal');
    seal.appendChild(el('span', null, '水上'));
    seal.appendChild(el('span', null, '風土'));
    foot.appendChild(seal);
    slip.appendChild(foot);

    var box = document.getElementById('q-slip');
    box.innerHTML = '';
    box.appendChild(slip);
    var pr = el('button', 'btn noprint', '列印／另存 PDF');
    pr.type = 'button'; pr.onclick = function(){ window.print(); };
    box.appendChild(pr);
    slip.scrollIntoView({block:'center', behavior:'smooth'});
  }

  function restart(){
    idx = 0;
    answers.fill(null);
    dxKey = null;
    picks = [null,null,null,null];
    show('ask');
    renderQuestion();
  }

  $('#q-start').onclick = function(){ show('ask'); renderQuestion(); };
  $('#q-back').onclick = function(){ if(idx > 0){ idx--; renderQuestion(); } };
})();
