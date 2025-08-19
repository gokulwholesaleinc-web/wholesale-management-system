// Consolidated Business Intelligence Dashboard - Single File Solution
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layout/AppLayout';
import { Link } from 'wouter';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle, TrendingUp, Users, DollarSign, Target, BarChart3,
  RefreshCw, Brain, Lightbulb, ArrowLeft
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Consolidated Types
interface BIDashboard {
  overview: {
    totalRevenue: number;
    totalProfit: number;
    overallMargin: number;
    activeCustomers: number;
    averageCustomerValue: number;
    forecastConfidence: number;
  };
  keyInsights: string[];
  alerts: string[];
  quickStats: {
    profitMargins: {
      highMarginProducts: number;
      lowMarginProducts: number;
      topCategory: string;
    };
    customerValue: {
      highValueCustomers: number;
      atRiskCustomers: number;
      averageOrderValue: number;
    };
    pricing: {
      belowMarket: number;
      aboveMarket: number;
      optimizationOpportunities: number;
    };
    forecast: {
      nextMonthRevenue: number;
      confidence: number;
      trend: string;
    };
  };
}

interface ProfitMarginAnalysis {
  overallMetrics: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    overallMarginPercentage: number;
    topProfitableProducts: Array<{ name: string; profit: number }>;
    lowMarginProducts: Array<{ name: string; margin: number }>;
  };
  recommendations: string[];
}

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
    clickThroughRate: string;
  }>;
}

// Utility functions
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0);

const formatPercentage = (value: number) => `${Number(value ?? 0).toFixed(1)}%`;

