const { useState, useEffect, useRef, useMemo, useCallback } = React;

const PAGE = window.PAGE || 'site';           // 'site' | 'admin'
const DATA_BASE = PAGE === 'admin' ? '../' : '';

/* ============================ Dữ liệu ============================ */
const LS_KEY = 'giapha_ctdan2308_v1';

function emptyData(){
  return { tenDongHo:"Gia phả dòng họ", chiPhai:"", khauHieu:"", lichSu:"",
    nhaTho:{ten:"Nhà thờ tổ",diaChi:"",mapEmbed:"",lat:"",lng:"",moTa:""},
    thanhVien:[], suKien:[], tinTuc:[] };
}

async function loadInitialData(){
  try{
    const ls = localStorage.getItem(LS_KEY);
    if(ls) return JSON.parse(ls);
  }catch(e){}
  try{
    const res = await fetch(DATA_BASE + 'data/giapha.json', {cache:'no-store'});
    if(res.ok) return await res.json();
  }catch(e){}
  if(window.GIAPHA_SEED) return window.GIAPHA_SEED;
  return emptyData();
}

const uid = (p='id') => p + '-' + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-3);

/* ============================ Cây & quan hệ ============================ */
function buildIndex(members){
  const byId = {}; members.forEach(m => byId[m.id] = m);
  const bloods = members.filter(m => !m.spouseOfId);
  const childrenOf = id => bloods.filter(m => m.parentId === id)
    .sort((a,b)=> (a.conThuTu||99)-(b.conThuTu||99) || (num(a.namSinh)-num(b.namSinh)));
  const spousesOf = id => members.filter(m => m.spouseOfId === id);
  const roots = bloods.filter(m => !m.parentId);
  return { byId, bloods, childrenOf, spousesOf, roots };
}
const num = s => { const n = parseInt(String(s||'').replace(/\D/g,''),10); return isNaN(n)?0:n; };

function depthOf(id, byId){
  let d=0, cur=byId[id];
  while(cur && cur.parentId){ d++; cur=byId[cur.parentId]; }
  return d;
}
function ancestorsPath(id, byId){
  const p=[]; let cur=byId[id];
  while(cur){ p.push(cur.id); cur = cur.parentId? byId[cur.parentId]:null; }
  return p;
}
function lca(aId, bId, byId){
  const setA = new Set(ancestorsPath(aId, byId));
  let cur = byId[bId];
  while(cur){ if(setA.has(cur.id)) return cur.id; cur = cur.parentId? byId[cur.parentId]:null; }
  return null;
}

const TU_TREN = ["", "Cha/Mẹ", "Ông/Bà", "Cụ", "Kỵ", "Tổ"];
const TU_DUOI = ["", "Con", "Cháu", "Chắt", "Chút", "Chít"];

function xungHo(aId, bId, byId){
  if(!aId || !bId) return "";
  if(aId === bId) return "Chính bản thân";
  const A = byId[aId], B = byId[bId];
  if(!A || !B) return "";
  const g = lca(aId, bId, byId);
  const dA = depthOf(aId, byId), dB = depthOf(bId, byId);
  const gd = depthOf(g, byId);
  const upA = dA - gd;
  const upB = dB - gd;
  const gioiA = A.gioiTinh === 'nu' ? 'nu':'nam';

  if(g === aId){
    const k = upB - upA;
    const t = TU_TREN[k] || `Tổ đời trên ${k}`;
    return capGioi(t, gioiA);
  }
  if(g === bId){
    const k = upA - upB;
    const t = TU_DUOI[k] || `Hậu duệ đời dưới ${k}`;
    return t;
  }
  const genDiff = upB - upA;
  if(genDiff === 0){
    if(upA === 1){ return anhChiEm(A, B, gioiA); }
    return anhChiEm(A, B, gioiA) + " (họ)";
  }
  if(genDiff > 0){
    if(genDiff === 1){
      const older = branchOlder(aId, bId, g, byId);
      if(gioiA === 'nam') return (older? "Bác" : "Chú") + " (họ)";
      return (older? "Bác gái" : "Cô/Dì") + " (họ)";
    }
    const t = TU_TREN[genDiff+1] || `Bậc trên ${genDiff}`;
    return capGioi(t, gioiA) + " (họ)";
  }
  const k = -genDiff;
  const t = TU_DUOI[k+1] || `Đời dưới ${k}`;
  return t + " (họ)";
}
function capGioi(t, gioi){
  if(t.includes('/')){ const [nam,nu]=t.split('/'); return gioi==='nu'?nu:nam; }
  return t;
}
function anhChiEm(A, B, gioiA){
  const yA = num(A.namSinh)||A.conThuTu||0, yB = num(B.namSinh)||B.conThuTu||0;
  const older = yA && yB ? yA < yB : (A.conThuTu||99) < (B.conThuTu||99);
  if(older) return gioiA==='nu' ? "Chị" : "Anh";
  return "Em";
}
function branchOlder(aId, bId, g, byId){
  const brA = childToward(aId, g, byId), brB = childToward(bId, g, byId);
  if(!brA || !brB) return true;
  const ya = num(byId[brA].namSinh)||byId[brA].conThuTu||99;
  const yb = num(byId[brB].namSinh)||byId[brB].conThuTu||99;
  return ya <= yb;
}
function childToward(id, g, byId){
  let cur = byId[id], prev=null;
  while(cur && cur.id!==g){ prev=cur.id; cur=byId[cur.parentId]; }
  return prev;
}

/* ============================ Icon ============================ */
const Ic = {
  tree:"🌳", history:"📜", temple:"🏛️", cal:"📅", news:"📰", admin:"⚙️",
  male:"👨", female:"👩", grave:"🕯️", loc:"📍", edit:"✏️", del:"🗑️",
  add:"➕", zoomIn:"➕", zoomOut:"➖", print:"🖨️", down:"⬇️", up:"⬆️", close:"✕"
};

