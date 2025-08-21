import { Outlet } from "react-router-dom";
import FlashMessage from "../components/FlashMessage";
import SearchBar from "../components/SearchBar";
import TweetBox from "../components/TweetBox";
import TweetFeed from "../components/TweetFeed";

export default function MainLayout() {
  return (
    <div className="home-page">
      {/* Flash messages */}
      <FlashMessage type="success" />
      <FlashMessage type="error" />

      {/* Search */}
      <div className="liquid-glass-wrapper">
        <SearchBar placeholder="Search tweets" />
      </div>

      {/* Tweet composer */}
      <section className="tweet-box">
        <TweetBox />
      </section>

      {/* Tweet feed */}
      <section className="tweet-feed">
        <TweetFeed />
      </section>

      {/* Page-specific content */}
      <Outlet />
    </div>
  );
}