import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from 'lucide-react';
import { ProductGrid } from './ProductGrid';
import { VoiceSearchButton } from './VoiceSearchButton';

export function ProductSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Parse categories
  const categoryId = selectedCategory ? parseInt(selectedCategory) : null;
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle voice search results
  const handleVoiceSearchResult = (text: string) => {
    setSearchTerm(text);
  };
  
  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === 'all' ? null : value);
  };
  
  // Clear filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col gap-4 md:flex-row">
          {/* Search input with voice search */}
          <div className="relative flex-grow flex">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products by name, code or description..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-9 h-10 pr-12 w-full"
              />
              <div className="absolute right-2 top-1">
                <VoiceSearchButton onSearchResult={handleVoiceSearchResult} />
              </div>
            </div>
          </div>
          
          {/* Category filter */}
          <div className="w-full md:w-64">
            <Select
              value={selectedCategory || 'all'}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger>
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4 text-gray-500" />
                  <SelectValue placeholder="All Categories" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category: any) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Clear filters button - only show if there are filters active */}
          {(searchTerm || selectedCategory) && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="whitespace-nowrap"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>
      
      {/* Product grid with filters applied */}
      <ProductGrid searchTerm={searchTerm} categoryId={categoryId} />
    </div>
  );
}