import { Link } from "react-router-dom";
export function WhoToFollow(){
  const items = [1,2,3,4,5,6];
  return (
    <div className="panel" style={{padding:16}}>
      <div style={{ fontWeight: 700, color: "var(--bold-text)", textAlign: "left" }}>
        Who to follow
      </div>
      <div className="separator"/>
      {items.slice(0,3).map(i=>(
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            margin: "24px Auto",
            gap: "16px"
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <img
              src="/images/avatar.png"
              width={40}
              height={40}
              alt="User avatar"
              style={{ borderRadius: "50%" }}
            />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span style={{ fontWeight: 700, color: "var(--text)" }}>
                Product Hunt
              </span>
              <span style={{ color: "var(--muted)", fontSize: "14px" }}>
                @ProductHunt
              </span>
            </div>
          </div>
          <div className="btn">
            Follow
          </div>
        </div>
      ))}
      <Link
        to="/suggested"
        style={{
          display: "block",
          marginTop: "12px",
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--primary)",
          cursor: "pointer",
          textAlign: "left",
          textDecoration: "none"
        }}
      >
        See more
      </Link>
    </div>
  );
}