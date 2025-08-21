import { Outlet, Link } from 'react-router-dom'
import './index.css'

export default function App() {
  return (
    <div>
      <main>
        <Outlet />
      </main>
    </div>
  )
}