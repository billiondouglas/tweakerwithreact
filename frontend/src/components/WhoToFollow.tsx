import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

interface User {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
}

export function WhoToFollow(){
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE}/users/suggested`)
      .then(response => {
        setUsers(Array.isArray(response.data) ? response.data : []);
      })
      .catch(error => {
        console.error("Error fetching suggested users:", error);
        setUsers([]);
      });
  }, []);

  return (
    <div className="panel" style={{padding:16}}>
      <div style={{ fontWeight: 700, color: "var(--bold-text)", textAlign: "left" }}>
        Who to follow
      </div>
      <div className="separator"/>
      {users.slice(0,3).map((user: User)=>(
        <div
          key={user.username}
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
              src={user.avatar || "/images/avatar.png"}
              width={40}
              height={40}
              alt="User avatar"
              style={{ borderRadius: "50%" }}
            />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span style={{ fontWeight: 700, color: "var(--text)" }}>
                {user.fullName}
              </span>
              <span style={{ color: "var(--muted)", fontSize: "14px" }}>
                @{user.username}
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