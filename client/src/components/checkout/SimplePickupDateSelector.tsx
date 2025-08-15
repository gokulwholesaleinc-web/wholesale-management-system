import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";

export interface SimplePickupDateSelectorProps {
  onChange: (date: Date | undefined) => void;
  value: Date | undefined;
}

export function SimplePickupDateSelector({ onChange, value }: SimplePickupDateSelectorProps) {
  // Get today's date and format it as YYYY-MM-DD for min attribute
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];
  
  // Calculate 14 days from now for max date
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 14);
  const formattedMaxDate = maxDate.toISOString().split('T')[0];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value ? new Date(e.target.value) : undefined;
    onChange(selectedDate);
  };

  // Format selected date for input value
  const formattedValue = value ? value.toISOString().split('T')[0] : '';

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <Label htmlFor="pickup-date" className="font-medium">
              Select Pickup Date
            </Label>
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-gray-500" />
              <Input
                id="pickup-date"
                type="date"
                value={formattedValue}
                onChange={handleDateChange}
                min={formattedToday}
                max={formattedMaxDate}
                className="w-full"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Choose a date within the next 14 days to pick up your order
            </p>
            
            {/* Quick date selection buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[0, 1, 2, 3, 7].map(days => {
                const date = new Date();
                date.setDate(today.getDate() + days);
                
                // Format date for display
                const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
                const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
                const dayNum = date.getDate();
                
                // Determine if this button is for today
                const isToday = days === 0;
                
                return (
                  <Button
                    key={days}
                    type="button"
                    variant={value && isSameDay(value, date) ? "default" : "outline"}
                    size="sm"
                    onClick={() => onChange(date)}
                    className="flex-1 min-w-20"
                  >
                    {isToday ? 'Today' : `${dayOfWeek}, ${month} ${dayNum}`}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}