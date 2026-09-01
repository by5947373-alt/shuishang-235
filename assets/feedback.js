/* 聯絡頁的建議表單。沒有這支程式時表單不會送出（有 noscript 說明）。 */
(function(){
  var form = document.getElementById('fbForm');
  if(!form) return;
  var out = document.getElementById('fbMsgOut');
  var btn = document.getElementById('fbSend');
  var msg = document.getElementById('fbMsg');
  var count = document.getElementById('fbCount');

  msg.addEventListener('input', function(){ count.textContent = msg.value.length; });

  function say(text, kind){
    out.textContent = text;
    out.className = 'fb-msg' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var body = {
      name: form.name.value,
      email: form.email.value,
      message: form.message.value,
      website: form.website.value,     // 蜜罐：正常人看不到這一欄
      page: location.pathname
    };
    if(!body.message.trim()){
      msg.setAttribute('aria-invalid','true'); msg.focus();
      return say('請先寫點什麼再送出。', 'err');
    }
    msg.removeAttribute('aria-invalid');
    btn.disabled = true;
    say('送出中…');

    fetch('api/feedback', {
      method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body)
    }).then(function(r){
      return r.json().then(function(j){ return {ok:r.ok, j:j}; });
    }).then(function(res){
      btn.disabled = false;
      if(!res.ok) return say(res.j.error || '送出失敗，請稍後再試。', 'err');
      form.reset(); count.textContent = '0';
      say('收到了，謝謝你的建議！', 'ok');
    }).catch(function(err){
      btn.disabled = false;
      say('連不上伺服器：' + err.message, 'err');
    });
  });
})();
