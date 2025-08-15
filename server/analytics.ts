import { db } from "./db";
import { orders, orderItems, products, users } from "../shared/schema";
import { eq, sql, desc, and, gte, lte, inArray } from "drizzle-orm";

export interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    id: number;
    name: string;
    totalSold: number;
    revenue: number;
  }>;
  customerTrends: Array<{
    customerId: string;
    customerName: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    orderCount: number;
  }>;
  revenueGrowth: number;
  topCustomers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    orderCount: number;
  }>;
}

export interface CustomerPurchaseHistory {
  customerId: string;
  totalPurchases: number;
  totalSpent: number;
  averageOrderValue: number;
  favoriteProducts: Array<{
    productId: number;
    productName: string;
    timesPurchased: number;
    totalSpent: number;
  }>;
  purchaseFrequency: string;
  lastPurchaseDate: string;
  recommendedProducts: Array<{
    id: number;
    name: string;
    reason: string;
  }>;
}

export interface TrendingProduct {
  id: number;
  name: string;
  totalSold: number;
  revenue: number;
}

export class AnalyticsEngine {
  static async getSalesAnalytics(startDate?: Date, endDate?: Date): Promise<SalesAnalytics> {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth() - 11, 1); // Last 12 months
    const defaultEnd = now;

    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    // Get total revenue and order count
    const revenueData = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        totalOrders: sql<number>`COUNT(*)`,
        averageOrderValue: sql<number>`COALESCE(AVG(${orders.total}), 0)`
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, start),
        lte(orders.createdAt, end)
      ));

    // Get top products by sales volume
    const topProducts = await db
      .select({
        id: products.id,
        name: products.name,
        totalSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        revenue: sql<number>`COALESCE(SUM(${orderItems.quantity} * ${orderItems.price}), 0)`
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        gte(orders.createdAt, start),
        lte(orders.createdAt, end)
      ))
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`SUM(${orderItems.quantity} * ${orderItems.price})`))
      .limit(10);

    // Get customer trends
    const customerTrends = await db
      .select({
        customerId: orders.userId,
        customerName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
        totalOrders: sql<number>`COUNT(*)`,
        totalSpent: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        lastOrderDate: sql<string>`MAX(${orders.createdAt})`
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(and(
        gte(orders.createdAt, start),
        lte(orders.createdAt, end)
      ))
      .groupBy(orders.userId, users.firstName, users.lastName, users.username)
      .orderBy(desc(sql`SUM(${orders.total})`))
      .limit(20);

    // Get monthly revenue trends
    const monthlyRevenue = await db
      .select({
        month: sql<string>`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`,
        revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        orderCount: sql<number>`COUNT(*)`
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, start),
        lte(orders.createdAt, end)
      ))
      .groupBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`);

    // Calculate revenue growth (current month vs previous month)
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentMonthRevenue = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`
      })
      .from(orders)
      .where(gte(orders.createdAt, currentMonth));

    const previousMonthRevenue = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, previousMonth),
        lte(orders.createdAt, currentMonth)
      ));

    const revenueGrowth = previousMonthRevenue[0]?.revenue > 0 
      ? ((currentMonthRevenue[0]?.revenue - previousMonthRevenue[0]?.revenue) / previousMonthRevenue[0]?.revenue) * 100
      : 0;

    return {
      totalRevenue: revenueData[0]?.totalRevenue || 0,
      totalOrders: revenueData[0]?.totalOrders || 0,
      averageOrderValue: revenueData[0]?.averageOrderValue || 0,
      topProducts: topProducts.filter(p => p.id && p.name).map(p => ({
        id: p.id!,
        name: p.name!,
        totalSold: p.totalSold,
        revenue: p.revenue
      })),
      customerTrends: customerTrends,
      monthlyRevenue: monthlyRevenue,
      revenueGrowth: revenueGrowth,
      topCustomers: customerTrends.slice(0, 10).map(c => ({
        id: c.customerId,
        name: c.customerName,
        totalSpent: c.totalSpent,
        orderCount: c.totalOrders
      }))
    };
  }

  static async getCustomerPurchaseHistory(customerId: string): Promise<CustomerPurchaseHistory> {
    // Get customer's total purchase statistics
    const customerStats = await db
      .select({
        totalPurchases: sql<number>`COUNT(*)`,
        totalSpent: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        averageOrderValue: sql<number>`COALESCE(AVG(${orders.total}), 0)`,
        lastPurchaseDate: sql<string>`MAX(${orders.createdAt})`
      })
      .from(orders)
      .where(eq(orders.userId, customerId));

    // Get customer's favorite products
    const favoriteProducts = await db
      .select({
        productId: products.id,
        productName: products.name,
        timesPurchased: sql<number>`COUNT(*)`,
        totalSpent: sql<number>`COALESCE(SUM(${orderItems.quantity} * ${orderItems.price}), 0)`
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.userId, customerId))
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    // Calculate purchase frequency
    const firstOrder = await db
      .select({
        firstOrderDate: sql<string>`MIN(${orders.createdAt})`
      })
      .from(orders)
      .where(eq(orders.userId, customerId));

    const daysSinceFirstOrder = firstOrder[0]?.firstOrderDate 
      ? Math.ceil((Date.now() - new Date(firstOrder[0].firstOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const purchaseFrequency = daysSinceFirstOrder > 0 && customerStats[0]?.totalPurchases > 0
      ? `${Math.round(daysSinceFirstOrder / customerStats[0].totalPurchases)} days between orders`
      : 'Insufficient data';

    // Generate product recommendations based on purchase history
    const recommendedProducts = await this.generateRecommendations(customerId, favoriteProducts);

    return {
      customerId,
      totalPurchases: customerStats[0]?.totalPurchases || 0,
      totalSpent: customerStats[0]?.totalSpent || 0,
      averageOrderValue: customerStats[0]?.averageOrderValue || 0,
      favoriteProducts: favoriteProducts.filter(p => p.productId && p.productName).map(p => ({
        productId: p.productId!,
        productName: p.productName!,
        timesPurchased: p.timesPurchased,
        totalSpent: p.totalSpent
      })),
      purchaseFrequency,
      lastPurchaseDate: customerStats[0]?.lastPurchaseDate || '',
      recommendedProducts
    };
  }

  private static async generateRecommendations(customerId: string, favoriteProducts: any[]): Promise<Array<{id: number, name: string, reason: string}>> {
    if (favoriteProducts.length === 0) {
      // For new customers, recommend popular products
      const popularProducts = await db
        .select({
          id: products.id,
          name: products.name,
          totalSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`
        })
        .from(products)
        .leftJoin(orderItems, eq(products.id, orderItems.productId))
        .groupBy(products.id, products.name)
        .orderBy(desc(sql`COALESCE(SUM(${orderItems.quantity}), 0)`))
        .limit(5);

      return popularProducts.map(product => ({
        id: product.id,
        name: product.name,
        reason: 'Popular with other customers'
      }));
    }

    // Get simple product recommendations based on popularity
    const categoryBasedRecommendations = await db
      .select({
        id: products.id,
        name: products.name,
        categoryId: products.categoryId
      })
      .from(products)
      .limit(5);

    return categoryBasedRecommendations
      .filter(product => !favoriteProducts.some(fav => fav.productId === product.id))
      .map(product => ({
        id: product.id,
        name: product.name,
        reason: 'Similar to your previous purchases'
      }));
  }

  // Method to get trending products based on sales
  static async getTrendingProducts(startDate?: Date, endDate?: Date): Promise<TrendingProduct[]> {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Last 1 month
    const defaultEnd = now;

    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const trendingProducts = await db
      .select({
        id: products.id,
        name: products.name,
        totalSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        revenue: sql<number>`COALESCE(SUM(${orderItems.quantity} * ${orderItems.price}), 0)`
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        gte(orders.createdAt, start),
        lte(orders.createdAt, end)
      ))
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(10);

    return trendingProducts.filter(p => p.id && p.name).map(p => ({
      id: p.id!,
      name: p.name!,
      totalSold: p.totalSold,
      revenue: p.revenue
    }));
  }
}
// Typescript code implementing analytics engine with trending products feature.