/* ============================ App ============================ */
function App(){
  const [data, setData] = useState(null);

  useEffect(()=>{ loadInitialData().then(setData); },[]);
  useEffect(()=>{ if(data){ try{ localStorage.setItem(LS_KEY, JSON.stringify(data)); }catch(e){} } },[data]);

  if(!data) return <div className="p-10 text-center serif text-do text-xl">Đang mở gia phả…</div>;
  if(PAGE === 'admin') return <AdminPage data={data} setData={setData}/>;
  return <SiteApp data={data} setData={setData}/>;
}

function SiteApp({data, setData}){
  const [tab, setTab] = useState('cay');
  const [selId, setSelId] = useState(null);
  const [mineId, setMineId] = useState(null);

  const idx = buildIndex(data.thanhVien);
  useEffect(()=>{ if(!mineId && idx.roots[0]) setMineId(idx.roots[0].id); },[data]);
  const selected = selId ? idx.byId[selId] : null;

  const TABS = [
    ['cay', Ic.tree, 'Cây phả đồ'],
    ['lichsu', Ic.history, 'Lịch sử dòng họ'],
    ['nhatho', Ic.temple, 'Nhà thờ tổ'],
    ['lich', Ic.cal, 'Lịch giỗ & Sự kiện'],
    ['tintuc', Ic.news, 'Tin tức nội bộ'],
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print bg-gradient-to-b from-dodam to-do text-kem border-b-4 border-vang">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center">
          <div className="text-vang tracking-[0.3em] text-xs mb-1">GIA PHẢ ĐIỆN TỬ</div>
          <h1 className="serif text-3xl md:text-4xl font-bold">{data.tenDongHo || 'Gia phả dòng họ'}
            {data.chiPhai && <span className="text-vangnhat text-2xl"> — {data.chiPhai}</span>}
          </h1>
          {data.khauHieu && <p className="italic text-vangnhat/90 mt-2 text-sm md:text-base max-w-3xl mx-auto">“{data.khauHieu}”</p>}
        </div>
        <nav className="bg-dodam/60 border-t border-vang/40">
          <div className="max-w-6xl mx-auto flex flex-wrap justify-center">
            {TABS.map(([k,ic,label])=>(
              <button key={k} onClick={()=>setTab(k)}
                className={"btn px-4 py-2.5 text-sm md:text-[15px] transition border-b-2 "+
                  (tab===k? "border-vang text-vang font-semibold bg-black/20":"border-transparent text-kem/80 hover:text-vang")}>
                <span className="mr-1">{ic}</span>{label}
              </button>
            ))}
            <a href="admin/" className="btn px-4 py-2.5 text-sm md:text-[15px] border-b-2 border-transparent text-kem/60 hover:text-vang">
              <span className="mr-1">{Ic.admin}</span>Quản trị</a>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 md:px-4 py-5">
        {tab==='cay'    && <TreeView idx={idx} selId={selId} setSelId={setSelId} mineId={mineId} setMineId={setMineId}/>}
        {tab==='lichsu' && <HistoryView data={data}/>}
        {tab==='nhatho' && <TempleView nt={data.nhaTho}/>}
        {tab==='lich'   && <CalendarView data={data} idx={idx} setSelId={setSelId} setTab={setTab}/>}
        {tab==='tintuc' && <NewsView news={data.tinTuc}/>}
      </main>

      {selected && tab==='cay' &&
        <PersonDrawer p={selected} idx={idx} mineId={mineId} setMineId={setMineId}
          onClose={()=>setSelId(null)} onGoto={setSelId}/>}

      <footer className="no-print bg-dodam text-kem/70 text-center text-xs py-4 border-t-4 border-vang">
        <p>© {data.tenDongHo||'Gia phả dòng họ'} · Lưu trữ trên GitHub Pages · CTDAN2308</p>
        <p className="mt-1">Uống nước nhớ nguồn — Ăn quả nhớ kẻ trồng cây · <a href="admin/" className="underline hover:text-vang">Trang quản trị</a></p>
      </footer>
    </div>
  );
}

/* ============================ Trang Quản trị (/admin) ============================ */
function AdminPage({data, setData}){
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-b from-dodam to-do text-kem border-b-4 border-vang">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-vang tracking-[0.25em] text-xs">TRANG QUẢN TRỊ</div>
            <h1 className="serif text-2xl font-bold">{data.tenDongHo || 'Gia phả dòng họ'}
              {data.chiPhai && <span className="text-vangnhat"> — {data.chiPhai}</span>}</h1>
          </div>
          <a href="../" className="bg-kem text-do px-3 py-2 rounded-lg font-semibold hover:bg-vangnhat text-sm">← Về trang gia phả</a>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 md:px-4 py-5">
        <AdminView data={data} setData={setData}/>
      </main>
      <footer className="bg-dodam text-kem/70 text-center text-xs py-3 border-t-4 border-vang">
        <p>Nhớ vào <b>Xuất / Nhập dữ liệu → Tải giapha.json</b> rồi commit lên GitHub để lưu vĩnh viễn cho cả dòng họ.</p>
      </footer>
    </div>
  );
}

