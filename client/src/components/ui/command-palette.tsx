import * as React from "react"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useLocation } from "wouter"
import { Search, Package, ShoppingCart, Users, Settings, BarChart3, FileText, Plus } from "lucide-react"

interface CommandPaletteProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const [, setLocation] = useLocation()

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [setOpen])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => setLocation("/admin/products"))}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/admin/orders"))}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Create Order
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/admin/customers"))}>
            <Users className="mr-2 h-4 w-4" />
            Manage Customers
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => setLocation("/admin"))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/admin/products"))}>
            <Package className="mr-2 h-4 w-4" />
            Products
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/admin/orders"))}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Orders
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/admin/customers"))}>
            <Users className="mr-2 h-4 w-4" />
            Customers
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/admin/purchase-orders"))}>
            <FileText className="mr-2 h-4 w-4" />
            Purchase Orders
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/admin/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Search">
          <CommandItem onSelect={() => runCommand(() => setLocation("/products?search=true"))}>
            <Search className="mr-2 h-4 w-4" />
            Search Products
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/admin/orders?search=true"))}>
            <Search className="mr-2 h-4 w-4" />
            Search Orders
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}