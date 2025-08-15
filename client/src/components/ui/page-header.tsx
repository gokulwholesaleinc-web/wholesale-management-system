import { cn } from "@/lib/utils";
import { BreadcrumbNavigation } from "@/components/navigation/BreadcrumbNavigation";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  showBreadcrumbs?: boolean;
}

export function PageHeader({ 
  title, 
  description, 
  children, 
  className,
  showBreadcrumbs = true 
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {showBreadcrumbs && <BreadcrumbNavigation />}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}