import React, { useState } from 'react';
import { Calendar, FileText, BarChart3, Users, DollarSign, Clock, TrendingUp, AlertCircle, Download, Printer, RefreshCw, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function PosReports() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState('eod');

  // Fetch End of Day Report
  const { data: eodReport, isLoading: eodLoading, refetch: refetchEOD } = useQuery({
    queryKey: ['/api/pos/reports/end-of-day', selectedDate],
  });

  // Fetch Hourly Sales
  const { data: hourlySales, isLoading: hourlyLoading } = useQuery({
    queryKey: ['/api/pos/reports/hourly-sales', selectedDate],
  });

  // Fetch Cashier Performance
  const { data: cashierPerformance, isLoading: cashierLoading } = useQuery({
    queryKey: ['/api/pos/reports/cashier-performance', selectedDate],
  });

  // Fetch Product Movement
  const { data: productMovement, isLoading: productLoading } = useQuery({
    queryKey: ['/api/pos/reports/product-movement', selectedDate],
  });

  const generateEODReport = async () => {
    try {
      await fetch(`/api/pos/reports/generate-eod/${selectedDate}`, {
        method: 'POST',
      });
      refetchEOD();
    } catch (error) {
      console.error('Failed to generate EOD report:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POS Reports & Analytics</h1>
          <p className="text-gray-600">Professional retail reporting suite</p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
          <Button onClick={generateEODReport} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="eod">End of Day</TabsTrigger>
          <TabsTrigger value="hourly">Hourly Sales</TabsTrigger>
          <TabsTrigger value="cashier">Cashier Performance</TabsTrigger>
          <TabsTrigger value="products">Product Movement</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* End of Day Reports */}
        <TabsContent value="eod">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Sales Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eodReport ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Transactions:</span>
                      <span className="font-semibold">{eodReport.transactionCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gross Sales:</span>
                      <span className="font-semibold">${eodReport.totalGrossSales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discounts:</span>
                      <span className="text-red-600">-${eodReport.totalDiscounts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${eodReport.totalTax}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Net Sales:</span>
                      <span className="text-green-600">${eodReport.totalNetSales}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No report available for {selectedDate}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eodReport ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Cash:</span>
                      <span className="font-semibold">${eodReport.cashSales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Card:</span>
                      <span className="font-semibold">${eodReport.cardSales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Credit:</span>
                      <span className="font-semibold">${eodReport.creditSales}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Payment data unavailable
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cash Reconciliation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Cash Reconciliation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eodReport ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Starting Cash:</span>
                      <span>${eodReport.startingCash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cash Sales:</span>
                      <span>${eodReport.cashSalesTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Drops:</span>
                      <span className="text-red-600">-${eodReport.cashDrops}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected:</span>
                      <span>${eodReport.expectedCash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actual:</span>
                      <span>${eodReport.actualCash}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between">
                      <span>Variance:</span>
                      <span className={`font-bold ${
                        parseFloat(eodReport.cashVariance) === 0 ? 'text-green-600' :
                        parseFloat(eodReport.cashVariance) > 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        ${eodReport.cashVariance}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Cash data unavailable
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Summary */}
          {eodReport && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Daily Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{eodReport.voidCount}</div>
                    <div className="text-sm text-gray-600">Voids</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{eodReport.returnCount}</div>
                    <div className="text-sm text-gray-600">Returns</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{eodReport.discountCount}</div>
                    <div className="text-sm text-gray-600">Discounts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{eodReport.overrideCount}</div>
                    <div className="text-sm text-gray-600">Overrides</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Hourly Sales */}
        <TabsContent value="hourly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hourly Sales Analysis - {selectedDate}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hourlyLoading ? (
                <div className="text-center py-8">Loading hourly data...</div>
              ) : hourlySales && hourlySales.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hourlySales.map((hour: any) => (
                      <div key={hour.hour} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">
                            {hour.hour}:00 - {hour.hour + 1}:00
                          </span>
                          <Badge variant={hour.transactionCount > 10 ? 'default' : 'secondary'}>
                            {hour.transactionCount} sales
                          </Badge>
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          ${hour.totalSales}
                        </div>
                        <div className="text-sm text-gray-600">
                          Avg: ${hour.averageTransaction} | Items: {hour.itemCount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hourly sales data available for {selectedDate}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cashier Performance */}
        <TabsContent value="cashier">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Cashier Performance - {selectedDate}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cashierLoading ? (
                <div className="text-center py-8">Loading performance data...</div>
              ) : cashierPerformance && cashierPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">Cashier</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Transactions</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Total Sales</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Avg Transaction</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Voids</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Accuracy</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Sales/Hour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashierPerformance.map((cashier: any) => (
                        <tr key={cashier.userId}>
                          <td className="border border-gray-200 px-4 py-2 font-medium">
                            {cashier.userFirstName} {cashier.userLastName}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            {cashier.transactionCount}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center text-green-600 font-semibold">
                            ${cashier.totalSales}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            ${cashier.averageTransaction}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            {cashier.voidCount} ({cashier.voidPercentage}%)
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            <Badge variant={parseFloat(cashier.accuracy) >= 98 ? 'default' : 'destructive'}>
                              {cashier.accuracy}%
                            </Badge>
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            ${cashier.salesPerHour}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No cashier performance data available for {selectedDate}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Movement */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Product Movement Analysis - {selectedDate}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productLoading ? (
                <div className="text-center py-8">Loading product data...</div>
              ) : productMovement && productMovement.length > 0 ? (
                <div className="space-y-6">
                  {/* Top Sellers */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-600">Top Selling Products</h3>
                    <div className="grid gap-3">
                      {productMovement
                        .filter((p: any) => p.quantitySold > 0)
                        .sort((a: any, b: any) => b.quantitySold - a.quantitySold)
                        .slice(0, 10)
                        .map((product: any) => (
                          <div key={product.productId} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{product.productName}</div>
                              <div className="text-sm text-gray-600">
                                {product.transactionCount} transactions | {product.customerCount} customers
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">{product.quantitySold} sold</div>
                              <div className="text-sm">${product.revenue} revenue</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Slow Movers */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-orange-600">Slow Moving Products</h3>
                    <div className="grid gap-3">
                      {productMovement
                        .filter((p: any) => p.quantitySold === 0 && p.productName)
                        .slice(0, 5)
                        .map((product: any) => (
                          <div key={product.productId} className="flex justify-between items-center p-3 border rounded-lg bg-orange-50">
                            <div>
                              <div className="font-medium">{product.productName}</div>
                              <div className="text-sm text-gray-600">No sales today</div>
                            </div>
                            <Badge variant="outline" className="text-orange-600">
                              0 sold
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No product movement data available for {selectedDate}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Trail - {selectedDate}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Audit trail functionality will be implemented in the next phase
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
        <Button variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print Report
        </Button>
      </div>
    </div>
  );
}