/* ============================ Cây phả đồ ============================ */
function TreeView({idx, selId, setSelId, mineId, setMineId}){
  const vpRef = useRef(null);
  const [t, setT] = useState({x:40,y:20,s:1});
  const [drag, setDrag] = useState(false);
  const dragRef = useRef(null);
  const [collapsed, setCollapsed] = useState({});

  const toggle = id => setCollapsed(c=>({...c,[id]:!c[id]}));

  const onDown = e=>{
    if(e.target.closest('.card')||e.target.closest('.toggle-btn')) return;
    setDrag(true);
    dragRef.current = {x:e.clientX-t.x, y:e.clientY-t.y};
  };
  const onMove = e=>{
    if(!drag||!dragRef.current) return;
    setT(p=>({...p, x:e.clientX-dragRef.current.x, y:e.clientY-dragRef.current.y}));
  };
  const onUp = ()=>{ setDrag(false); dragRef.current=null; };
  const onWheel = e=>{
    e.preventDefault();
    const rect = vpRef.current.getBoundingClientRect();
    const mx = e.clientX-rect.left, my = e.clientY-rect.top;
    const ds = e.deltaY<0 ? 1.12 : 0.89;
    setT(p=>{
      const ns = Math.min(2.5, Math.max(0.25, p.s*ds));
      const k = ns/p.s;
      return { s:ns, x: mx-(mx-p.x)*k, y: my-(my-p.y)*k };
    });
  };
  const zoom = f => setT(p=>({...p, s:Math.min(2.5,Math.max(0.25,p.s*f))}));
  const reset = ()=> setT({x:40,y:20,s:1});
  const expandAll = ()=> setCollapsed({});
  const doPrint = ()=>{ expandAll(); setTimeout(()=>window.print(),150); };

  if(!idx.roots.length) return <Empty msg="Chưa có thành viên nào. Vào trang Quản trị để thêm Thủy tổ." />;

  return (
    <div>
      <div className="no-print flex flex-wrap items-center gap-2 mb-3">
        <ToolBtn onClick={()=>zoom(1.15)}>{Ic.zoomIn} Phóng to</ToolBtn>
        <ToolBtn onClick={()=>zoom(0.87)}>{Ic.zoomOut} Thu nhỏ</ToolBtn>
        <ToolBtn onClick={reset}>↺ Về giữa</ToolBtn>
        <ToolBtn onClick={expandAll}>⧉ Mở tất cả nhánh</ToolBtn>
        <ToolBtn onClick={doPrint}>{Ic.print} Xuất phả đồ (In/PDF)</ToolBtn>
        <span className="text-xs text-do/70 ml-auto">Kéo nền để di chuyển · Lăn chuột để phóng to · Bấm vào ô để xem chi tiết</span>
      </div>

      <div ref={vpRef}
        className={"viewport rounded-xl border-2 border-vang shadow-inner "+(drag?'dragging':'')}
        style={{height:'70vh'}}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onWheel={onWheel}>
        <div className="canvas" style={{transform:`translate(${t.x}px,${t.y}px) scale(${t.s})`}}>
          <ul className="tree">
            {idx.roots.map(r=>(
              <TreeNode key={r.id} node={r} idx={idx} selId={selId} setSelId={setSelId}
                mineId={mineId} collapsed={collapsed} toggle={toggle}/>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function TreeNode({node, idx, selId, setSelId, mineId, collapsed, toggle}){
  const children = idx.childrenOf(node.id);
  const spouses = idx.spousesOf(node.id);
  const isCol = collapsed[node.id];
  const hasKids = children.length>0;

  return (
    <li className="node-wrap">
      <div className="flex items-end gap-1">
        <PersonCard p={node} selId={selId} mineId={mineId} onClick={()=>setSelId(node.id)}/>
        {spouses.map(s=>(
          <React.Fragment key={s.id}>
            <span className="text-vang text-lg mx-0.5 mb-6">⚭</span>
            <PersonCard p={s} selId={selId} mineId={mineId} onClick={()=>setSelId(s.id)}/>
          </React.Fragment>
        ))}
      </div>
      {hasKids &&
        <button className="toggle-btn no-print mt-1 text-xs bg-do text-kem rounded-full px-2 py-0.5 border border-vang hover:bg-dodam"
          onClick={()=>toggle(node.id)}>
          {isCol ? `▸ ${children.length} người con` : '▾ Thu gọn'}
        </button>}
      {hasKids && !isCol &&
        <ul>
          {children.map(c=>(
            <TreeNode key={c.id} node={c} idx={idx} selId={selId} setSelId={setSelId}
              mineId={mineId} collapsed={collapsed} toggle={toggle}/>
          ))}
        </ul>}
    </li>
  );
}

function PersonCard({p, selId, mineId, onClick}){
  const cls = "card p-2 " + (selId===p.id?'selected ':'') + (mineId===p.id?'mine ':'');
  const dead = p.namMat;
  return (
    <div className={cls} onClick={onClick} title={p.hoTen}>
      <div className="flex items-center gap-2">
        <Avatar p={p} size={40}/>
        <div className="text-left leading-tight">
          <div className="serif font-semibold text-do text-sm">{p.hoTen}</div>
          <div className="text-[11px] text-muc/70">
            {p.namSinh||'?'}{dead? ' – '+p.namMat : ''} {dead && Ic.grave}
          </div>
          {p.chucDanh && <div className="text-[10px] text-vang font-medium">{p.chucDanh}</div>}
        </div>
      </div>
    </div>
  );
}

function Avatar({p, size=40}){
  const st={width:size,height:size};
  if(p.anh) return <img src={p.anh} style={st} className="rounded-full object-cover border-2 border-vang" alt={p.hoTen}
    onError={e=>{e.target.style.display='none';}}/>;
  return <div style={st} className="rounded-full grid place-items-center border-2 border-vang bg-kem text-lg">
    {p.gioiTinh==='nu'?Ic.female:Ic.male}</div>;
}

/* ============================ Ngăn chi tiết người ============================ */
function PersonDrawer({p, idx, mineId, setMineId, onClose, onGoto}){
  const cha = p.parentId ? idx.byId[p.parentId] : null;
  const spouses = idx.spousesOf(p.spouseOfId? p.spouseOfId : p.id);
  const goc = p.spouseOfId ? idx.byId[p.spouseOfId] : p;
  const children = idx.childrenOf(goc.id);
  const rel = xungHo(p.id, mineId, idx.byId);
  const mine = idx.byId[mineId];

  return (
    <div className="no-print fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative w-full max-w-md bg-nen shadow-2xl border-l-4 border-vang overflow-y-auto scroll-thin"
        onClick={e=>e.stopPropagation()}>
        <div className="bg-gradient-to-b from-dodam to-do text-kem p-4 flex items-start gap-3">
          <Avatar p={p} size={72}/>
          <div className="flex-1">
            <h2 className="serif text-2xl font-bold">{p.hoTen}</h2>
            <div className="text-vangnhat text-sm">
              {p.chucDanh && <span>{p.chucDanh} · </span>}
              {p.gioiTinh==='nu'?'Nữ':'Nam'} {p.doi?`· Đời ${p.doi}`:''}
            </div>
          </div>
          <button onClick={onClose} className="text-kem/80 hover:text-vang text-xl">{Ic.close}</button>
        </div>

        <div className="p-4 space-y-4">
          {p.video && <VideoBox url={p.video}/>}

          <Field label="Năm sinh" val={p.namSinh}/>
          <Field label="Năm mất" val={p.namMat}/>
          <Field label="Ngày giỗ (Âm lịch)" val={p.ngayGioAmLich}/>
          <Field label="Ngày giỗ (Dương lịch)" val={p.ngayGioDuong}/>
          <Field label="Nơi sinh sống" val={p.noiSinhSong}/>
          {cha && <div><span className="text-do font-semibold text-sm">Con của: </span>
            <button className="underline text-do" onClick={()=>onGoto(cha.id)}>{cha.hoTen}</button></div>}
          {spouses.length>0 && <div><span className="text-do font-semibold text-sm">Vợ/Chồng: </span>
            {spouses.map((s,i)=><span key={s.id}>{i>0&&', '}
              <button className="underline text-do" onClick={()=>onGoto(s.id)}>{s.hoTen}</button></span>)}</div>}
          {children.length>0 && <div>
            <div className="text-do font-semibold text-sm mb-1">Các con ({children.length}):</div>
            <div className="flex flex-wrap gap-1">
              {children.map(c=><button key={c.id} onClick={()=>onGoto(c.id)}
                className="text-xs bg-kem border border-vang rounded-full px-2 py-0.5 hover:bg-vangnhat">{c.hoTen}</button>)}
            </div></div>}

          {p.tieuSu && <div>
            <div className="text-do font-semibold text-sm mb-1">📖 Tiểu sử</div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed bg-kem/60 p-3 rounded-lg border border-vang/40">{p.tieuSu}</p>
          </div>}

          <div className="bg-do/5 border border-do/30 rounded-lg p-3">
            <div className="text-do font-semibold text-sm mb-1">👥 Quan hệ xưng hô</div>
            {mine
              ? <p className="text-sm"><b>{mine.hoTen}</b> gọi <b>{p.hoTen}</b> là:
                  <span className="serif text-do text-lg font-bold ml-1">{rel}</span></p>
              : <p className="text-sm text-muc/60">Chọn “mình” để tính quan hệ.</p>}
            {mineId!==p.id &&
              <button onClick={()=>setMineId(p.id)}
                className="mt-2 text-xs bg-do text-kem rounded px-2 py-1 hover:bg-dodam">
                Đặt người này là “mình”</button>}
            <p className="text-[11px] text-muc/50 mt-1">*Kết quả mang tính tham khảo theo huyết thống trực hệ/bàng hệ.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
function Field({label,val}){ if(!val) return null;
  return <div className="flex text-sm"><span className="text-do font-semibold w-40 shrink-0">{label}:</span><span>{val}</span></div>; }

function VideoBox({url}){
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  if(yt) return <div className="aspect-video rounded-lg overflow-hidden border border-vang">
    <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${yt[1]}`} allowFullScreen title="video"></iframe></div>;
  return <video src={url} controls className="w-full rounded-lg border border-vang"></video>;
}

/* ============================ Lịch sử ============================ */
function HistoryView({data}){
  return (
    <Panel title="📜 Lịch sử dòng họ">
      {data.lichSu
        ? <div className="serif text-[17px] leading-8 whitespace-pre-wrap first-letter:text-5xl first-letter:font-bold first-letter:text-do first-letter:mr-2 first-letter:float-left">{data.lichSu}</div>
        : <Empty msg="Chưa có nội dung lịch sử. Vào trang Quản trị để bổ sung."/>}
    </Panel>
  );
}

/* ============================ Nhà thờ tổ ============================ */
function TempleView({nt}){
  const src = nt.mapEmbed
    || (nt.lat && nt.lng ? `https://www.google.com/maps?q=${nt.lat},${nt.lng}&hl=vi&z=17&output=embed`
    : (nt.diaChi ? `https://www.google.com/maps?q=${encodeURIComponent(nt.diaChi)}&hl=vi&z=17&output=embed` : ''));
  return (
    <Panel title={"🏛️ "+(nt.ten||'Nhà thờ tổ')}>
      {nt.diaChi && <p className="mb-1">{Ic.loc} <b>Địa chỉ:</b> {nt.diaChi}</p>}
      {nt.moTa && <p className="mb-3 text-muc/80 whitespace-pre-wrap">{nt.moTa}</p>}
      {src
        ? <div className="rounded-xl overflow-hidden border-2 border-vang shadow" style={{height:'60vh'}}>
            <iframe className="w-full h-full" src={src} loading="lazy" title="Bản đồ nhà thờ tổ"
              referrerPolicy="no-referrer-when-downgrade"></iframe></div>
        : <Empty msg="Chưa có vị trí. Vào Quản trị để nhập địa chỉ hoặc toạ độ/nhúng bản đồ."/>}
      {(nt.lat&&nt.lng) &&
        <a className="inline-block mt-3 bg-do text-kem px-3 py-2 rounded-lg hover:bg-dodam"
          href={`https://www.google.com/maps/dir/?api=1&destination=${nt.lat},${nt.lng}`} target="_blank" rel="noreferrer">
          {Ic.loc} Chỉ đường tới nhà thờ tổ</a>}
    </Panel>
  );
}

/* ============================ Lịch giỗ & Sự kiện ============================ */
function CalendarView({data, idx, setSelId, setTab}){
  const today = new Date();
  const gioList = data.thanhVien.filter(m=>m.namMat && m.ngayGioDuong)
    .map(m=>{
      const [d,mo] = (m.ngayGioDuong||'').split('/').map(x=>parseInt(x,10));
      if(!d||!mo) return null;
      let next = new Date(today.getFullYear(), mo-1, d);
      if(next < new Date(today.getFullYear(),today.getMonth(),today.getDate())) next.setFullYear(today.getFullYear()+1);
      const days = Math.round((next - new Date(today.getFullYear(),today.getMonth(),today.getDate()))/86400000);
      return {m, next, days};
    }).filter(Boolean).sort((a,b)=>a.days-b.days);

  const events = (data.suKien||[]).map(e=>{
    const dt = new Date(e.ngay);
    const days = Math.round((dt - new Date(today.getFullYear(),today.getMonth(),today.getDate()))/86400000);
    return {...e, dt, days};
  }).sort((a,b)=>a.dt-b.dt);
  const upcoming = events.filter(e=>e.days>=0);

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <Panel title="🕯️ Lịch nhắc lễ giỗ">
        {gioList.length? <ul className="space-y-2">
          {gioList.map(({m,days})=>(
            <li key={m.id} className={"flex items-center gap-3 p-2 rounded-lg border "+
              (days<=7?'bg-do/10 border-do':'bg-kem/60 border-vang/40')}>
              <Avatar p={m} size={38}/>
              <div className="flex-1">
                <button className="serif font-semibold text-do hover:underline"
                  onClick={()=>{setSelId(m.id); setTab('cay');}}>{m.hoTen}</button>
                <div className="text-xs text-muc/70">Giỗ: {m.ngayGioDuong} (DL){m.ngayGioAmLich?` · ${m.ngayGioAmLich} (ÂL)`:''}</div>
              </div>
              <span className={"text-xs font-semibold px-2 py-1 rounded "+(days<=7?'bg-do text-kem':'bg-vangnhat text-dodam')}>
                {days===0?'Hôm nay':`còn ${days} ngày`}</span>
            </li>
          ))}
        </ul> : <Empty msg="Chưa có ngày giỗ (Dương lịch). Nhập ở Quản trị để bật nhắc lịch."/>}
        <p className="text-[11px] text-muc/50 mt-2">*Nhắc theo ngày Dương lịch. Ngày Âm lịch hiển thị để tham khảo.</p>
      </Panel>

      <Panel title="📅 Hội họp & Sự kiện dòng họ">
        {upcoming.length? <ul className="space-y-2">
          {upcoming.map(e=>(
            <li key={e.id} className="p-3 rounded-lg border border-vang/50 bg-kem/60">
              <div className="flex justify-between items-start">
                <div className="serif font-semibold text-do">{e.tenSuKien}</div>
                <span className={"text-xs px-2 py-1 rounded shrink-0 "+(e.days<=7?'bg-do text-kem':'bg-vangnhat text-dodam')}>
                  {e.days===0?'Hôm nay':`còn ${e.days} ngày`}</span>
              </div>
              <div className="text-xs text-muc/70 mt-1">📆 {fmtDate(e.dt)}{e.diaDiem?` · ${Ic.loc} ${e.diaDiem}`:''}</div>
              {e.noiDung && <p className="text-sm mt-1 whitespace-pre-wrap">{e.noiDung}</p>}
            </li>
          ))}
        </ul> : <Empty msg="Chưa có sự kiện sắp tới."/>}
      </Panel>
    </div>
  );
}
function fmtDate(d){ return d.toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}); }

/* ============================ Tin tức ============================ */
function NewsView({news}){
  const list = [...(news||[])].sort((a,b)=> (b.ngayDang||'').localeCompare(a.ngayDang||''));
  return (
    <Panel title="📰 Tin tức nội bộ">
      {list.length? <div className="space-y-4">
        {list.map(n=>(
          <article key={n.id} className="border border-vang/50 rounded-xl overflow-hidden bg-kem/50">
            {n.anh && <img src={n.anh} className="w-full max-h-64 object-cover" alt={n.tieuDe}
              onError={e=>e.target.style.display='none'}/>}
            <div className="p-4">
              <h3 className="serif text-xl font-bold text-do">{n.tieuDe}</h3>
              <div className="text-xs text-muc/60 mb-2">{n.ngayDang}{n.tacGia?` · ${n.tacGia}`:''}</div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{n.noiDung}</p>
            </div>
          </article>
        ))}
      </div> : <Empty msg="Chưa có tin tức. Vào Quản trị để đăng tin."/>}
    </Panel>
  );
}

/* ============================ Quản trị ============================ */
function AdminView({data, setData}){
  const [sub, setSub] = useState('tv');
  const idx = buildIndex(data.thanhVien);
  const upd = patch => setData(d=>({...d, ...patch}));

  const SUBS = [['tv','👥 Thành viên'],['info','🏷️ Thông tin & Lịch sử'],['nt','🏛️ Nhà thờ tổ'],
    ['sk','📅 Sự kiện'],['tt','📰 Tin tức'],['data','💾 Xuất / Nhập dữ liệu']];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {SUBS.map(([k,l])=>(
          <button key={k} onClick={()=>setSub(k)}
            className={"text-sm px-3 py-1.5 rounded-lg border "+(sub===k?'bg-do text-kem border-do':'bg-kem border-vang hover:bg-vangnhat')}>{l}</button>
        ))}
      </div>
      {sub==='tv'   && <AdminMembers data={data} setData={setData} idx={idx}/>}
      {sub==='info' && <AdminInfo data={data} upd={upd}/>}
      {sub==='nt'   && <AdminTemple data={data} upd={upd}/>}
      {sub==='sk'   && <AdminEvents data={data} setData={setData}/>}
      {sub==='tt'   && <AdminNews data={data} setData={setData}/>}
      {sub==='data' && <AdminData data={data} setData={setData}/>}
    </div>
  );
}

function AdminMembers({data, setData, idx}){
  const blank = {id:'', hoTen:'', gioiTinh:'nam', parentId:'', spouseOfId:'', doi:'', conThuTu:'',
    namSinh:'', namMat:'', ngayGioAmLich:'', ngayGioDuong:'', anh:'', video:'', chucDanh:'', noiSinhSong:'', tieuSu:''};
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState('');
  const set = (k,v)=> setForm(f=>({...f,[k]:v}));

  const save = ()=>{
    if(!form.hoTen.trim()){ alert('Nhập họ tên'); return; }
    const rec = {...form,
      doi: form.doi? parseInt(form.doi,10):'', conThuTu: form.conThuTu? parseInt(form.conThuTu,10):'',
      parentId: form.parentId||null, spouseOfId: form.spouseOfId||null};
    setData(d=>{
      const list = editing ? d.thanhVien.map(m=>m.id===rec.id?rec:m)
                           : [...d.thanhVien, {...rec, id: uid('tv')}];
      return {...d, thanhVien:list};
    });
    setForm(blank); setEditing(false);
  };
  const edit = m => { setForm({...blank, ...m, doi:m.doi||'', conThuTu:m.conThuTu||'', parentId:m.parentId||'', spouseOfId:m.spouseOfId||''}); setEditing(true); window.scrollTo({top:0,behavior:'smooth'}); };
  const del = m =>{
    if(idx.childrenOf(m.id).length || idx.spousesOf(m.id).length){
      if(!confirm('Người này có con/vợ-chồng liên kết. Xoá vẫn tiếp tục? (các liên kết sẽ mồ côi)')) return;
    } else if(!confirm('Xoá '+m.hoTen+'?')) return;
    setData(d=>({...d, thanhVien:d.thanhVien.filter(x=>x.id!==m.id)}));
  };
  const dup = m =>{ setForm({...blank, ...m, id:'', hoTen:''}); setEditing(false); window.scrollTo({top:0,behavior:'smooth'}); };

  const people = data.thanhVien;
  const filtered = q ? people.filter(p=>(p.hoTen||'').toLowerCase().includes(q.toLowerCase())) : people;
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Panel title={editing?'✏️ Sửa thành viên':'➕ Thêm thành viên'}>
        <div className="grid grid-cols-2 gap-2">
          <In lbl="Họ và tên *" v={form.hoTen} on={v=>set('hoTen',v)} col2/>
          <Sel lbl="Giới tính" v={form.gioiTinh} on={v=>set('gioiTinh',v)} opts={[['nam','Nam'],['nu','Nữ']]}/>
          <In lbl="Đời thứ" v={form.doi} on={v=>set('doi',v)} type="number"/>
          <Sel lbl="Là con của (cha/mẹ huyết thống)" v={form.parentId} on={v=>set('parentId',v)} col2
            opts={[['','— Không (là gốc) —'], ...people.filter(p=>!p.spouseOfId && p.id!==form.id).map(p=>[p.id,p.hoTen])]}/>
          <Sel lbl="Là vợ/chồng của (kết hôn vào họ)" v={form.spouseOfId} on={v=>set('spouseOfId',v)} col2
            opts={[['','— Không —'], ...people.filter(p=>!p.spouseOfId && p.id!==form.id).map(p=>[p.id,p.hoTen])]}/>
          <In lbl="Con thứ" v={form.conThuTu} on={v=>set('conThuTu',v)} type="number"/>
          <In lbl="Chức danh (Thủy tổ, Trưởng tộc…)" v={form.chucDanh} on={v=>set('chucDanh',v)}/>
          <In lbl="Năm sinh" v={form.namSinh} on={v=>set('namSinh',v)}/>
          <In lbl="Năm mất" v={form.namMat} on={v=>set('namMat',v)}/>
          <In lbl="Ngày giỗ Âm lịch (vd 10/3)" v={form.ngayGioAmLich} on={v=>set('ngayGioAmLich',v)}/>
          <In lbl="Ngày giỗ Dương lịch (dd/mm)" v={form.ngayGioDuong} on={v=>set('ngayGioDuong',v)}/>
          <In lbl="Nơi sinh sống" v={form.noiSinhSong} on={v=>set('noiSinhSong',v)} col2/>
          <In lbl="Ảnh (URL)" v={form.anh} on={v=>set('anh',v)} col2/>
          <In lbl="Video (URL YouTube hoặc mp4)" v={form.video} on={v=>set('video',v)} col2/>
          <Area lbl="Tiểu sử" v={form.tieuSu} on={v=>set('tieuSu',v)}/>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={save} className="bg-do text-kem px-4 py-2 rounded-lg hover:bg-dodam">{editing?'Lưu thay đổi':'Thêm thành viên'}</button>
          {editing && <button onClick={()=>{setForm(blank);setEditing(false);}} className="px-4 py-2 rounded-lg border border-vang">Huỷ</button>}
        </div>
        <p className="text-xs text-muc/60 mt-2">Ảnh/Video dán link (vd đưa ảnh vào thư mục <code>assets/</code> trong repo rồi dùng đường dẫn <code>assets/ten.jpg</code>).</p>
      </Panel>

      <Panel title={`👥 Danh sách (${people.length})`}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm theo tên…"
          className="w-full border border-vang/60 rounded px-2 py-1.5 mb-2 bg-white/70"/>
        <div className="max-h-[70vh] overflow-y-auto scroll-thin space-y-1">
          {filtered.map(m=>(
            <div key={m.id} className="flex items-center gap-2 p-2 rounded border border-vang/40 bg-kem/50">
              <Avatar p={m} size={32}/>
              <div className="flex-1 text-sm">
                <div className="font-semibold text-do">{m.hoTen} {m.spouseOfId && <span className="text-xs text-muc/60">(dâu/rể)</span>}</div>
                <div className="text-xs text-muc/60">{m.doi?`Đời ${m.doi} · `:''}{m.chucDanh} {m.namSinh&&`· ${m.namSinh}`}</div>
              </div>
              <button onClick={()=>dup(m)} title="Nhân bản" className="text-do hover:scale-110">⧉</button>
              <button onClick={()=>edit(m)} title="Sửa" className="text-do hover:scale-110">{Ic.edit}</button>
              <button onClick={()=>del(m)} title="Xoá" className="text-do hover:scale-110">{Ic.del}</button>
            </div>
          ))}
          {!filtered.length && <Empty msg="Không có ai. Thêm Thủy tổ trước (không chọn cha/mẹ)."/>}
        </div>
      </Panel>
    </div>
  );
}

function AdminInfo({data, upd}){
  return (
    <Panel title="🏷️ Thông tin dòng họ & Lịch sử">
      <div className="grid gap-2">
        <In lbl="Tên dòng họ" v={data.tenDongHo} on={v=>upd({tenDongHo:v})} col2/>
        <In lbl="Chi phái" v={data.chiPhai} on={v=>upd({chiPhai:v})} col2/>
        <In lbl="Khẩu hiệu / câu đối" v={data.khauHieu} on={v=>upd({khauHieu:v})} col2/>
        <Area lbl="Lịch sử dòng họ" v={data.lichSu} on={v=>upd({lichSu:v})} rows={12}/>
      </div>
    </Panel>
  );
}

function AdminTemple({data, upd}){
  const nt = data.nhaTho||{};
  const set=(k,v)=>upd({nhaTho:{...nt,[k]:v}});
  return (
    <Panel title="🏛️ Nhà thờ tổ">
      <div className="grid gap-2">
        <In lbl="Tên" v={nt.ten} on={v=>set('ten',v)} col2/>
        <In lbl="Địa chỉ (dùng để tìm trên Google Maps)" v={nt.diaChi} on={v=>set('diaChi',v)} col2/>
        <In lbl="Vĩ độ (lat)" v={nt.lat} on={v=>set('lat',v)}/>
        <In lbl="Kinh độ (lng)" v={nt.lng} on={v=>set('lng',v)}/>
        <Area lbl="Mã nhúng bản đồ (tuỳ chọn — dán src iframe từ Google Maps → Chia sẻ → Nhúng)" v={nt.mapEmbed} on={v=>set('mapEmbed',v)} rows={3}/>
        <Area lbl="Mô tả" v={nt.moTa} on={v=>set('moTa',v)}/>
      </div>
      <p className="text-xs text-muc/60 mt-2">Chỉ cần nhập <b>Địa chỉ</b> hoặc <b>lat/lng</b> là bản đồ tự hiện (không cần API key).</p>
    </Panel>
  );
}

function AdminEvents({data, setData}){
  const blank={id:'',tenSuKien:'',ngay:'',diaDiem:'',noiDung:''};
  const [f,setF]=useState(blank); const [ed,setEd]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const save=()=>{ if(!f.tenSuKien||!f.ngay){alert('Nhập tên & ngày');return;}
    setData(d=>({...d, suKien: ed? d.suKien.map(x=>x.id===f.id?f:x):[...(d.suKien||[]),{...f,id:uid('sk')}]}));
    setF(blank); setEd(false); };
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Panel title={ed?'✏️ Sửa sự kiện':'➕ Thêm sự kiện / hội họp'}>
        <div className="grid gap-2">
          <In lbl="Tên sự kiện *" v={f.tenSuKien} on={v=>set('tenSuKien',v)} col2/>
          <In lbl="Ngày *" v={f.ngay} on={v=>set('ngay',v)} type="date" col2/>
          <In lbl="Địa điểm" v={f.diaDiem} on={v=>set('diaDiem',v)} col2/>
          <Area lbl="Nội dung" v={f.noiDung} on={v=>set('noiDung',v)}/>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={save} className="bg-do text-kem px-4 py-2 rounded-lg hover:bg-dodam">{ed?'Lưu':'Thêm'}</button>
          {ed && <button onClick={()=>{setF(blank);setEd(false);}} className="px-4 py-2 rounded-lg border border-vang">Huỷ</button>}
        </div>
      </Panel>
      <Panel title="Danh sách sự kiện">
        <div className="space-y-1 max-h-[60vh] overflow-y-auto scroll-thin">
          {(data.suKien||[]).map(e=>(
            <div key={e.id} className="flex items-center gap-2 p-2 border border-vang/40 rounded bg-kem/50">
              <div className="flex-1 text-sm"><b className="text-do">{e.tenSuKien}</b><div className="text-xs text-muc/60">{e.ngay} {e.diaDiem}</div></div>
              <button onClick={()=>{setF({...blank,...e});setEd(true);}} className="text-do">{Ic.edit}</button>
              <button onClick={()=>setData(d=>({...d,suKien:d.suKien.filter(x=>x.id!==e.id)}))} className="text-do">{Ic.del}</button>
            </div>
          ))}
          {!(data.suKien||[]).length && <Empty msg="Chưa có sự kiện."/>}
        </div>
      </Panel>
    </div>
  );
}

