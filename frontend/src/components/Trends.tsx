export function Trends(){
  return (
    <div className="panel" style={{padding:16}}>
      <b>What people are saying...</b>
      <div className="separator"/>
      {["#Minions","#SeninBarokah","#Texos","#MUFC","#Rangnick","#ThxOle"].map(t=>(
        <div key={t} style={{padding:"8px 0", color:"var(--muted)"}}>
          <div style={{color:"var(--muted)"}}>{t}</div>
          <small>~ Drake</small>
        </div>
      ))}
    </div>
  );
}