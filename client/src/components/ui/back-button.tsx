import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  onClick?: () => void;
}

export function BackButton({ 
  to, 
  label = "Back", 
  className = "", 
  variant = "ghost",
  onClick 
}: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      setLocation(to);
    } else {
      // Use browser back if no specific route provided
      window.history.back();
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      className={`flex items-center gap-2 ${className}`}
      onClick={handleClick}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}