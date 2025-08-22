import { FaCheckCircle } from "react-icons/fa";
import React, { useState, useEffect } from "react";
import axios from "axios";
import Tweet from "./Tweet";

interface ProfileProps {
  fullName: string;
  username: string;
  bio: string;
  link?: string;
  joinedDate: string;
  following: number;
  followers: number;
  coverImage?: string;
  avatar?: string;
  verified?: boolean;
}

const Profile: React.FC<ProfileProps> = ({
  fullName,
  username,
  bio,
  link,
  joinedDate,
  following,
  verified = true,
  followers,
  coverImage,
  avatar,
}) => {
  const linkText = (() => {
    if (!link) return null;
    try { return new URL(link).hostname.replace(/^www\./, ""); } catch { return link; }
  })();
  const [tab, setTab] = useState<'posts' | 'likes'>('posts');
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const base = (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000/api";
        const { data } = await axios.get(`${base}/posts/user/${username}`);
        const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
        setPosts(list);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts([]);
      }
    };
    fetchPosts();
  }, [username]);

  return (
    <div className="panel" style={{ fontFamily: "Inter, sans-serif", color: "white", }}>
      {/* Cover Image */}
      <div
        style={{
          width: "100%",
          height: "200px",
          backgroundColor: "#333",
          backgroundImage: coverImage ? `url(${coverImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: "2em",
        }}
      />

      {/* Profile Avatar */}
      <div style={{ position: "relative", padding: "0 16px" }}>
        <img
          src={avatar || "/images/avatar.png"}
          alt="avatar"
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            border: "4px solid black",
            position: "relative",
            top: "-60px",
          }}
        />
      </div>

      {/* Header actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px', marginTop: -40 }}>
        <button
          type="button"
          style={{
            background: '#e6e7e9',
            color: '#111',
            padding: '8px 14px',
            borderRadius: "2em",
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Edit profile
        </button>
      </div>

      {/* Profile Info */}
      <div style={{ padding: "0 16px", marginTop: "-40px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--bold-text)" }}>
          {fullName}
          {verified && <FaCheckCircle size={16} color="var(--primary)" />}
        </h2>
        <p style={{ color: "var(--muted)", margin: "4px 0" }}>@{username}</p>
        {bio && <p style={{ color: "var(--muted)", margin: "8px 0" }}>{bio}</p>}

        {/* Extra Info */}
        <div style={{ color: "var(--muted)", fontSize: "14px" }}>
          {link && (
            <p>
              🔗{" "}
              <a href={link} target="_blank" rel="noopener noreferrer">
                {linkText}
              </a>
            </p>
          )}
          <p>📅 Joined {joinedDate}</p>
        </div>

        {/* Following / Followers */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "32px",
            fontSize: "14px",
            marginTop: "8px",
            alignItems: "center",
          }}
        >
          <span>
            <button className="btn">{following} Following</button>
          </span>
          <span>
            <button className="btn">{followers} Followers</button>
          </span>
        </div>
      </div>

      {/* Tabs (Posts, Likes) */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <button
            type="button"
            onClick={() => setTab('posts')}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'transparent',
              border: 'none',
              color: tab === 'posts' ? 'var(--primary)' : 'gray',
              fontWeight: 700,
              cursor: 'pointer',
              borderBottom: tab === 'posts' ? '2px solid var(--primary)' : '3px solid transparent'
            }}
          >
            Posts
          </button>
          <button
            type="button"
            onClick={() => setTab('likes')}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'transparent',
              border: 'none',
              color: tab === 'likes' ? 'var(--primary)' : 'gray',
              fontWeight: 700,
              cursor: 'pointer',
              borderBottom: tab === 'likes' ? '2px solid var(--primary)' : '3px solid transparent'
            }}
          >
            Likes
          </button>
        </div>

        {/* Tab content placeholder */}
        <div style={{ padding: '12px 16px', color: 'gray' }}>
          {tab === 'posts' ? (
            posts.length === 0 ? (
              <div>No posts yet.</div>
            ) : (
              posts.map((p: any) => (
                <Tweet
                  key={p.id || p._id}
                  id={p.id || p._id}
                  fullName={p?.user?.fullName || fullName}
                  username={p?.user?.username || username}
                  text={p?.text}
                  created_at={p?.created_at}
                  likes={p?.like_count}
                  retweets={p?.repost_count}
                  replies={p?.reply_count}
                  views={p?.view_count}
                />
              ))
            )
          ) : (
            <div>No likes yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px 0",
  background: "transparent",
  border: "none",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

export default Profile;