

import React, { useState } from "react";

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<
    | "accounts"
    | "display"
    | "content_preferences"
    | "notifications"
    | "accessibility"
    | "privacy_security"
    | "language"
    | "verification"
    | "additional_resources"
    | "help"
    | "blocked"
    | null
  >(null);

  return (
      <div
        className="panel"
        style={{
        height: "90vh",
        width: "90vw",
        position: "fixed",
        top: "50%",
        left: "50%",
        marginTop: "2.5vh",
        transform: "translate(-50%, -50%)",
        display: "flex",
        overflow: "hidden",
      }}
    >
      {/* Left Sidebar */}
      <div
        style={{
          width: "28vw",
          padding: "20px",
          borderRight: "1px solid var(--text)",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ marginBottom: "20px", color: "var(--bold-text)" }}>Settings</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", }}>
          {[
            { key: "accounts", label: "Accounts" },
            { key: "display", label: "Display" },
            { key: "content_preferences", label: "Content Preferences" },
            { key: "notifications", label: "Notifications" },
            { key: "accessibility", label: "Accessibility" },
            { key: "privacy_security", label: "Account Privacy and Security" },
            { key: "language", label: "Language" },
            { key: "verification", label: "Verification" },
            { key: "additional_resources", label: "Additional resources" },
            { key: "help", label: "Help" },
            { key: "blocked", label: "Blocked" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key as typeof activeSection)}
              style={{
                background: activeSection === (item.key as any) ? "var(--dim-bg)" : "none",
                border: "none",
                textAlign: "left",
                padding: "10px",
                cursor: "pointer",
                fontWeight: activeSection === (item.key as any) ? 700 : 400,
                color: "var(--text)",
                fontSize: "18px" ,
                borderRadius: "var(--radius)",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Content */}
      <div style={{ flex: 1, padding: "24px", boxSizing: "border-box" }}>
        {/** Reusable Coming Soon block */}
        {(() => {
          const ComingSoon = ({ title }: { title: string }) => (
            <div>
              <h3 style={{ marginTop: 0 }}>{title}</h3>
              <div style={{
                marginTop: 12,
                padding: 16,
                border: "1px solid var(--border)",
                borderRadius: 12,
                background: "var(--panel)",
              }}>
                This feature is coming soon
              </div>
            </div>
          );
          // attach to window scope for use below (IIFE return value unused)
          (window as any)._ComingSoon = ComingSoon;
          return null;
        })()}
        {!activeSection && <p>Select a setting from the left.</p>}

        {activeSection === "accounts" && (
          <div>
            <h3>Accounts</h3>
            <p>Manage your account settings:</p>
            <ul style={{ marginTop: "12px" }}>
              <li>
                <button className="btn"
                  style={{
                padding: 16,
                fontSize: 16,
              }}
                >
                  Change Password
                </button>
              </li>
            </ul>
          </div>
        )}

        {activeSection === "display" && (
          <div>
            <h3>Display</h3>
            <p>Choose your preferred mode:</p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "32px",
                marginTop: "40px",
              }}
            >
              <button className="btn"
                style={{ padding: 16, fontSize: 16 , backgroundColor: "var(--bg)", color: "var(--muted)" }}>
                Light Mode
              </button>
              <button className="btn" style={{ padding: 16, fontSize: 16 }}>
                Dark Mode
              </button>
            </div>
          </div>
        )}

        {activeSection === "content_preferences" && (
          (window as any)._ComingSoon && (window as any)._ComingSoon({ title: "Content Preferences" })
        )}
        {activeSection === "notifications" && (
          (window as any)._ComingSoon && (window as any)._ComingSoon({ title: "Notifications" })
        )}
        {activeSection === "accessibility" && (
          (window as any)._ComingSoon && (window as any)._ComingSoon({ title: "Accessibility" })
        )}
        {activeSection === "privacy_security" && (
          (window as any)._ComingSoon && (window as any)._ComingSoon({ title: "Account Privacy and Security" })
        )}
        {activeSection === "language" && (
          (window as any)._ComingSoon && (window as any)._ComingSoon({ title: "Language" })
        )}
        {activeSection === "verification" && (
          (window as any)._ComingSoon && (window as any)._ComingSoon({ title: "Verification" })
        )}
        {activeSection === "additional_resources" && (
          (window as any)._ComingSoon && (window as any)._ComingSoon({ title: "Additional resources" })
        )}
        {activeSection === "help" && (
          (window as any)._ComingSoon && (window as any)._ComingSoon({ title: "Help" })
        )}
        {activeSection === "blocked" && (
          (window as any)._ComingSoon && (window as any)._ComingSoon({ title: "Blocked" })
        )}
      </div>
      </div>
    
  );
};

export default Settings;