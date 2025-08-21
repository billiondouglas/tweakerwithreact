import { ReactNode } from "react";
import '../Styles/tokens.css';
import '../Styles/global.css';
import "../styles/app.css";

export default function AppShell({ left, center, right }: {
  left: ReactNode; center: ReactNode; right: ReactNode;
}) {
  return <div className="app">
    <aside className="sticky">{left}</aside>
    <main>{center}</main>
    <aside className="sticky">{right}</aside>
  </div>;
}