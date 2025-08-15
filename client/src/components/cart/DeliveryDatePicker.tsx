import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

export function DeliveryDatePicker() {
  const { deliveryDates, selectDeliveryDate } = useCart();

  return (
    <div className="grid grid-cols-3 gap-2">
      {deliveryDates.map((date) => (
        <button
          key={date.value}
          className={cn(
            "bg-white border rounded-md p-2 text-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-sm",
            date.selected
              ? "border-primary" 
              : "border-slate-200 hover:border-primary"
          )}
          onClick={() => selectDeliveryDate(date.value)}
        >
          <p className={cn(
            "font-medium",
            date.selected ? "text-primary" : ""
          )}>
            {date.day}
          </p>
          <p className={cn(
            date.selected ? "text-primary" : "text-slate-500"
          )}>
            {date.date}
          </p>
        </button>
      ))}
    </div>
  );
}
