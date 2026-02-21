import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { MobileNav } from './mobile-nav'
import { useMobile } from '@/hooks/use-mobile'

export function AppLayout() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const isMobile = useMobile()
  const isTablet = useMobile(1024) && !isMobile

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={isTablet} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSheetOpen(true)} />

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {isMobile && (
        <MobileNav sheetOpen={sheetOpen} onSheetChange={setSheetOpen} />
      )}
    </div>
  )
}
