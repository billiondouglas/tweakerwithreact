interface SidebarCardProps {
  fullName: string;
  username: string;
  onProfileClick?: () => void;
}

export function SidebarCard({ fullName, username, onProfileClick }: SidebarCardProps) {
  return (
    <div className="panel" style={{padding:16}}>
        <div style={{ height:96,borderRadius:12,backgroundImage: "url('/images/cover.svg')", backgroundSize: 'cover',backgroundPosition: 'center',backgroundColor: 'var(--panel)'}} />
        <div style={{display:"flex", flexDirection:"column", alignItems:"center", marginTop:-24, gap:8}}>
          <img src="/images/avatar.png" width={56} height={56} style={{borderRadius:999, border:"3px solid var(--panel)"}}/>
          <div style={{textAlign:"center"}}>
            <div style={{ fontWeight: 700, color: "var(--bold-text)" }}>{fullName}</div>
            <div style={{ color: "var(--muted)", fontWeight: 300 }}>@{username}</div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div style={{ marginBottom: 4, color: "var(--bold-text)", fontSize: "14px" }}>
            This is my short bio about me.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "13px", color: "var(--muted)" }}>
            <div>🔗 <a href="https://example.com" style={{ color: "var(--primary)", textDecoration: "none" }}>example.com</a></div>
          </div>
        </div>
      <div style={{ height: "1px", backgroundColor: "var(--panel-alt)", margin: "8px 0" }} />
      <div style={{ color:"var( --bold-text)",display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{ flex:1, textAlign:"center"}}>
          <b>6,664</b> <span style={{color:"var(--muted)"}}>Following</span>
        </div>
        <div
          style={{
            width: "1px",
            alignSelf: "stretch",
            backgroundColor: "rgba(0,0,0,0.15)",
            margin: "0 8px"
          }}
        />
        <div style={{flex:1, textAlign:"center"}}>
          <b>9,991</b> <span style={{color:"var(--muted)"}}>Followers</span>
        </div>
      </div>
      <div style={{ height: "1px", backgroundColor: "var(--panel-alt)", margin: "8px 0" }} />
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <button
          type="button"
          onClick={onProfileClick}
          style={{
            color: "var(--bg)",
            padding: "10px 18px",
            borderRadius: "2em",
            fontWeight: 600,
            background: "var(--bold-text)",
            border: "none",
            cursor: "pointer"
          }}
        >
          My Profile
        </button>
      </div>
    </div>
  );
}