function AdminNews({data, setData}){
  const blank={id:'',tieuDe:'',ngayDang:'',tacGia:'',anh:'',noiDung:''};
  const [f,setF]=useState(blank); const [ed,setEd]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const save=()=>{ if(!f.tieuDe){alert('Nhập tiêu đề');return;}
    setData(d=>({...d, tinTuc: ed? d.tinTuc.map(x=>x.id===f.id?f:x):[...(d.tinTuc||[]),{...f,id:uid('tt')}]}));
    setF(blank); setEd(false); };
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Panel title={ed?'✏️ Sửa tin':'➕ Đăng tin nội bộ'}>
        <div className="grid gap-2">
          <In lbl="Tiêu đề *" v={f.tieuDe} on={v=>set('tieuDe',v)} col2/>
          <In lbl="Ngày đăng" v={f.ngayDang} on={v=>set('ngayDang',v)} type="date"/>
          <In lbl="Tác giả" v={f.tacGia} on={v=>set('tacGia',v)}/>
          <In lbl="Ảnh (URL)" v={f.anh} on={v=>set('anh',v)} col2/>
          <Area lbl="Nội dung" v={f.noiDung} on={v=>set('noiDung',v)} rows={6}/>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={save} className="bg-do text-kem px-4 py-2 rounded-lg hover:bg-dodam">{ed?'Lưu':'Đăng tin'}</button>
          {ed && <button onClick={()=>{setF(blank);setEd(false);}} className="px-4 py-2 rounded-lg border border-vang">Huỷ</button>}
        </div>
      </Panel>
      <Panel title="Danh sách tin">
        <div className="space-y-1 max-h-[60vh] overflow-y-auto scroll-thin">
          {(data.tinTuc||[]).map(n=>(
            <div key={n.id} className="flex items-center gap-2 p-2 border border-vang/40 rounded bg-kem/50">
              <div className="flex-1 text-sm"><b className="text-do">{n.tieuDe}</b><div className="text-xs text-muc/60">{n.ngayDang} {n.tacGia}</div></div>
              <button onClick={()=>{setF({...blank,...n});setEd(true);}} className="text-do">{Ic.edit}</button>
              <button onClick={()=>setData(d=>({...d,tinTuc:d.tinTuc.filter(x=>x.id!==n.id)}))} className="text-do">{Ic.del}</button>
            </div>
          ))}
          {!(data.tinTuc||[]).length && <Empty msg="Chưa có tin."/>}
        </div>
      </Panel>
    </div>
  );
}