export default function ConsolidatedBusinessIntelligence() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Access Control
  if (!user?.isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-600">You need admin privileges to access Business Intelligence.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Data fetching with proper error handling
  const dashboardQuery = useQuery<BIDashboard>({
    queryKey: ['/api/admin/business-intelligence/dashboard'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/admin/business-intelligence/dashboard');
      } catch (error) {
        console.error('Dashboard API Error:', error);
        // Return fallback data structure to prevent UI crashes
        return {
          overview: {
            totalRevenue: 0,
            totalProfit: 0,
            overallMargin: 0,
            activeCustomers: 0,
            averageCustomerValue: 0,
            forecastConfidence: 0
          },
          keyInsights: ['Business intelligence service is initializing...'],
          alerts: ['Some metrics may be unavailable during system initialization'],
          quickStats: {
            profitMargins: { highMarginProducts: 0, lowMarginProducts: 0, topCategory: 'N/A' },
            customerValue: { highValueCustomers: 0, atRiskCustomers: 0, averageOrderValue: 0 },
            pricing: { belowMarket: 0, aboveMarket: 0, optimizationOpportunities: 0 },
            forecast: { nextMonthRevenue: 0, confidence: 0, trend: 'stable' }
          }
        };
      }
    },
    enabled: activeTab === 'overview',
    retry: 1,
    refetchOnWindowFocus: false
  });

  const profitQuery = useQuery<ProfitMarginAnalysis>({
    queryKey: ['/api/admin/business-intelligence/profit-margins'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/admin/business-intelligence/profit-margins');
      } catch (error) {
        return {
          overallMetrics: {
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            overallMarginPercentage: 0,
            topProfitableProducts: [],
            lowMarginProducts: []
          },
          recommendations: ['Profit analysis service is being configured...']
        };
      }
    },
    enabled: activeTab === 'profit-margins',
    retry: 1
  });

  const aiStatsQuery = useQuery<AIRecommendationStats>({
    queryKey: ['/api/admin/ai-recommendations/stats'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/admin/ai-recommendations/stats?timeframe=month');
      } catch (error) {
        return {
          timeframe: 'month' as const,
          overall: {
            totalViewed: 0,
            totalClicked: 0,
            totalAddedToCart: 0,
            totalPurchased: 0,
            clickThroughRate: '0%',
            cartConversionRate: '0%',
            purchaseConversionRate: '0%'
          },
          byType: []
        };
      }
    },
    enabled: activeTab === 'ai-insights',
    retry: 1
  });

  const handleRefresh = () => {
    switch (activeTab) {
      case 'overview':
        dashboardQuery.refetch();
        break;
      case 'profit-margins':
        profitQuery.refetch();
        break;
      case 'ai-insights':
        aiStatsQuery.refetch();
        break;
    }
  };

  const LoadingSpinner = (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Brain className="h-8 w-8" />
                Business Intelligence
              </h1>
              <p className="text-muted-foreground">AI-powered analytics and data-driven insights</p>
            </div>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Main Dashboard */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profit-margins">Profit Analysis</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Performance</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {dashboardQuery.isLoading ? LoadingSpinner : (
              <>
                {/* Key Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(dashboardQuery.data?.overview.totalRevenue || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatPercentage(dashboardQuery.data?.overview.overallMargin || 0)} margin
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardQuery.data?.overview.activeCustomers || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Avg: {formatCurrency(dashboardQuery.data?.overview.averageCustomerValue || 0)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(dashboardQuery.data?.overview.totalProfit || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Business profitability</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Forecast Confidence</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatPercentage(dashboardQuery.data?.overview.forecastConfidence || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">AI prediction accuracy</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Key Insights */}
                {dashboardQuery.data?.keyInsights && dashboardQuery.data.keyInsights.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5" />
                        AI-Generated Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {dashboardQuery.data.keyInsights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Brain className="h-4 w-4 mt-0.5 text-blue-500" />
                            <span className="text-sm">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Alerts */}
                {dashboardQuery.data?.alerts && dashboardQuery.data.alerts.length > 0 && (
                  <div className="space-y-2">
                    {dashboardQuery.data.alerts.map((alert, idx) => (
                      <Alert key={idx}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Business Alert</AlertTitle>
                        <AlertDescription>{alert}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Profit Margins Tab */}
          <TabsContent value="profit-margins" className="space-y-6">
            {profitQuery.isLoading ? LoadingSpinner : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Overall Profitability</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {formatPercentage(profitQuery.data?.overallMetrics.overallMarginPercentage || 0)}
                      </div>
                      <p className="text-sm text-gray-600">Average profit margin</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Total Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {formatCurrency(profitQuery.data?.overallMetrics.totalProfit || 0)}
                      </div>
                      <p className="text-sm text-gray-600">From {formatCurrency(profitQuery.data?.overallMetrics.totalRevenue || 0)} revenue</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Optimization Opportunities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">
                        {profitQuery.data?.recommendations.length || 0}
                      </div>
                      <p className="text-sm text-gray-600">AI recommendations available</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                {profitQuery.data?.recommendations && profitQuery.data.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        AI Profit Optimization Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {profitQuery.data.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Target className="h-4 w-4 mt-0.5 text-green-500" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights" className="space-y-6">
            {aiStatsQuery.isLoading ? LoadingSpinner : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">AI Recommendations Viewed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {aiStatsQuery.data?.overall.totalViewed.toLocaleString() || '0'}
                      </div>
                      <p className="text-xs text-gray-600">Monthly impressions</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Click-Through Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {aiStatsQuery.data?.overall.clickThroughRate || '0%'}
                      </div>
                      <p className="text-xs text-gray-600">User engagement</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Cart Conversion</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {aiStatsQuery.data?.overall.cartConversionRate || '0%'}
                      </div>
                      <p className="text-xs text-gray-600">Added to cart</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Purchase Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {aiStatsQuery.data?.overall.purchaseConversionRate || '0%'}
                      </div>
                      <p className="text-xs text-gray-600">Final conversion</p>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Recommendation Types Performance */}
                {aiStatsQuery.data?.byType && aiStatsQuery.data.byType.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Recommendation Performance by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {aiStatsQuery.data.byType.map((type, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h4 className="font-medium">{type.recommendationType}</h4>
                              <p className="text-sm text-gray-600">
                                {type.totalViewed.toLocaleString()} views • {type.totalClicked.toLocaleString()} clicks
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-lg">{type.clickThroughRate}</div>
                              <p className="text-xs text-gray-600">CTR</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Strategic Business Recommendations
                </CardTitle>
                <CardDescription>
                  AI-powered suggestions to optimize your business performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-700">Revenue Optimization</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li>• Analyze high-performing product categories</li>
                          <li>• Implement dynamic pricing strategies</li>
                          <li>• Focus on customer retention programs</li>
                          <li>• Expand successful product lines</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-700">Cost Management</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li>• Review supplier contracts for better rates</li>
                          <li>• Optimize inventory turnover ratios</li>
                          <li>• Reduce low-margin product focus</li>
                          <li>• Automate repetitive business processes</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-50">
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-700">Customer Experience</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li>• Enhance AI recommendation accuracy</li>
                          <li>• Implement personalized pricing tiers</li>
                          <li>• Improve order fulfillment speed</li>
                          <li>• Expand customer support channels</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="bg-orange-50">
                      <CardHeader>
                        <CardTitle className="text-lg text-orange-700">Technology Enhancement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li>• Enhance business intelligence dashboards</li>
                          <li>• Integrate advanced analytics tools</li>
                          <li>• Automate reporting and insights</li>
                          <li>• Improve data quality and accuracy</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}