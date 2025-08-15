import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import Post from './pages/Post'
import Search from './pages/Search'
import './index.css'

const qc = new QueryClient()
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Feed /> },
      { path: 'u/:handle', element: <Profile /> },
      { path: 'post/:id', element: <Post /> },
      { path: 'search', element: <Search /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)