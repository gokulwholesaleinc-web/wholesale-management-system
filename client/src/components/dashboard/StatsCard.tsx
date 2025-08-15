import { ReactNode } from "react";

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  color: "blue" | "emerald" | "amber" | "purple" | "red";
}

export function StatsCard({ icon, label, value, color }: StatsCardProps) {
  // Configure colors based on the color prop
  const colorConfig = {
    blue: {
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-primary"
    },
    emerald: {
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    amber: {
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600"
    },
    purple: {
      bg: "bg-purple-50",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    red: {
      bg: "bg-red-50",
      iconBg: "bg-red-100",
      iconColor: "text-red-600"
    }
  };
  
  const { bg, iconBg, iconColor } = colorConfig[color];
  
  return (
    <div className={`${bg} px-4 py-3 rounded-lg flex items-center`}>
      <div className={`${iconBg} rounded-lg p-2 mr-3`}>
        <div className={`${iconColor} text-xl`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-600">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}
