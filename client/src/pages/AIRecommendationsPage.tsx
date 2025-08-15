import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from "@/components/ui/page-header";

import { 
  Eye, 
  MousePointer, 
  ShoppingCart, 
  DollarSign,
  TrendingUp,
  Users,
  Package,
  Brain,
  RefreshCw,
  Loader2,
  BarChart3,
  Target,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AIRecommendationStats {
  timeframe: 'week' | 'month' | 'quarter';
  overall: {
    totalViewed: number;
    totalClicked: number;
    totalAddedToCart: number;
    totalPurchased: number;
    clickThroughRate: string;
    cartConversionRate: string;
    purchaseConversionRate: string;
  };
  byType: Array<{
    recommendationType: string;
    totalViewed: number;
    totalClicked: number;
    totalAddedToCart: number;
    totalPurchased: number;
    clickThroughRate: string;
    cartConversionRate: string;
    purchaseConversionRate: string;
  }>;
}

interface TopPerformingRecommendation {
  productId: number;
  productName: string;
  totalViewed: number;
  totalClicked: number;
  totalAddedToCart: number;
  totalPurchased: number;
  conversionRate: string;
  revenue: number;
}

export default function AIRecommendationsPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  // Fetch AI recommendation stats
  const { 
    data: recommendationStats, 
    isLoading: isStatsLoading, 
    isError: isStatsError,
    refetch: refetchStats 
  } = useQuery({
    queryKey: ['/api/admin/ai-recommendations/stats', selectedTimeframe],
    retry: 1,
    staleTime: 300000, // Cache for 5 minutes
  });

  // Fetch top performing recommendations
  const { 
    data: topPerforming, 
    isLoading: isTopLoading, 
    isError: isTopError,
    refetch: refetchTop 
  } = useQuery({
    queryKey: ['/api/admin/ai-recommendations/top-performing'],
    retry: 1,
    staleTime: 300000,
  });

  const handleRefreshAll = () => {
    refetchStats();
    refetchTop();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (value: string | number): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `${numValue.toFixed(1)}%`;
  };

  const getPerformanceIndicator = (rate: string | number) => {
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    if (numRate > 5) return { icon: ArrowUpRight, color: 'text-green-600' };
    if (numRate < 2) return { icon: ArrowDownRight, color: 'text-red-600' };
    return { icon: Minus, color: 'text-yellow-600' };
  };

  const renderOverviewCards = () => {
    if (isStatsLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (isStatsError || !recommendationStats) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">Failed to load recommendation stats</div>
          <Button onClick={() => refetchStats()} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      );
    }

    const { overall } = recommendationStats as AIRecommendationStats;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">{formatNumber(overall.totalViewed)}</p>
                <p className="text-xs text-gray-500">AI suggestion shows</p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Click Rate</p>
                <p className="text-2xl font-bold">{formatPercentage(overall.clickThroughRate)}</p>
                <p className="text-xs text-gray-500">Customers view suggestions</p>
              </div>
              <MousePointer className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cart Adds</p>
                <p className="text-2xl font-bold">{formatPercentage(overall.cartConversionRate)}</p>
                <p className="text-xs text-gray-500">Items added via AI</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Purchases</p>
                <p className="text-2xl font-bold">{formatPercentage(overall.purchaseConversionRate)}</p>
                <p className="text-xs text-gray-500">Completed purchases</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPerformanceByType = () => {
    if (isStatsLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Recommendation Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (isStatsError || !recommendationStats) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Recommendation Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600">Failed to load performance data</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance by Recommendation Type
          </CardTitle>
          <p className="text-sm text-gray-600">AI suggestion effectiveness across different contexts</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {(recommendationStats as AIRecommendationStats).byType.map((type: any) => {
              const PerformanceIcon = getPerformanceIndicator(type.clickThroughRate);
              
              return (
                <div key={type.recommendationType} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {type.recommendationType}
                      </Badge>
                      <span className="text-sm text-gray-600">{formatNumber(type.totalViewed)} views</span>
                    </div>
                    <PerformanceIcon.icon className={`h-4 w-4 ${PerformanceIcon.color}`} />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Click Rate</p>
                      <p className="font-medium">{formatPercentage(type.clickThroughRate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Cart Rate</p>
                      <p className="font-medium">{formatPercentage(type.cartConversionRate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Purchase Rate</p>
                      <p className="font-medium">{formatPercentage(type.purchaseConversionRate)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTopPerformingRecommendations = () => {
    if (isTopLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (isTopError || !topPerforming) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600">Failed to load top performing products</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Top Performing AI Recommendations
          </CardTitle>
          <p className="text-sm text-gray-600">Products that convert best when suggested by AI</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerforming && Array.isArray(topPerforming) && topPerforming.length > 0 ? topPerforming.map((product: TopPerformingRecommendation, index: number) => (
              <div key={product.productId} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="font-medium text-blue-600">{product.productName}</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {formatPercentage(product.conversionRate)} conversion
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Views</p>
                    <p className="font-medium">{formatNumber(product.totalViewed)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Clicks</p>
                    <p className="font-medium">{formatNumber(product.totalClicked)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Cart Adds</p>
                    <p className="font-medium">{formatNumber(product.totalAddedToCart)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Revenue</p>
                    <p className="font-medium">${product.revenue.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recommendation data available yet</p>
                <p className="text-sm text-gray-500">AI recommendations will appear here once customers start interacting with suggestions</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout 
      title="AI Recommendation Analytics" 
      description="Performance insights for AI-powered product suggestions"
    >
      <PageHeader
        title="AI Recommendation Analytics"
        description="Performance insights for AI-powered product suggestions"
        actions={
          <div className="flex items-center gap-4">
            <Select value={selectedTimeframe} onValueChange={(value: 'week' | 'month' | 'quarter') => setSelectedTimeframe(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleRefreshAll} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Analytics
            </Button>
          </div>
        }
      />
      
      <div className="space-y-6">
        {/* Overview Cards */}
        {renderOverviewCards()}
        
        {/* Performance by Type and Top Performing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderPerformanceByType()}
          {renderTopPerformingRecommendations()}
        </div>
        
        {/* Additional Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI Recommendation Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Brain className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-medium text-blue-900">Smart Suggestions</h3>
                <p className="text-sm text-blue-700 mt-1">
                  AI analyzes customer behavior to suggest relevant products at checkout
                </p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-medium text-green-900">Increase Sales</h3>
                <p className="text-sm text-green-700 mt-1">
                  Strategic product recommendations boost average order value
                </p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-medium text-purple-900">Customer Experience</h3>
                <p className="text-sm text-purple-700 mt-1">
                  Personalized suggestions enhance shopping experience
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}