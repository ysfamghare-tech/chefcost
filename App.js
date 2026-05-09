import { useState, useRef, useEffect } from "react";

// ─── Storage (localStorage for production) ───────────────────────────────────
const STORAGE_KEY = "chefcost_v2";
const saveLocal = (data) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {} };
const loadLocal = () => { try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; } catch(e) { return null; } };

// ─── Utils ────────────────────────────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2, 8);
const fmt  = (n, dec = 2) => (isNaN(+n) || n === "" ? "—" : (+n).toFixed(dec));
const fmtN = (n, dec = 2) => (isNaN(+n) || n === "" ? 0   : +(+n).toFixed(dec));

const fcColor = (fc) => {
  if (fc === null) return { main:"#64748b", bg:"#0f172a", text:"#64748b" };
  if (fc <= 28)   return { main:"#22c55e", bg:"#052e16", text:"#4ade80" };
  if (fc <= 35)   return { main:"#f59e0b", bg:"#1c0a00", text:"#fbbf24" };
  return           { main:"#ef4444", bg:"#1c0505", text:"#f87171" };
};
const fcLabel = (fc) =>
  fc === null ? "—" : fc <= 28 ? "✓ Excellent" : fc <= 35 ? "⚠ Acceptable" : "✗ Trop élevé";

function calcIng(ing) {
  const p    = fmtN(ing.pricePerKg);
  const qNet = fmtN(ing.qty);
  const w    = Math.min(fmtN(ing.waste), 99);
  const qBrut = w > 0 ? qNet / (1 - w / 100) : qNet;
  const cost = (p / 1000) * qBrut;
  return { ...ing, cost, qBrut };
}

const emptyIng = () => ({ id:uid(), name:"", pricePerKg:"", qty:"", waste:"0", cost:0, qBrut:0 });
let recipeCounter = 1;
const emptyRec = () => ({
  id: uid(),
  name: `Recette ${recipeCounter++}`,
  category: "Plat principal",
  portions: "1",
  sellingPrice: "",
  ingredients: [emptyIng()],
  notes: "",
  createdAt: new Date().toLocaleDateString("fr-FR"),
});

const defaultRecipes = [{
  ...emptyRec(),
  name: "Poulet rôti",
  sellingPrice: "85",
  ingredients: [
    calcIng({ id:uid(), name:"Poulet (net)",    pricePerKg:"45", qty:"350", waste:"30", cost:0, qBrut:0 }),
    calcIng({ id:uid(), name:"Épices",           pricePerKg:"80", qty:"20",  waste:"0",  cost:0, qBrut:0 }),
    calcIng({ id:uid(), name:"Huile d'olive",    pricePerKg:"30", qty:"30",  waste:"0",  cost:0, qBrut:0 }),
    calcIng({ id:uid(), name:"Citron (net)",     pricePerKg:"12", qty:"50",  waste:"20", cost:0, qBrut:0 }),
  ],
}];

const CATS = ["Entrée","Plat principal","Dessert","Sauce","Garniture","Boisson","Autre"];
const PIE_COLORS = ["#fbbf24","#22c55e","#3b82f6","#a855f7","#ef4444","#f97316","#06b6d4","#ec4899","#84cc16","#8b5cf6"];

function PieChart({ data, size = 170 }) {
  if (!data?.length) return null;
  const total = data.reduce((s,d)=>s+d.value,0);
  if (!total) return null;
  let angle = -Math.PI/2;
  const cx=size/2, cy=size/2, r=size/2-6;
  const slices = data.map((d,i)=>{
    const start=angle, sweep=(d.value/total)*2*Math.PI;
    angle+=sweep;
    const x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start);
    const x2=cx+r*Math.cos(start+sweep),y2=cy+r*Math.sin(start+sweep);
    return{...d,path:`M${cx},${cy} L${x1},${y1} A${r},${r},0,${sweep>Math.PI?1:0},1,${x2},${y2} Z`,color:PIE_COLORS[i%PIE_COLORS.length]};
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} stroke="#060d19" strokeWidth={2} opacity={0.9}/>)}
      <circle cx={cx} cy={cy} r={r*0.42} fill="#060d19"/>
    </svg>
  );
}

function BarChart({ data, height=140 }) {
  if (!data?.length) return <div style={{height,display:"flex",alignItems:"center",justifyContent:"center",color:"#334155",fontSize:12,fontFamily:"monospace"}}>Ajoutez un prix de vente pour voir</div>;
  const max=Math.max(...data.map(d=>d.value),40);
  const bw=Math.min(44,Math.floor(260/data.length)-8);
  return (
    <div style={{overflowX:"auto"}}>
      <svg width={Math.max(data.length*(bw+14)+44,280)} height={height+46} style={{display:"block"}}>
        {[0,28,35].map(v=>{
          const y=height-(v/max)*height+8;
          return <g key={v}><line x1={30} y1={y} x2={data.length*(bw+14)+40} y2={y} stroke={v===28?"#22c55e33":v===35?"#f59e0b33":"#0f1e35"} strokeWidth={v===0?1:1.5} strokeDasharray={v>0?"4,3":"none"}/><text x={26} y={y+4} fontSize={9} fill={v===28?"#22c55e88":v===35?"#f59e0b88":"#1e3a5f"} textAnchor="end" fontFamily="monospace">{v}%</text></g>;
        })}
        {data.map((d,i)=>{
          const barH=Math.max((d.value/max)*height,4);
          const x=34+i*(bw+14), y=height-barH+8;
          const col=d.value<=28?"#22c55e":d.value<=35?"#f59e0b":"#ef4444";
          return <g key={i}><rect x={x} y={y} width={bw} height={barH} fill={col} rx={4} opacity={0.85}/><text x={x+bw/2} y={y-4} fontSize={10} fill={col} textAnchor="middle" fontFamily="monospace" fontWeight="bold">{d.value.toFixed(0)}%</text><text x={x+bw/2} y={height+26} fontSize={9} fill="#475569" textAnchor="middle">{d.label.length>7?d.label.slice(0,6)+"…":d.label}</text></g>;
        })}
      </svg>
    </div>
  );
}

