import { Outlet, Link } from 'react-router-dom'
import './index.css'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <nav className="max-w-5xl mx-auto px-3 h-12 flex items-center gap-4">
          <Link to="/" className="font-semibold">AnonFeed</Link>
          <Link to="/search" className="text-gray-600">Search</Link>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-3 py-4">
        <Outlet />
      </main>
    </div>
  )
}