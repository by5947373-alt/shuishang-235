/* AI 客服小視窗。伺服器沒設 ANTHROPIC_API_KEY 時整個按鈕不會出現。 */
(function(){
  var history = [];       // 只留在這個分頁的記憶體裡，重新整理就清空
  var busy = false;
  var root, log, input, send;

  fetch('api/chat-enabled', {cache:'no-store'})
    .then(function(r){ return r.ok ? r.json() : {enabled:false}; })
    .catch(function(){ return {enabled:false}; })
    .then(function(s){ if(s.enabled) build(); });

  function el(tag, cls, text){
    var e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text != null) e.textContent = text;   // 一律用 textContent，不組 HTML
    return e;
  }

  function build(){
    root = el('div', 'chat');
    root.innerHTML =
      '<button type="button" class="chat-fab" aria-expanded="false" aria-controls="chatPanel">' +
        '<svg viewBox="0 0 40 40" aria-hidden="true" width="26" height="26">' +
        '<circle cx="20" cy="17" r="9" fill="var(--sun)" stroke="#3E2B18" stroke-width="2.6"/>' +
        '<g stroke="#3E2B18" stroke-width="2.6" stroke-linecap="round">' +
        '<path d="M20 3.5v-1M20 31.5v1M6.5 17h-1M34.5 17h-1"/>' +
        '<path d="M10.4 7.4l-.8-.8M30.4 27.4l.8.8M29.6 7.4l.8-.8M10.4 26.6l-.8.8"/></g></svg>' +
        '<span>問問水上</span>' +
      '</button>' +
      '<section class="chat-panel" id="chatPanel" hidden aria-label="AI 客服">' +
        '<header class="chat-head">' +
          '<div><b>問問水上</b><span>AI 客服・回答依據網站資料</span></div>' +
          '<button type="button" class="chat-x" aria-label="關閉">✕</button>' +
        '</header>' +
        '<div class="chat-log" id="chatLog" role="log" aria-live="polite"></div>' +
        '<form class="chat-form">' +
          '<input class="chat-input" id="chatInput" maxlength="500" autocomplete="off" ' +
                 'placeholder="例如：有什麼推薦的仙草料理？">' +
          '<button class="chat-send" type="submit" id="chatSend">送出</button>' +
        '</form>' +
        '<p class="chat-note">AI 有可能出錯，重要資訊（營業時間、價格）請以店家公告為準。</p>' +
      '</section>';
    document.body.appendChild(root);

    log = root.querySelector('#chatLog');
    input = root.querySelector('#chatInput');
    send = root.querySelector('#chatSend');
    var fab = root.querySelector('.chat-fab');
    var panel = root.querySelector('.chat-panel');

    function open(v){
      panel.hidden = !v;
      fab.setAttribute('aria-expanded', String(v));
      if(v){
        if(!log.childElementCount){
          say('bot', '嗨！我是水上的線上客服，可以問我美食、景點、農產或怎麼安排行程。');
          ['有什麼仙草做的東西可以吃？', '帶小孩來玩推薦去哪？', '南靖糖廠怎麼去？'].forEach(chip);
        }
        input.focus();
      }
    }
    fab.onclick = function(){ open(panel.hidden); };
    root.querySelector('.chat-x').onclick = function(){ open(false); };
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && !panel.hidden){ open(false); fab.focus(); }
    });
    root.querySelector('.chat-form').onsubmit = function(e){ e.preventDefault(); ask(input.value); };
  }

  function say(who, text){
    var b = el('div', 'chat-msg chat-' + who, text);
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }
  function chip(text){
    var row = log.querySelector('.chat-chips') || (function(){
      var r = el('div', 'chat-chips'); log.appendChild(r); return r;
    })();
    var b = el('button', 'chat-chip', text);
    b.type = 'button';
    b.onclick = function(){ row.remove(); ask(text); };
    row.appendChild(b);
  }

  function ask(text){
    text = (text || '').trim();
    if(!text || busy) return;
    var chips = log.querySelector('.chat-chips');
    if(chips) chips.remove();
    input.value = '';
    say('me', text);
    busy = true; send.disabled = true;
    var wait = say('bot chat-wait', '想一下⋯');

    fetch('api/chat', {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({message: text, history: history})
    }).then(function(r){
      return r.json().then(function(j){ return {ok:r.ok, j:j}; });
    }).then(function(res){
      busy = false; send.disabled = false; wait.remove();
      if(!res.ok){ say('bot chat-err', res.j.error || '暫時無法回應，請稍後再試。'); return; }
      say('bot', res.j.reply);
      history.push({role:'user', content:text}, {role:'assistant', content:res.j.reply});
      if(history.length > 12) history = history.slice(-12);
      input.focus();
    }).catch(function(err){
      busy = false; send.disabled = false; wait.remove();
      say('bot chat-err', '連不上伺服器：' + err.message);
    });
  }
})();
