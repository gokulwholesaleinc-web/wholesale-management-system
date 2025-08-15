import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, TrendingDown, Users, DollarSign, Target, BarChart3, RefreshCw, Brain, Lightbulb } from 'lucide-react';

interface ProfitMarginAnalysis {
  productProfitMargins: Array<{
    productId: number;
    productName: string;
    categoryName: string;
    cost: number;
    price: number;
    margin: number;
    marginPercentage: number;
    unitsSold: number;
    totalProfit: number;
    profitability: 'high' | 'medium' | 'low';
  }>;
  categoryProfitMargins: Array<{
    categoryName: string;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    marginPercentage: number;
    productCount: number;
  }>;
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

interface CustomerLifetimeValue {
  customers: Array<{
    customerId: string;
    customerName: string;
    totalRevenue: number;
    orderCount: number;
    averageOrderValue: number;
    lifetimeValue: number;
    predictedLifetimeValue: number;
    customerSegment: 'high-value' | 'medium-value' | 'low-value' | 'at-risk';
    churnRisk: number;
  }>;
  segments: {
    highValue: { count: number; totalValue: number; averageValue: number };
    mediumValue: { count: number; totalValue: number; averageValue: number };
    lowValue: { count: number; totalValue: number; averageValue: number };
    atRisk: { count: number; totalValue: number; averageValue: number };
  };
  insights: string[];
  recommendations: string[];
}

interface CompetitorPricing {
  productComparisons: Array<{
    productId: number;
    productName: string;
    ourPrice: number;
    estimatedMarketPrice: number;
    pricePosition: 'below-market' | 'at-market' | 'above-market';
    competitiveAdvantage: number;
    recommendedPrice: number;
    potentialRevenueLift: number;
  }>;
  marketInsights: {
    averageMarketPosition: string;
    pricingOpportunities: number;
    riskProducts: number;
    optimizationPotential: number;
  };
  recommendations: string[];
}

interface SalesForecast {
  forecasts: Array<{
    period: string;
    predictedRevenue: number;
    predictedOrders: number;
    confidenceInterval: {
      low: number;
      high: number;
      confidence: number;
    };
    trends: string[];
  }>;
  seasonalPatterns: Array<{
    month: string;
    salesMultiplier: number;
    expectedRevenue: number;
  }>;
  opportunities: string[];
  accuracy: {
    modelConfidence: number;
    dataQuality: number;
  };
}

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

export default function BusinessIntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch Business Intelligence Dashboard Overview
  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery<BIDashboard>({
    queryKey: ['/api/admin/business-intelligence/dashboard'],
    enabled: activeTab === 'overview'
  });

  // Fetch Profit Margin Analysis
  const { data: profitMargins, isLoading: profitLoading, refetch: refetchProfitMargins } = useQuery<ProfitMarginAnalysis>({
    queryKey: ['/api/admin/business-intelligence/profit-margins'],
    enabled: activeTab === 'profit-margins'
  });

  // Fetch Customer Lifetime Value
  const { data: customerLTV, isLoading: clvLoading, refetch: refetchCustomerLTV } = useQuery<CustomerLifetimeValue>({
    queryKey: ['/api/admin/business-intelligence/customer-lifetime-value'],
    enabled: activeTab === 'customer-value'
  });

  // Fetch Competitor Pricing
  const { data: competitorPricing, isLoading: pricingLoading, refetch: refetchPricing } = useQuery<CompetitorPricing>({
    queryKey: ['/api/admin/business-intelligence/competitor-pricing'],
    enabled: activeTab === 'pricing'
  });

  // Fetch Sales Forecast
  const { data: salesForecast, isLoading: forecastLoading, refetch: refetchForecast } = useQuery<SalesForecast>({
    queryKey: ['/api/admin/business-intelligence/sales-forecast'],
    enabled: activeTab === 'forecast'
  });

