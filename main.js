// タブ状態
const state = { tab: 'ta' };
const elQ = document.getElementById('q');
const elBtn = document.getElementById('btnSearch');
const elRes = document.getElementById('results');
const elBm = document.getElementById('bmList');
for (const b of document.querySelectorAll('.tab')){
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    state.tab = b.dataset.tab;
    elQ.focus();
  });
}
elBtn.addEventListener('click', ()=> doSearch());
elQ.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ doSearch(); }});
function card({title,desc,url,source}){
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(desc||'')}</p>
    <div class="meta">出典：${escapeHtml(source)}</div>
    <div class="actions">
      <a class="btn" href="${url}" target="_blank" rel="noopener">開く</a>
      <button class="btn" data-url="${url}" data-title="${escapeHtml(title)}">ブックマーク</button>
    </div>`;
  div.querySelector('button.btn').addEventListener('click', (e)=>{
    const u = e.currentTarget.getAttribute('data-url');
    const t = e.currentTarget.getAttribute('data-title');
    saveBookmark(t,u);
  });
  return div;
}
function doSearch(){
  const q = elQ.value.trim();
  if(!q){ elQ.focus(); return; }
  elRes.innerHTML = `<p>検索中…</p>`;
  if (state.tab==='nta' || state.tab==='ta'){
    const query = encodeURIComponent(q + (state.tab==='ta' ? ' タックスアンサー' : ''));
    const url = `https://search.nta.go.jp/?q=${query}`;
    elRes.innerHTML = '';
    elRes.appendChild(card({
      title: `国税庁 公式検索で「${q}」を開く`,
      desc: state.tab==='ta' ? 'タックスアンサーを優先した検索ワードで開きます。' : '国税庁サイト全体の検索結果を表示します。',
      url,
      source: '国税庁 公式サイト内検索'
    }));
    if(state.tab==='ta'){
      elRes.appendChild(card({
        title:'タックスアンサー（公式）トップを開く',
        desc:'「キーワードから探す」欄でも検索できます。',
        url:'https://www.nta.go.jp/taxes/shiraberu/taxanswer/index2.htm',
        source:'国税庁 タックスアンサー'
      }));
    }
  }
  else if (state.tab==='laws'){
    searchLaws(q);
  }
}
async function searchLaws(q){
  try{
    const resp = await fetch(`https://laws.e-gov.go.jp/api/2/keyword?keyword=${encodeURIComponent(q)}`);
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const data = await resp.json();
    const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.results) ? data.results : []);
    elRes.innerHTML = '';
    if(list.length===0){ elRes.innerHTML = '<p>一致する法令が見つかりませんでした。</p>'; return; }
    list.slice(0,10).forEach(item=>{
      const lawId = item.law_id || item.lawId || item.law_num || '';
      const name = item.law_name || item.lawName || item.title || '法令';
      const desc = item.summary || '';
      const detailUrl = `https://laws.e-gov.go.jp/api/2/law_data/${encodeURIComponent(lawId)}`;
      const openUi = `https://laws.e-gov.go.jp/`;
      const c = card({ title: name, desc: desc || 'e‑Gov 法令APIの結果', url: openUi, source: 'e‑Gov（デジタル庁）' });
      const p = document.createElement('p');
      p.textContent = '条文の抜粋を取得中…';
      c.appendChild(p);
      elRes.appendChild(c);
      fetch(detailUrl).then(r=>r.json()).then(j=>{
        const text = findFirstSentence(j);
        p.textContent = text ? `抜粋：${text}` : '（抜粋取得なし）';
      }).catch(()=>{ p.textContent='（抜粋取得なし）'; });
    });
  }
  catch(err){
    elRes.innerHTML = '';
    elRes.appendChild(card({
      title:'法令キーワード検索（e‑Gov 公式サイト）を開く',
      desc:'API取得に失敗したため、公式サイトを表示します。',
      url:'https://laws.e-gov.go.jp/',
      source:'e‑Gov（デジタル庁）'
    }));
  }
}
function findFirstSentence(obj){
  try{
    const s = JSON.stringify(obj);
    const m = s.match(/[　\s"]([぀-ヿ一-鿿][^\。]{20,120})\。/);
    return m ? m[1] + '。' : '';
  }catch(e){return ''}
}
function escapeHtml(str){
  return (str||'').replace(/[&<>"']/g, s=>({"&":"&amp;","<":"&lt;",
  ">":"&gt;",""":"&quot;","'":"&#39;"}[s]));
}
function loadBookmarks(){
  const arr = JSON.parse(localStorage.getItem('tsutsui_bm')||'[]');
  elBm.innerHTML = '';
  arr.forEach((x,i)=>{
    const li = document.createElement('li');
    li.innerHTML = `<a href="${x.url}" target="_blank" rel="noopener">${escapeHtml(x.title)}</a>`+`<button data-i="${i}">削除</button>`;
    li.querySelector('button').addEventListener('click', (e)=>{
      const idx = +e.currentTarget.getAttribute('data-i');
      const cur = JSON.parse(localStorage.getItem('tsutsui_bm')||'[]');
      cur.splice(idx,1); localStorage.setItem('tsutsui_bm', JSON.stringify(cur));
      loadBookmarks();
    });
    elBm.appendChild(li);
  });
}
function saveBookmark(title,url){
  const cur = JSON.parse(localStorage.getItem('tsutsui_bm')||'[]');
  if(cur.find(x=>x.url===url)) return;
  cur.unshift({title,url});
  if(cur.length>100) cur.length = 100;
  localStorage.setItem('tsutsui_bm', JSON.stringify(cur));
  loadBookmarks();
}
loadBookmarks();
