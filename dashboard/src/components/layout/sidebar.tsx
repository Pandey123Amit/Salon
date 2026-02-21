import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/router/routes'
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  UserCircle,
  BarChart3,
  Settings,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const navItems = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.APPOINTMENTS, label: 'Appointments', icon: Calendar },
  { to: ROUTES.SERVICES, label: 'Services', icon: Scissors },
  { to: ROUTES.STAFF, label: 'Staff', icon: Users },
  { to: ROUTES.CUSTOMERS, label: 'Customers', icon: UserCircle },
  { to: ROUTES.ANALYTICS, label: 'Analytics', icon: BarChart3 },
  { to: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
]

interface SidebarProps {
  collapsed?: boolean
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-sidebar h-screen sticky top-0 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn('flex items-center h-14 px-4 border-b', collapsed && 'justify-center')}>
        {collapsed ? (
          <span className="text-lg font-bold">S</span>
        ) : (
          <span className="text-lg font-semibold tracking-tight">SalonBot</span>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const link = (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70',
                  collapsed && 'justify-center px-2'
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )

          if (collapsed) {
            return (
              <Tooltip key={item.to} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          }

          return link
        })}
      </nav>
    </aside>
  )
}