  // Fetch AI Insights
  const { data: aiStats, isLoading: aiLoading, refetch: refetchAI } = useQuery<AIRecommendationStats>({
    queryKey: ['/api/admin/ai-recommendations/stats', 'month'],
    enabled: activeTab === 'ai-insights'
  });

  const { data: topPerformingAI, isLoading: topAILoading, refetch: refetchTopAI } = useQuery<TopPerformingRecommendation[]>({
    queryKey: ['/api/admin/ai-recommendations/top-performing'],
    enabled: activeTab === 'ai-insights'
  });

  const handleRefresh = () => {
    switch (activeTab) {
      case 'overview':
        refetchDashboard();
        break;
      case 'profit-margins':
        refetchProfitMargins();
        break;
      case 'customer-value':
        refetchCustomerLTV();
        break;
      case 'pricing':
        refetchPricing();
        break;
      case 'forecast':
        refetchForecast();
        break;
      case 'ai-insights':
        refetchAI();
        refetchTopAI();
        break;
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getProfitabilityColor = (profitability: string) => {
    switch (profitability) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'high-value': return 'bg-green-100 text-green-800';
      case 'medium-value': return 'bg-blue-100 text-blue-800';
      case 'low-value': return 'bg-yellow-100 text-yellow-800';
      case 'at-risk': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPricePositionColor = (position: string) => {
    switch (position) {
      case 'below-market': return 'bg-blue-100 text-blue-800';
      case 'at-market': return 'bg-green-100 text-green-800';
      case 'above-market': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Intelligence Dashboard</h1>
          <p className="text-muted-foreground">
            Advanced analytics and insights for data-driven decision making
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profit-margins">Profit Margins</TabsTrigger>
          <TabsTrigger value="customer-value">Customer Value</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Intelligence</TabsTrigger>
          <TabsTrigger value="forecast">Sales Forecast</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {dashboardLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : dashboard ? (
            <>
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(dashboard.overview.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatPercentage(dashboard.overview.overallMargin)} margin
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(dashboard.overview.totalProfit)}</div>
                    <p className="text-xs text-muted-foreground">
                      From {dashboard.overview.activeCustomers} customers
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Customer Value</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(dashboard.overview.averageCustomerValue)}</div>
                    <p className="text-xs text-muted-foreground">
                      Lifetime value per customer
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Forecast Confidence</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercentage(dashboard.overview.forecastConfidence)}</div>
                    <p className="text-xs text-muted-foreground">
                      Model accuracy
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts */}
              {dashboard.alerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Action Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dashboard.alerts.map((alert, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">{alert}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Business Insights</CardTitle>
                  <CardDescription>AI-powered recommendations for business growth</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboard.keyInsights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                        <BarChart3 className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span className="text-sm">{insight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Profit Margins</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">High Margin Products</span>
                      <Badge variant="secondary">{dashboard.quickStats.profitMargins.highMarginProducts}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Low Margin Products</span>
                      <Badge variant="destructive">{dashboard.quickStats.profitMargins.lowMarginProducts}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Top Category: {dashboard.quickStats.profitMargins.topCategory}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Customer Value</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">High Value</span>
                      <Badge variant="secondary">{dashboard.quickStats.customerValue.highValueCustomers}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">At Risk</span>
                      <Badge variant="destructive">{dashboard.quickStats.customerValue.atRiskCustomers}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      AOV: {formatCurrency(dashboard.quickStats.customerValue.averageOrderValue)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Pricing Position</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Below Market</span>
                      <Badge variant="secondary">{dashboard.quickStats.pricing.belowMarket}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Above Market</span>
                      <Badge variant="destructive">{dashboard.quickStats.pricing.aboveMarket}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dashboard.quickStats.pricing.optimizationOpportunities} optimization opportunities
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sales Forecast</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-lg font-semibold">
                      {formatCurrency(dashboard.quickStats.forecast.nextMonthRevenue)}
                    </div>
                    <Progress value={dashboard.quickStats.forecast.confidence} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {formatPercentage(dashboard.quickStats.forecast.confidence)} confidence • {dashboard.quickStats.forecast.trend}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No dashboard data available</p>
            </div>
          )}
        </TabsContent>

        {/* Profit Margins Tab */}
        <TabsContent value="profit-margins" className="space-y-4">
          {profitLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : profitMargins ? (
            <>
              {/* Overall Metrics */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(profitMargins.overallMetrics.totalRevenue)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(profitMargins.overallMetrics.totalProfit)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Margin</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercentage(profitMargins.overallMetrics.overallMarginPercentage)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Product Profit Margins */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Profit Analysis</CardTitle>
                  <CardDescription>Top performing products by profitability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profitMargins.productProfitMargins.slice(0, 10).map((product) => (
                      <div key={product.productId} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-sm text-muted-foreground">{product.categoryName}</div>
                        </div>
                        <div className="text-right mr-4">
                          <div className="font-medium">{formatCurrency(product.price)}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.unitsSold} units sold
                          </div>
                        </div>
                        <div className="text-right mr-4">
                          <div className="font-medium">{formatCurrency(product.totalProfit)}</div>
                          <div className="text-sm text-muted-foreground">total profit</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatPercentage(product.marginPercentage)}</div>
                          <Badge className={getProfitabilityColor(product.profitability)}>
                            {product.profitability}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Profit Optimization Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {profitMargins.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded">
                        <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                        <span className="text-sm">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No profit margin data available</p>
            </div>
          )}
        </TabsContent>

        {/* Customer Value Tab */}
        <TabsContent value="customer-value" className="space-y-4">
          {clvLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : customerLTV ? (
            <>
              {/* Customer Segments */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">High Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customerLTV.segments.highValue.count}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {formatCurrency(customerLTV.segments.highValue.averageValue)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Medium Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customerLTV.segments.mediumValue.count}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {formatCurrency(customerLTV.segments.mediumValue.averageValue)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Low Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customerLTV.segments.lowValue.count}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {formatCurrency(customerLTV.segments.lowValue.averageValue)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">At Risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customerLTV.segments.atRisk.count}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {formatCurrency(customerLTV.segments.atRisk.averageValue)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Customer List */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Lifetime Value Analysis</CardTitle>
                  <CardDescription>Top customers by lifetime value and churn risk</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customerLTV.customers.slice(0, 15).map((customer) => (
                      <div key={customer.customerId} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{customer.customerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {customer.orderCount} orders • {formatCurrency(customer.averageOrderValue)} AOV
                          </div>
                        </div>
                        <div className="text-right mr-4">
                          <div className="font-medium">{formatCurrency(customer.lifetimeValue)}</div>
                          <div className="text-sm text-muted-foreground">current LTV</div>
                        </div>
                        <div className="text-right mr-4">
                          <div className="font-medium">{formatCurrency(customer.predictedLifetimeValue)}</div>
                          <div className="text-sm text-muted-foreground">predicted LTV</div>
                        </div>
                        <div className="text-right">
                          <Badge className={getSegmentColor(customer.customerSegment)}>
                            {customer.customerSegment}
                          </Badge>
                          {customer.churnRisk > 50 && (
                            <div className="text-xs text-red-600 mt-1">
                              {customer.churnRisk}% churn risk
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Insights and Recommendations */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {customerLTV.insights.map((insight, index) => (
                        <div key={index} className="text-sm p-2 bg-blue-50 rounded">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Retention Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {customerLTV.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded">
                          <Users className="h-4 w-4 text-green-500 mt-0.5" />
                          <span className="text-sm">{recommendation}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No customer lifetime value data available</p>
            </div>
          )}
        </TabsContent>

        {/* Pricing Intelligence Tab */}
        <TabsContent value="pricing" className="space-y-4">
          {pricingLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : competitorPricing ? (
            <>
              {/* Market Insights */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Market Position</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize">{competitorPricing.marketInsights.averageMarketPosition}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Pricing Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{competitorPricing.marketInsights.pricingOpportunities}</div>
                    <p className="text-xs text-muted-foreground">products to optimize</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Risk Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{competitorPricing.marketInsights.riskProducts}</div>
                    <p className="text-xs text-muted-foreground">may be overpriced</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Optimization Potential</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercentage(competitorPricing.marketInsights.optimizationPotential)}</div>
                    <p className="text-xs text-muted-foreground">avg revenue lift</p>
                  </CardContent>
                </Card>
              </div>

              {/* Product Pricing Comparisons */}
              <Card>
                <CardHeader>
                  <CardTitle>Competitive Pricing Analysis</CardTitle>
                  <CardDescription>How your prices compare to estimated market rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {competitorPricing.productComparisons.slice(0, 15).map((product) => (
                      <div key={product.productId} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{product.productName}</div>
                          <Badge className={getPricePositionColor(product.pricePosition)}>
                            {product.pricePosition}
                          </Badge>
                        </div>
                        <div className="text-right mr-4">
                          <div className="font-medium">{formatCurrency(product.ourPrice)}</div>
                          <div className="text-sm text-muted-foreground">our price</div>
                        </div>
                        <div className="text-right mr-4">
                          <div className="font-medium">{formatCurrency(product.estimatedMarketPrice)}</div>
                          <div className="text-sm text-muted-foreground">market est.</div>
                        </div>
                        <div className="text-right mr-4">
                          <div className="font-medium">{formatCurrency(product.recommendedPrice)}</div>
                          <div className="text-sm text-muted-foreground">recommended</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${product.potentialRevenueLift > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.potentialRevenueLift > 0 ? '+' : ''}{formatPercentage(product.potentialRevenueLift)}
                          </div>
                          <div className="text-sm text-muted-foreground">potential lift</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Strategy Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {competitorPricing.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                        <DollarSign className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span className="text-sm">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No pricing intelligence data available</p>
            </div>
          )}
        </TabsContent>

        {/* Sales Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          {forecastLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : salesForecast ? (
            <>
              {/* Forecast Accuracy */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Model Confidence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercentage(salesForecast.accuracy.modelConfidence)}</div>
                    <Progress value={salesForecast.accuracy.modelConfidence} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Data Quality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercentage(salesForecast.accuracy.dataQuality)}</div>
                    <Progress value={salesForecast.accuracy.dataQuality} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Sales Forecasts */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales Forecast</CardTitle>
                  <CardDescription>Predicted revenue and order volume for upcoming periods</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {salesForecast.forecasts.map((forecast, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{forecast.period}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatPercentage(forecast.confidenceInterval.confidence)} confidence
                          </div>
                        </div>
                        <div className="text-right mr-4">
                          <div className="font-medium">{formatCurrency(forecast.predictedRevenue)}</div>
                          <div className="text-sm text-muted-foreground">predicted revenue</div>
                        </div>
                        <div className="text-right mr-4">
                          <div className="font-medium">{forecast.predictedOrders}</div>
                          <div className="text-sm text-muted-foreground">predicted orders</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            {formatCurrency(forecast.confidenceInterval.low)} - {formatCurrency(forecast.confidenceInterval.high)}
                          </div>
                          <div className="text-xs text-muted-foreground">confidence range</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Seasonal Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle>Seasonal Sales Patterns</CardTitle>
                  <CardDescription>Expected sales multipliers by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-6">
                    {salesForecast.seasonalPatterns.map((pattern, index) => (
                      <div key={index} className="text-center p-2 border rounded">
                        <div className="font-medium text-sm">{pattern.month.slice(0, 3)}</div>
                        <div className="text-lg font-bold">{pattern.salesMultiplier.toFixed(2)}x</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(pattern.expectedRevenue)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Opportunities */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {salesForecast.opportunities.map((opportunity, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded">
                        <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                        <span className="text-sm">{opportunity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sales forecast data available</p>
            </div>
          )}
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-4">
          {aiLoading || topAILoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : aiStats ? (
            <>
              {/* AI Performance Overview */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total AI Views</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aiStats.overall?.totalViewed || 0}</div>
                    <p className="text-xs text-muted-foreground">recommendations shown</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Click-Through Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aiStats.overall?.clickThroughRate || '0%'}</div>
                    <p className="text-xs text-muted-foreground">user engagement</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cart Conversion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aiStats.overall?.cartConversionRate || '0%'}</div>
                    <p className="text-xs text-muted-foreground">added to cart</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Purchase Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aiStats.overall?.purchaseConversionRate || '0%'}</div>
                    <p className="text-xs text-muted-foreground">completed purchases</p>
                  </CardContent>
                </Card>
              </div>

              {/* AI Recommendation Types Performance */}
              {aiStats.byType && aiStats.byType.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>AI Recommendation Performance by Type</CardTitle>
                    <CardDescription>How different AI recommendation types perform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {aiStats.byType.map((type, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex-1">
                            <div className="font-medium capitalize">{type.recommendationType.replace('-', ' ')}</div>
                            <div className="text-sm text-muted-foreground">
                              {type.totalViewed} views • {type.totalClicked} clicks
                            </div>
                          </div>
                          <div className="text-right mr-4">
                            <div className="font-medium">{type.clickThroughRate}</div>
                            <div className="text-sm text-muted-foreground">CTR</div>
                          </div>
                          <div className="text-right mr-4">
                            <div className="font-medium">{type.cartConversionRate}</div>
                            <div className="text-sm text-muted-foreground">cart rate</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{type.purchaseConversionRate}</div>
                            <div className="text-sm text-muted-foreground">purchase rate</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Performing AI Recommendations */}
              {topPerformingAI && topPerformingAI.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing AI Recommendations</CardTitle>
                    <CardDescription>Products with highest AI-driven conversion rates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topPerformingAI.slice(0, 10).map((product, index) => (
                        <div key={product.productId} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex-1">
                            <div className="font-medium">{product.productName}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.totalViewed} views • {product.totalClicked} clicks
                            </div>
                          </div>
                          <div className="text-right mr-4">
                            <div className="font-medium">{product.conversionRate}</div>
                            <div className="text-sm text-muted-foreground">conversion rate</div>
                          </div>
                          <div className="text-right mr-4">
                            <div className="font-medium">{product.totalPurchased}</div>
                            <div className="text-sm text-muted-foreground">purchases</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(product.revenue || 0)}</div>
                            <div className="text-sm text-muted-foreground">revenue</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Insights and Recommendations */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Performance Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="p-2 bg-blue-50 rounded text-sm">
                        AI recommendations are generating valuable customer engagement with an average CTR of {aiStats.overall?.clickThroughRate || '0%'}
                      </div>
                      <div className="p-2 bg-green-50 rounded text-sm">
                        Cart conversion rate of {aiStats.overall?.cartConversionRate || '0%'} shows AI is effectively identifying customer preferences
                      </div>
                      <div className="p-2 bg-purple-50 rounded text-sm">
                        Purchase completion rate of {aiStats.overall?.purchaseConversionRate || '0%'} demonstrates strong AI-driven revenue impact
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Optimization Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="p-2 bg-amber-50 rounded text-sm">
                        Focus on improving low-performing recommendation types to increase overall conversion
                      </div>
                      <div className="p-2 bg-amber-50 rounded text-sm">
                        Leverage top-performing products as templates for recommendation algorithm improvement
                      </div>
                      <div className="p-2 bg-amber-50 rounded text-sm">
                        Consider A/B testing different recommendation placements and timing strategies
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No AI insights data available</p>
              <p className="text-sm text-gray-500 mt-2">AI recommendations will appear here once customers start interacting with suggestions</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}