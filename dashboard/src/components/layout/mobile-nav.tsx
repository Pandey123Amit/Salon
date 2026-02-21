import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/router/routes'
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  UserCircle,
  MoreHorizontal,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Users,
  BarChart3,
  Settings,
} from 'lucide-react'

const bottomTabs = [
  { to: ROUTES.DASHBOARD, label: 'Home', icon: LayoutDashboard },
  { to: ROUTES.APPOINTMENTS, label: 'Appts', icon: Calendar },
  { to: ROUTES.SERVICES, label: 'Services', icon: Scissors },
  { to: ROUTES.CUSTOMERS, label: 'Clients', icon: UserCircle },
]

const moreItems = [
  { to: ROUTES.STAFF, label: 'Staff', icon: Users },
  { to: ROUTES.ANALYTICS, label: 'Analytics', icon: BarChart3 },
  { to: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
]

interface MobileNavProps {
  sheetOpen: boolean
  onSheetChange: (open: boolean) => void
}

export function MobileNav({ sheetOpen, onSheetChange }: MobileNavProps) {
  return (
    <>
      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t flex items-center justify-around h-16 safe-area-pb">
        {bottomTabs.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => onSheetChange(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium text-muted-foreground"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>

      {/* Side sheet for "More" items + full nav on hamburger */}
      <Sheet open={sheetOpen} onOpenChange={onSheetChange}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="px-4 h-14 flex items-center border-b">
            <SheetTitle className="text-lg font-semibold">SalonBot</SheetTitle>
          </SheetHeader>
          <nav className="py-4 px-2 space-y-1">
            {[...bottomTabs, ...moreItems].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => onSheetChange(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-foreground/70'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
