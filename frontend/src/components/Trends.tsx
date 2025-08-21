export function Trends(){
  return (
    <div className="panel" style={{padding:16}}>
      <b>Trend for you</b>
      <div className="separator"/>
      {["#Minions","#SeninBarokah","#Texos","#MUFC","#Rangnick","#ThxOle"].map(t=>(
        <div key={t} style={{padding:"8px 0", color:"var(--muted)"}}>
          <div style={{color:"#fff"}}>{t}</div>
          <small>~ 50k Tweets</small>
        </div>
      ))}
    </div>
  );
}