function AdminData({data, setData}){
  const exportJson = ()=>{
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'giapha.json'; a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson = e =>{
    const file = e.target.files[0]; if(!file) return;
    const r = new FileReader();
    r.onload = ()=>{ try{ const d=JSON.parse(r.result); setData(d); alert('Đã nhập dữ liệu!'); }
      catch(err){ alert('File không hợp lệ: '+err.message); } };
    r.readAsText(file);
  };
  const reset = ()=>{ if(confirm('Xoá toàn bộ bản nháp trong máy và tải lại từ file gốc?')){ localStorage.removeItem(LS_KEY); location.reload(); } };
  return (
    <Panel title="💾 Xuất / Nhập dữ liệu">
      <div className="space-y-4 max-w-xl">
        <div className="bg-do/5 border border-do/30 rounded-lg p-4">
          <h3 className="serif font-bold text-do mb-1">Cách lưu vĩnh viễn lên GitHub</h3>
          <ol className="list-decimal ml-5 text-sm space-y-1">
            <li>Bấm <b>Tải file giapha.json</b> bên dưới.</li>
            <li>Vào repo GitHub <code>CTDAN2308/giapha</code> → thư mục <code>data/</code>.</li>
            <li>Mở <code>giapha.json</code> → bấm ✏️ (Edit) → xoá hết → dán nội dung file vừa tải → <b>Commit</b>.</li>
            <li>Sau 1–2 phút, website tự cập nhật cho mọi người.</li>
          </ol>
          <p className="text-xs text-muc/60 mt-2">Mọi thay đổi trong trang Quản trị được lưu tạm trong trình duyệt của bạn. Bước trên giúp lưu chung cho cả dòng họ.</p>
        </div>
        <button onClick={exportJson} className="bg-do text-kem px-4 py-2 rounded-lg hover:bg-dodam">{Ic.down} Tải file giapha.json</button>
        <div>
          <label className="block text-sm font-semibold text-do mb-1">{Ic.up} Nhập từ file giapha.json</label>
          <input type="file" accept="application/json" onChange={importJson} className="text-sm"/>
        </div>
        <button onClick={reset} className="text-sm text-do underline">↺ Xoá bản nháp, tải lại từ file gốc trên server</button>
      </div>
    </Panel>
  );
}

/* ============================ UI chung ============================ */
function Panel({title, children}){
  return <section className="bg-nen border-2 border-vang rounded-xl shadow-sm p-4 md:p-5">
    <h2 className="serif text-xl font-bold text-do border-b-2 border-vang/50 pb-2 mb-3">{title}</h2>
    {children}
  </section>;
}
function Empty({msg}){ return <div className="text-center text-muc/50 py-10 serif italic">{msg}</div>; }
function ToolBtn({children,onClick}){ return <button onClick={onClick}
  className="btn text-sm bg-do text-kem px-3 py-1.5 rounded-lg border border-vang hover:bg-dodam">{children}</button>; }
function In({lbl,v,on,type='text',col2}){ return (
  <label className={"text-sm "+(col2?'col-span-2':'')}>
    <span className="block text-do font-medium mb-0.5">{lbl}</span>
    <input type={type} value={v||''} onChange={e=>on(e.target.value)}
      className="w-full border border-vang/60 rounded px-2 py-1.5 bg-white/70 focus:outline-none focus:border-do"/>
  </label>); }
function Area({lbl,v,on,rows=4}){ return (
  <label className="text-sm col-span-2">
    <span className="block text-do font-medium mb-0.5">{lbl}</span>
    <textarea rows={rows} value={v||''} onChange={e=>on(e.target.value)}
      className="w-full border border-vang/60 rounded px-2 py-1.5 bg-white/70 focus:outline-none focus:border-do"/>
  </label>); }
function Sel({lbl,v,on,opts,col2}){ return (
  <label className={"text-sm "+(col2?'col-span-2':'')}>
    <span className="block text-do font-medium mb-0.5">{lbl}</span>
    <select value={v||''} onChange={e=>on(e.target.value)}
      className="w-full border border-vang/60 rounded px-2 py-1.5 bg-white/70 focus:outline-none focus:border-do">
      {opts.map(([val,label])=><option key={val} value={val}>{label}</option>)}
    </select>
  </label>); }

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