export default function App() {
  const saved = loadLocal();
  const [recipes,  setRecipes]     = useState(saved?.recipes || defaultRecipes);
  const [activeId, setActiveId]    = useState(saved?.activeId || (saved?.recipes?.[0]?.id) || defaultRecipes[0].id);
  const [page,     setPage]        = useState("calc");
  const [toast,    setToast]       = useState(null);
  const [showMenu, setShowMenu]    = useState(false);
  const [confirmDel, setConfirmDel]= useState(null);
  const [ficheText,  setFicheText] = useState("");
  const [savedFlash, setSavedFlash]= useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    saveLocal({ recipes, activeId });
    setSavedFlash(true);
    const t = setTimeout(() => setSavedFlash(false), 1200);
    return () => clearTimeout(t);
  }, [recipes, activeId]);

  const showToast = (msg, err) => { setToast({msg,err}); setTimeout(()=>setToast(null),3000); };

  const recipe = recipes.find(r=>r.id===activeId) || recipes[0];
  const upd    = (patch) => setRecipes(p=>p.map(r=>r.id===activeId?{...r,...patch}:r));
  const updIng = (id,field,val) => upd({ingredients:recipe.ingredients.map(i=>i.id!==id?i:calcIng({...i,[field]:val}))});
  const addIng = () => upd({ingredients:[...recipe.ingredients,emptyIng()]});
  const delIng = (id) => recipe.ingredients.length>1&&upd({ingredients:recipe.ingredients.filter(i=>i.id!==id)});
  const addRec = () => { const r=emptyRec(); setRecipes(p=>[...p,r]); setActiveId(r.id); setPage("calc"); setShowMenu(false); };
  const dupRec = () => { const r={...recipe,id:uid(),name:recipe.name+" (copie)",createdAt:new Date().toLocaleDateString("fr-FR")}; setRecipes(p=>[...p,r]); setActiveId(r.id); setShowMenu(false); showToast("Dupliquée ✓"); };
  const delRec = (id) => {
    if(recipes.length===1){showToast("Impossible — dernière recette",true);setConfirmDel(null);return;}
    const rem=recipes.filter(r=>r.id!==id);
    setRecipes(rem); if(activeId===id) setActiveId(rem[0].id);
    setConfirmDel(null); showToast("Supprimée");
  };

  const total  = recipe.ingredients.reduce((s,i)=>s+i.cost,0);
  const por    = Math.max(parseInt(recipe.portions)||1,1);
  const sp     = fmtN(recipe.sellingPrice);
  const fc     = sp>0?(total/sp)*100:null;
  const margin = sp>0?sp-total:null;
  const C      = fcColor(fc);
  const date   = new Date().toLocaleDateString("fr-FR");

  const barData  = recipes.map(r=>{const t=r.ingredients.reduce((s,i)=>s+i.cost,0);const s=fmtN(r.sellingPrice);const f=s>0?(t/s)*100:null;return f!==null?{label:r.name,value:f}:null;}).filter(Boolean);
  const pieData  = recipe.ingredients.filter(i=>i.cost>0).sort((a,b)=>b.cost-a.cost).map(i=>({label:i.name||"—",value:i.cost}));
  const allStats = recipes.map(r=>{const t=r.ingredients.reduce((s,i)=>s+i.cost,0);const s=fmtN(r.sellingPrice);const f=s>0?(t/s)*100:null;const m=s>0?s-t:null;return{...r,total:t,sp:s,fc:f,margin:m};});

  const generateFiche = () => {
    const ings = recipe.ingredients.filter(i=>i.name||i.cost>0);
    const lines = [
      `╔══════════════════════════════════════════╗`,
      `   FICHE DE COÛT — ${recipe.name.toUpperCase()}`,
      `╚══════════════════════════════════════════╝`,
      `Catégorie  : ${recipe.category}`,
      `Portions   : ${por}`,
      `Date       : ${date}`,
      ``,
      `FOOD COST : ${fc!==null?fc.toFixed(1)+"%":"—"}   →   ${fcLabel(fc)}`,
      `Coût total     : ${fmt(total)} MAD`,
      `Coût / portion : ${fmt(total/por)} MAD`,
      `Prix de vente  : ${sp>0?fmt(sp)+" MAD":"—"}`,
      `Marge brute    : ${margin!==null?fmt(margin)+" MAD":"—"}`,
      ``,
      `Ingrédient\t\tPrix/kg\tNet(g)\tBrut(g)\tGaspi\tCoût\t%`,
      `──────────────────────────────────────────`,
      ...ings.map(i=>`${i.name||"—"}\t\t${fmt(i.pricePerKg)} MAD\t${fmt(i.qty,0)}g\t${fmt(i.qBrut||fmtN(i.qty),0)}g\t${i.waste||0}%\t${fmt(i.cost)} MAD\t${total>0?((i.cost/total)*100).toFixed(1)+"%":"—"}`),
      `──────────────────────────────────────────`,
      `TOTAL\t\t\t\t\t\t\t${fmt(total)} MAD`,
      ``,
      recipe.notes?`Notes : ${recipe.notes}`:"",
      `Idéal <28%  ·  Acceptable 28-35%  ·  Trop élevé >35%`,
    ].join("\n");
    setFicheText(lines);
    setTimeout(()=>{ if(textareaRef.current){textareaRef.current.focus();textareaRef.current.select();textareaRef.current.setSelectionRange(0,99999);} },150);
    navigator.clipboard?.writeText(lines).then(()=>showToast("✓ Copié automatiquement !")).catch(()=>showToast("Texte prêt — sélectionnez et copiez"));
  };

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {savedFlash && <div style={S.savedDot}>💾</div>}
      {toast && <div style={{...S.toast,background:toast.err?"#1c0505":"#052e16",borderColor:toast.err?"#ef4444":"#22c55e",color:toast.err?"#f87171":"#4ade80"}}>{toast.msg}</div>}

      {confirmDel && (
        <div style={S.overlay} onClick={()=>setConfirmDel(null)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalT}>Supprimer cette recette ?</div>
            <div style={S.modalS}>"{recipes.find(r=>r.id===confirmDel)?.name}"</div>
            <div style={S.modalRow}>
              <button style={S.modalCancel} onClick={()=>setConfirmDel(null)}>Annuler</button>
              <button style={S.modalDel} onClick={()=>delRec(confirmDel)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {showMenu && (
        <div style={S.overlay} onClick={()=>setShowMenu(false)}>
          <div style={S.recMenu} onClick={e=>e.stopPropagation()}>
            <div style={S.recMenuTitle}>Mes Recettes ({recipes.length})</div>
            <div style={{maxHeight:"50vh",overflowY:"auto"}}>
              {recipes.map(r=>{
                const rt=r.ingredients.reduce((s,i)=>s+i.cost,0);const rsp=fmtN(r.sellingPrice);const rfc=rsp>0?(rt/rsp)*100:null;const rc=fcColor(rfc);
                return (
                  <div key={r.id} style={{...S.recItem,...(r.id===activeId?S.recItemActive:{})}} onClick={()=>{setActiveId(r.id);setShowMenu(false);setPage("calc");}}>
                    <div style={S.recItemRow}>
                      <span style={S.recItemName}>{r.name}</span>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:13,fontFamily:"monospace",fontWeight:600,color:rc.main}}>{rfc!==null?rfc.toFixed(1)+"%":"—"}</span>
                        <button style={S.recItemDel} onClick={e=>{e.stopPropagation();setConfirmDel(r.id);setShowMenu(false);}}>🗑</button>
                      </div>
                    </div>
                    <div style={{fontSize:11,color:"#334155"}}>{r.category} · {fmt(rt)} MAD</div>
                  </div>
                );
              })}
            </div>
            <button style={S.recAddBtn} onClick={addRec}>+ Nouvelle recette</button>
            <button style={S.recDupBtn} onClick={dupRec}>⧉ Dupliquer "{recipe.name}"</button>
          </div>
        </div>
      )}

      <div style={S.header}>
        <button style={S.recBtn} onClick={()=>setShowMenu(true)}>
          <span style={{fontSize:14,flexShrink:0}}>☰</span>
          <span style={{fontSize:14,fontWeight:500,flex:1,minWidth:0,textAlign:"left",color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{recipe.name}</span>
          <span style={{fontSize:10,color:"#475569",flexShrink:0}}>▾</span>
        </button>
        <span style={{...S.fcPill,background:C.bg,color:C.main,borderColor:C.main+"44"}}>{fc!==null?fc.toFixed(1)+"%":"—"}</span>
      </div>

      <div style={{...S.fcBanner,background:C.bg,borderColor:C.main+"33"}}>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,color:C.main,lineHeight:1}}>{fc!==null?fc.toFixed(1)+"%":"—"}</div>
          <div style={{fontSize:11,fontFamily:"monospace",marginTop:4,color:C.text}}>{fcLabel(fc)}</div>
        </div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
          {[["Coût total",fmt(total)+" MAD"],["/ portion",fmt(total/por)+" MAD"],["Marge",margin!==null?fmt(margin)+" MAD":"—"]].map(([l,v])=>(
            <div key={l}>
              <div style={{fontSize:9,color:"#334155",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:0.5}}>{l}</div>
              <div style={{fontSize:13,fontFamily:"monospace",fontWeight:600,color:l==="Marge"&&margin!==null?(margin>=0?"#4ade80":"#f87171"):"#f1f5f9"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {page==="calc" && (
        <div style={S.pageContent}>
          <div style={S.metaRow}>
            <div style={S.metaField}><label style={S.lbl}>Nom du plat</label><input style={S.inp} value={recipe.name} onChange={e=>upd({name:e.target.value})} placeholder="Ex: Poulet rôti"/></div>
            <div style={S.metaField}><label style={S.lbl}>Catégorie</label><select style={S.sel} value={recipe.category} onChange={e=>upd({category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div style={S.metaRow}>
            <div style={S.metaField}><label style={S.lbl}>Nb portions</label><input style={S.inp} type="number" min="1" value={recipe.portions} onChange={e=>upd({portions:e.target.value})}/></div>
            <div style={S.metaField}><label style={S.lbl}>Prix vente / portion (MAD)</label><input style={S.inp} type="number" min="0" value={recipe.sellingPrice} onChange={e=>upd({sellingPrice:e.target.value})} placeholder="0.00"/></div>
          </div>
          <div style={S.infoBox}>💡 <b>Waste %</b> = perte à l'épluchage. Ex: poulet entier = 30%. Le coût est calculé sur la quantité brute réelle à acheter.</div>
          <div style={S.secTitle}>📦 Ingrédients</div>
          {recipe.ingredients.map((ing,idx)=>(
            <div key={ing.id} style={{...S.ingCard,background:idx%2===0?"#0d1829":"#0a1422"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <input className="ii" style={S.ingNameInput} placeholder={`Ingrédient ${idx+1}`} value={ing.name} onChange={e=>updIng(ing.id,"name",e.target.value)}/>
                <button className="rm" style={S.rm} onClick={()=>delIng(ing.id)}>✕</button>
              </div>
              <div style={S.ingRow3}>
                <div style={S.ingField}><label style={S.ingLbl}>Prix/kg (MAD)</label><input className="ii" style={S.ingInp} type="number" min="0" step="0.01" placeholder="0.00" value={ing.pricePerKg} onChange={e=>updIng(ing.id,"pricePerKg",e.target.value)}/></div>
                <div style={S.ingField}><label style={S.ingLbl}>Quantité net (g)</label><input className="ii" style={S.ingInp} type="number" min="0" placeholder="0" value={ing.qty} onChange={e=>updIng(ing.id,"qty",e.target.value)}/></div>
                <div style={S.ingField}><label style={S.ingLbl}>Waste %</label><input className="ii" style={S.ingInp} type="number" min="0" max="99" placeholder="0" value={ing.waste} onChange={e=>updIng(ing.id,"waste",e.target.value)}/></div>
              </div>
              {ing.cost>0&&(
                <div style={S.ingResult}>
                  <span style={{color:"#475569"}}>Brut: <b style={{color:"#94a3b8"}}>{fmt(ing.qBrut||fmtN(ing.qty),0)}g</b></span>
                  <span style={{color:"#fbbf24",fontFamily:"monospace",fontWeight:600}}>Coût: {fmt(ing.cost)} MAD</span>
                  <span style={{color:"#475569"}}>{total>0?((ing.cost/total)*100).toFixed(0)+"%":""}</span>
                </div>
              )}
            </div>
          ))}
          <button className="addBtn" style={S.addBtn} onClick={addIng}>+ Ajouter un ingrédient</button>
          <div style={S.secTitle}>📝 Notes</div>
          <textarea style={S.notes} rows={2} placeholder="Méthode, allergènes..." value={recipe.notes} onChange={e=>upd({notes:e.target.value})}/>
          {total>0&&<>
            <div style={S.secTitle}>🔍 Répartition</div>
            <div style={S.breakCard}>
              {[...recipe.ingredients].filter(i=>i.cost>0).sort((a,b)=>b.cost-a.cost).map(i=>(
                <div key={i.id} style={S.bRow}>
                  <span style={S.bName}>{i.name||"—"}</span>
                  <div style={S.bBarWrap}><div style={{...S.bBar,width:`${Math.min((i.cost/total)*100,100)}%`,background:`linear-gradient(90deg,${C.main},#fbbf24)`}}/></div>
                  <span style={S.bPct}>{((i.cost/total)*100).toFixed(0)}%</span>
                  <span style={S.bCost}>{fmt(i.cost)}</span>
                </div>
              ))}
            </div>
          </>}
        </div>
      )}

      {page==="dashboard" && (
        <div style={S.pageContent}>
          {recipes.length<2&&<div style={S.alertBox}>💡 Ajoutez plusieurs recettes pour comparer</div>}
          <div style={S.card}><div style={S.cardTitle}>📊 Food Cost % par recette</div><BarChart data={barData} height={140}/><div style={S.legendRow}><span style={S.leg}><span style={{...S.legDot,background:"#22c55e"}}/>Excellent &lt;28%</span><span style={S.leg}><span style={{...S.legDot,background:"#f59e0b"}}/>Acceptable 28–35%</span><span style={S.leg}><span style={{...S.legDot,background:"#ef4444"}}/>Élevé &gt;35%</span></div></div>
          <div style={S.card}><div style={S.cardTitle}>🥧 Répartition — {recipe.name}</div>{pieData.length===0?<div style={S.emptyMsg}>Saisissez les ingrédients</div>:<div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}><div style={{flexShrink:0}}><PieChart data={pieData} size={160}/></div><div style={{flex:1,minWidth:120}}>{pieData.map((d,i)=><div key={i} style={S.pieLegRow}><span style={{...S.pieDot,background:PIE_COLORS[i%PIE_COLORS.length]}}/><span style={S.pieName}>{d.label}</span><span style={S.pieVal}>{fmt(d.value)}</span><span style={S.piePct}>{((d.value/pieData.reduce((s,x)=>s+x.value,0))*100).toFixed(0)}%</span></div>)}</div></div>}</div>
          <div style={S.card}><div style={S.cardTitle}>📋 Toutes les recettes</div><div style={{overflowX:"auto"}}><table style={S.table}><thead><tr>{["Recette","Coût/por.","Vente","Marge","FC%","Statut"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead><tbody>{allStats.map((r,i)=>{const rc=fcColor(r.fc);return(<tr key={r.id} style={{background:i%2===0?"rgba(255,255,255,0.02)":"transparent",cursor:"pointer"}} onClick={()=>{setActiveId(r.id);setPage("calc");}}><td style={{...S.td,color:"#f1f5f9",fontWeight:500,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</td><td style={{...S.td,fontFamily:"monospace"}}>{fmt(r.total/Math.max(parseInt(r.portions)||1,1))}</td><td style={{...S.td,fontFamily:"monospace"}}>{r.sp>0?fmt(r.sp):"—"}</td><td style={{...S.td,fontFamily:"monospace",color:r.margin!==null&&r.margin>=0?"#4ade80":"#f87171"}}>{r.margin!==null?fmt(r.margin):"—"}</td><td style={{...S.td,fontFamily:"monospace",color:rc.main,fontWeight:700}}>{r.fc!==null?r.fc.toFixed(1)+"%":"—"}</td><td style={S.td}><span style={{...S.statusBadge,background:rc.bg,color:rc.text,borderColor:rc.main+"33"}}>{r.fc!==null?(r.fc<=28?"✓ OK":r.fc<=35?"⚠ Moy":"✗ Élevé"):"—"}</span></td></tr>);})}</tbody></table></div></div>
        </div>
      )}

      {page==="recettes" && (
        <div style={S.pageContent}>
          <div style={S.secTitle}>Mes recettes ({recipes.length})</div>
          {recipes.map(r=>{
            const rt=r.ingredients.reduce((s,i)=>s+i.cost,0);const rsp=fmtN(r.sellingPrice);const rfc=rsp>0?(rt/rsp)*100:null;const rc=fcColor(rfc);const rp=Math.max(parseInt(r.portions)||1,1);
            return(<div key={r.id} style={{...S.recCard,borderColor:r.id===activeId?"rgba(251,191,36,0.3)":"#0f1e35"}} onClick={()=>{setActiveId(r.id);setPage("calc");}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{fontSize:15,fontWeight:600,color:"#f1f5f9"}}>{r.name}</div><div style={{fontSize:13,fontFamily:"monospace",fontWeight:700,padding:"3px 10px",borderRadius:20,background:rc.bg,color:rc.main}}>{rfc!==null?rfc.toFixed(1)+"%":"—"}</div></div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#334155",marginBottom:10,flexWrap:"wrap",gap:4}}><span>{r.category}</span><span>Coût/por: {fmt(rt/rp)} MAD</span><span style={{color:rc.text}}>{fcLabel(rfc)}</span></div><div style={{display:"flex",gap:8}} onClick={e=>e.stopPropagation()}><button style={S.recActBtn} onClick={()=>{const nr={...r,id:uid(),name:r.name+" (copie)",createdAt:new Date().toLocaleDateString("fr-FR")};setRecipes(p=>[...p,nr]);showToast("Dupliquée ✓");}}>⧉ Dupliquer</button><button style={{...S.recActBtn,color:"#ef4444",borderColor:"rgba(239,68,68,0.2)"}} onClick={()=>setConfirmDel(r.id)}>🗑 Supprimer</button></div></div>);
          })}
          <button style={S.bigAddBtn} onClick={addRec}>+ Nouvelle recette</button>
        </div>
      )}

      {page==="fiche" && (
        <div style={S.pageContent}>
          <div style={S.fiche}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"16px",borderBottom:"1px solid #0f1e35"}}><div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"#f1f5f9",marginBottom:4}}>{recipe.name}</div><div style={{fontSize:11,color:"#475569",fontFamily:"monospace"}}>{recipe.category} · {por} portion{por>1?"s":""} · {date}</div></div><div style={{background:"#fbbf24",color:"#0a0f1a",fontSize:8,fontFamily:"monospace",letterSpacing:2,padding:"5px 8px",borderRadius:6,textAlign:"center",lineHeight:1.8,fontWeight:700,flexShrink:0,whiteSpace:"pre"}}>{"FICHE\nCOÛT"}</div></div>
            <div style={{...S.ficheFc,background:C.bg,borderColor:C.main+"44"}}><div style={{fontSize:10,fontFamily:"monospace",letterSpacing:2,textTransform:"uppercase",color:"#475569",marginBottom:6}}>Food Cost %</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:44,fontWeight:900,lineHeight:1,color:C.main}}>{fc!==null?fc.toFixed(1)+"%":"—"}</div><div style={{color:C.text,fontSize:13,marginTop:6,fontFamily:"monospace"}}>{fcLabel(fc)}</div><div style={{fontSize:10,color:"#334155",fontFamily:"monospace",marginTop:8}}>Idéal &lt;28% · Acceptable 28–35% · Trop élevé &gt;35%</div></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:1,background:"#0f1e35",margin:"0 12px 12px",borderRadius:10,overflow:"hidden"}}>{[["Coût",fmt(total)+" MAD"],["/ por.",fmt(total/por)+" MAD"],["Vente",sp>0?fmt(sp)+" MAD":"—"],["Marge",margin!==null?fmt(margin)+" MAD":"—"]].map(([l,v])=><div key={l} style={{background:"#080f1e",padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:9,fontFamily:"monospace",textTransform:"uppercase",color:"#334155",marginBottom:4}}>{l}</div><div style={{fontSize:12,fontFamily:"monospace",fontWeight:600,color:"#e2e8f0"}}>{v}</div></div>)}</div>
            <div style={{margin:"0 12px 12px",border:"1px solid #0f1e35",borderRadius:10,overflow:"hidden"}}><div style={{display:"flex",padding:"8px 12px",background:"#060d19",fontSize:9,fontFamily:"monospace",color:"#334155",gap:4}}><span style={{flex:2}}>Ingrédient</span><span style={{flex:1,textAlign:"right"}}>Prix/kg</span><span style={{flex:0.9,textAlign:"right"}}>Net</span><span style={{flex:0.9,textAlign:"right"}}>Brut</span><span style={{flex:0.6,textAlign:"right"}}>Gaspi</span><span style={{flex:1,textAlign:"right"}}>Coût</span><span style={{flex:0.5,textAlign:"right"}}>%</span></div>{recipe.ingredients.filter(i=>i.name||i.cost>0).map((i,idx)=><div key={i.id} style={{display:"flex",padding:"9px 12px",fontSize:11,gap:4,alignItems:"center",background:idx%2===0?"rgba(255,255,255,0.02)":"transparent"}}><span style={{flex:2,color:"#e2e8f0"}}>{i.name||"—"}</span><span style={{flex:1,textAlign:"right",color:"#64748b"}}>{fmt(i.pricePerKg)}</span><span style={{flex:0.9,textAlign:"right",color:"#64748b"}}>{fmt(i.qty,0)}</span><span style={{flex:0.9,textAlign:"right",color:"#94a3b8"}}>{fmt(i.qBrut||fmtN(i.qty),0)}</span><span style={{flex:0.6,textAlign:"right",color:"#475569"}}>{i.waste||0}%</span><span style={{flex:1,textAlign:"right",color:"#fbbf24",fontFamily:"monospace"}}>{fmt(i.cost)}</span><span style={{flex:0.5,textAlign:"right",color:"#475569",fontSize:10}}>{total>0?((i.cost/total)*100).toFixed(0)+"%":"—"}</span></div>)}<div style={{display:"flex",padding:"10px 12px",background:"#060d19",fontSize:10,fontFamily:"monospace",color:"#64748b",gap:4,fontWeight:600,borderTop:"1px solid #0f1e35"}}><span style={{flex:2}}>TOTAL</span><span style={{flex:1}}/><span style={{flex:0.9}}/><span style={{flex:0.9}}/><span style={{flex:0.6}}/><span style={{flex:1,textAlign:"right",color:"#fbbf24"}}>{fmt(total)}</span><span style={{flex:0.5}}/></div></div>
            {recipe.notes&&<div style={{margin:"0 12px 10px",padding:"10px 12px",background:"#060d19",borderRadius:8,fontSize:11,color:"#64748b",lineHeight:1.6}}><b>Notes:</b> {recipe.notes}</div>}
            <div style={{padding:"10px 16px",borderTop:"1px solid #0f1e35",fontSize:10,color:"#1e3a5f",fontFamily:"monospace",textAlign:"center"}}>Food Cost = Coût matières ÷ Prix vente × 100 · {date}</div>
          </div>
          <div style={S.exportBox}>
            <div style={S.exportTitle}>📤 Exporter vers Excel / Google Sheets</div>
            <button style={S.genBtn} onClick={generateFiche}>⬇ Générer le texte à copier</button>
            {ficheText!==""&&<><div style={S.exportHint}>✅ Texte prêt — Ctrl+A puis Ctrl+C (ou appuyez longuement sur mobile)</div><textarea ref={textareaRef} style={S.exportTextarea} value={ficheText} readOnly rows={12} onFocus={e=>{e.target.select();e.target.setSelectionRange(0,99999);}}/><div style={{display:"flex",flexDirection:"column",gap:6}}>{["1️⃣  Sélectionnez tout le texte (Ctrl+A)","2️⃣  Copiez (Ctrl+C)","3️⃣  Ouvrez Google Sheets → Collez dans A1","4️⃣  File → Download → PDF ou .xlsx ✅"].map(s=><div key={s} style={{fontSize:12,color:"#475569",fontFamily:"monospace",padding:"8px 12px",background:"#080f1e",borderRadius:8,border:"1px solid #0f1e35"}}>{s}</div>)}</div></>}
          </div>
        </div>
      )}

      <div style={S.bottomNav}>
        {[{key:"calc",icon:"🧮",label:"Calcul"},{key:"dashboard",icon:"📊",label:"Dashboard"},{key:"recettes",icon:"📚",label:"Recettes"},{key:"fiche",icon:"📋",label:"Fiche"}].map(({key,icon,label})=>(
          <button key={key} style={{...S.navBtn,...(page===key?{borderTop:"2px solid #fbbf24"}:{})}} onClick={()=>setPage(key)}>
            <span style={{fontSize:18}}>{icon}</span>
            <span style={{fontSize:9,fontFamily:"monospace",letterSpacing:0.5,color:page===key?"#fbbf24":"#475569"}}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Mono:wght@400;500&family=Sora:wght@400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#060d19;overflow-x:hidden}
  input,textarea,select{outline:none;font-family:'Sora',sans-serif;-webkit-appearance:none}
  input::placeholder,textarea::placeholder{color:#1e3a5f}
  .ii:focus{border-color:#fbbf24!important;background:rgba(251,191,36,0.06)!important}
  .rm:hover{color:#ef4444!important}
  .addBtn:hover{border-color:#fbbf24!important;color:#fbbf24!important}
  table{border-collapse:collapse}
`;

const S = {
  root:{display:"flex",flexDirection:"column",minHeight:"100vh",maxWidth:600,margin:"0 auto",background:"#060d19",fontFamily:"'Sora',sans-serif",color:"#e2e8f0",fontSize:13,paddingBottom:72},
  savedDot:{position:"fixed",top:8,right:12,zIndex:9998,fontSize:14,opacity:0.7},
  toast:{position:"fixed",top:12,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"10px 20px",borderRadius:10,border:"1px solid",fontSize:12,fontFamily:"monospace",whiteSpace:"nowrap",boxShadow:"0 8px 24px rgba(0,0,0,0.6)"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:8000,display:"flex",alignItems:"flex-end",justifyContent:"center"},
  modal:{background:"#0d1829",border:"1px solid #1e293b",borderRadius:"16px 16px 0 0",padding:"28px 24px 40px",width:"100%",maxWidth:480},
  modalT:{fontSize:17,fontWeight:600,color:"#f1f5f9",marginBottom:8},
  modalS:{fontSize:13,color:"#64748b",marginBottom:24,lineHeight:1.5},
  modalRow:{display:"flex",gap:12},
  modalCancel:{flex:1,padding:"12px",borderRadius:10,border:"1px solid #1e293b",background:"transparent",color:"#94a3b8",fontSize:14,cursor:"pointer",fontFamily:"'Sora',sans-serif"},
  modalDel:{flex:1,padding:"12px",borderRadius:10,border:"none",background:"#dc2626",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"},
  recMenu:{background:"#0d1829",border:"1px solid #1e293b",borderRadius:"20px 20px 0 0",padding:"20px 16px 36px",width:"100%",maxWidth:480},
  recMenuTitle:{fontSize:12,fontFamily:"monospace",letterSpacing:2,color:"#475569",textTransform:"uppercase",marginBottom:14,textAlign:"center"},
  recItem:{padding:"12px 14px",borderRadius:10,cursor:"pointer",marginBottom:8,border:"1px solid #0f1e35"},
  recItemActive:{background:"rgba(251,191,36,0.07)",borderColor:"rgba(251,191,36,0.25)"},
  recItemRow:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4},
  recItemName:{fontSize:14,fontWeight:500,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:170},
  recItemDel:{background:"none",border:"none",color:"#334155",fontSize:16,cursor:"pointer",padding:"2px 4px"},
  recAddBtn:{width:"100%",padding:"13px",borderRadius:10,border:"1px dashed #1e3a5f",background:"transparent",color:"#475569",fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginTop:12},
  recDupBtn:{width:"100%",padding:"11px",borderRadius:10,border:"1px solid #1e293b",background:"transparent",color:"#64748b",fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginTop:8},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:"#080f1e",borderBottom:"1px solid #0d1829",gap:10,position:"sticky",top:0,zIndex:100},
  recBtn:{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.04)",border:"1px solid #1e293b",borderRadius:10,padding:"9px 12px",cursor:"pointer",flex:1,minWidth:0,color:"#e2e8f0"},
  fcPill:{display:"inline-block",padding:"6px 12px",borderRadius:20,border:"1px solid",fontSize:14,fontFamily:"monospace",fontWeight:700,flexShrink:0},
  fcBanner:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",border:"1px solid",borderLeft:"none",borderRight:"none",gap:12,flexWrap:"wrap"},
  pageContent:{padding:"16px 14px",flex:1,overflowY:"auto"},
  metaRow:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10},
  metaField:{display:"flex",flexDirection:"column",gap:5},
  lbl:{fontSize:10,color:"#475569",fontFamily:"monospace",letterSpacing:0.5,textTransform:"uppercase"},
  inp:{background:"#0d1829",border:"1px solid #0f1e35",borderRadius:8,padding:"11px 12px",color:"#f1f5f9",fontSize:14},
  sel:{background:"#0d1829",border:"1px solid #0f1e35",borderRadius:8,padding:"11px 12px",color:"#94a3b8",fontSize:13,cursor:"pointer"},
  infoBox:{background:"#0d1829",border:"1px solid #1e3a5f",borderRadius:8,padding:"10px 12px",fontSize:11,color:"#64748b",lineHeight:1.6,marginBottom:4},
  secTitle:{fontSize:11,fontFamily:"monospace",letterSpacing:2,color:"#334155",textTransform:"uppercase",margin:"16px 0 8px"},
  ingCard:{borderRadius:10,padding:"12px 14px",marginBottom:8,border:"1px solid #0f1e35"},
  ingNameInput:{background:"transparent",border:"none",borderBottom:"1px solid #1e3a5f",borderRadius:0,padding:"4px 0",color:"#f1f5f9",fontSize:15,fontWeight:500,fontFamily:"'Sora',sans-serif",width:"100%"},
  ingRow3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:10},
  ingField:{display:"flex",flexDirection:"column",gap:4},
  ingLbl:{fontSize:9,color:"#334155",fontFamily:"monospace",letterSpacing:0.5,textTransform:"uppercase"},
  ingInp:{background:"#060d19",border:"1px solid #0f1e35",borderRadius:8,padding:"10px",color:"#f1f5f9",fontSize:14,width:"100%",textAlign:"center"},
  ingResult:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,padding:"6px 0 0",borderTop:"1px solid #0f1e35",fontSize:11},
  rm:{background:"none",border:"none",color:"#1e3a5f",fontSize:16,cursor:"pointer",padding:"2px 6px",lineHeight:1,flexShrink:0},
  addBtn:{width:"100%",padding:"11px",background:"transparent",border:"1px dashed #0f1e35",borderRadius:8,color:"#1e3a5f",fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginBottom:4},
  notes:{width:"100%",background:"#0d1829",border:"1px solid #0f1e35",borderRadius:8,padding:"10px 12px",color:"#64748b",fontSize:12,resize:"vertical",fontFamily:"'Sora',sans-serif",lineHeight:1.6},
  breakCard:{background:"#0d1829",border:"1px solid #0f1e35",borderRadius:10,padding:"14px"},
  bRow:{display:"grid",gridTemplateColumns:"1fr 2fr 36px 60px",gap:8,alignItems:"center",marginBottom:10},
  bName:{fontSize:11,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  bBarWrap:{height:5,background:"#0f1e35",borderRadius:3,overflow:"hidden"},
  bBar:{height:"100%",borderRadius:3},
  bPct:{fontSize:11,color:"#334155",fontFamily:"monospace",textAlign:"right"},
  bCost:{fontSize:11,color:"#fbbf24",fontFamily:"monospace",textAlign:"right"},
  alertBox:{background:"#0d1829",border:"1px solid #1e3a5f",borderRadius:8,padding:"12px",fontSize:12,color:"#64748b",lineHeight:1.6,marginBottom:14,textAlign:"center"},
  card:{background:"#0d1829",border:"1px solid #0f1e35",borderRadius:12,padding:"16px",marginBottom:14},
  cardTitle:{fontSize:14,fontWeight:600,color:"#f1f5f9",marginBottom:12},
  emptyMsg:{fontSize:12,color:"#334155",fontFamily:"monospace",textAlign:"center",padding:"20px 0"},
  legendRow:{display:"flex",gap:12,flexWrap:"wrap",marginTop:10},
  leg:{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#475569",fontFamily:"monospace"},
  legDot:{width:8,height:8,borderRadius:"50%",flexShrink:0},
  pieLegRow:{display:"flex",alignItems:"center",gap:8,marginBottom:8},
  pieDot:{width:10,height:10,borderRadius:2,flexShrink:0},
  pieName:{flex:1,fontSize:12,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  pieVal:{fontSize:11,fontFamily:"monospace",color:"#fbbf24"},
  piePct:{fontSize:11,fontFamily:"monospace",color:"#475569",width:30,textAlign:"right"},
  table:{width:"100%",fontSize:11},
  th:{padding:"8px 10px",textAlign:"left",fontFamily:"monospace",fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"#334155",borderBottom:"1px solid #0f1e35"},
  td:{padding:"9px 10px",color:"#94a3b8",borderBottom:"1px solid #0a1525"},
  statusBadge:{display:"inline-block",padding:"2px 8px",borderRadius:10,fontSize:10,fontFamily:"monospace",border:"1px solid"},
  recCard:{background:"#0d1829",border:"1px solid",borderRadius:12,padding:"14px 16px",marginBottom:10,cursor:"pointer"},
  recActBtn:{padding:"7px 14px",borderRadius:8,border:"1px solid #1e293b",background:"transparent",color:"#64748b",fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif"},
  bigAddBtn:{width:"100%",padding:"14px",borderRadius:12,border:"1px dashed #1e3a5f",background:"transparent",color:"#475569",fontSize:14,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginTop:4},
  fiche:{background:"#0d1829",border:"1px solid #0f1e35",borderRadius:14,overflow:"hidden",marginBottom:16},
  ficheFc:{border:"1px solid",margin:"12px",borderRadius:12,padding:"18px",textAlign:"center"},
  exportBox:{background:"#0d1829",border:"1px solid #0f1e35",borderRadius:14,padding:"16px"},
  exportTitle:{fontSize:14,fontWeight:600,color:"#f1f5f9",marginBottom:12},
  genBtn:{width:"100%",padding:"14px",borderRadius:10,border:"none",background:"#fbbf24",color:"#0a0f1a",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginBottom:10},
  exportHint:{fontSize:12,color:"#4ade80",fontFamily:"monospace",marginBottom:10,lineHeight:1.5,background:"#052e16",padding:"10px 12px",borderRadius:8,border:"1px solid #16a34a"},
  exportTextarea:{width:"100%",background:"#060d19",border:"1px solid #1e3a5f",borderRadius:8,padding:"12px",color:"#94a3b8",fontSize:11,fontFamily:"monospace",lineHeight:1.6,resize:"none",marginBottom:12},
  bottomNav:{position:"fixed",bottom:0,left:0,right:0,background:"#080f1e",borderTop:"1px solid #0d1829",display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom,0px)"},
  navBtn:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"10px 0 12px",background:"transparent",border:"none",borderTop:"2px solid transparent",cursor:"pointer",gap:3},
};
