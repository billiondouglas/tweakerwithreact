import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

function LoginProbe() {
  return <div style={{padding:24}}>Login route OK</div>
}

const router = createBrowserRouter([
  { path: '/', element: <div style={{padding:24}}>Index OK</div> },
  { path: '/login', element: <LoginProbe /> },
])

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)