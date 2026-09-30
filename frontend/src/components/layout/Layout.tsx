import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout() {
  return (
    // Outer shell: full viewport, row flex, no overflow
    <div className="app-shell">
      {/* Left sidebar — fixed width, full height */}
      <Sidebar />

      {/* Right column: topbar + scrollable main */}
      <div className="app-main">
        <TopBar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
