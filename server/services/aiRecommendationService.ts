import OpenAI from "openai";
import { db } from "../db";
import { aiRecommendations, products, categories } from "@shared/schema";
import { eq, desc, and, gte, inArray } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface SeasonalContext {
  season: string;
  holidays: string[];
  weatherTrends: string[];
  sportingEvents: string[];
  economicTrends: string[];
}

export class AiRecommendationService {
  private async getCurrentContext(): Promise<SeasonalContext> {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();
    
    // Determine season
    let season = "Spring";
    if (month >= 12 || month <= 2) season = "Winter";
    else if (month >= 3 && month <= 5) season = "Spring";
    else if (month >= 6 && month <= 8) season = "Summer";
    else if (month >= 9 && month <= 11) season = "Fall";
    
    // Determine relevant holidays and events
    const holidays: string[] = [];
    const sportingEvents: string[] = [];
    
    // Holiday logic
    if (month === 1) holidays.push("New Year", "Martin Luther King Day");
    if (month === 2) holidays.push("Valentine's Day", "Presidents Day");
    if (month === 3) holidays.push("St. Patrick's Day");
    if (month === 4) holidays.push("Easter");
    if (month === 5) holidays.push("Mother's Day", "Memorial Day");
    if (month === 6) holidays.push("Father's Day");
    if (month === 7) holidays.push("Independence Day");
    if (month === 9) holidays.push("Labor Day");
    if (month === 10) holidays.push("Halloween");
    if (month === 11) holidays.push("Thanksgiving", "Black Friday");
    if (month === 12) holidays.push("Christmas", "New Year's Eve");
    
    // Sporting events logic
    if (month >= 9 && month <= 12) sportingEvents.push("NFL Season", "NBA Season");
    if (month >= 1 && month <= 4) sportingEvents.push("NBA Playoffs", "March Madness");
    if (month >= 4 && month <= 10) sportingEvents.push("MLB Season");
    if (month >= 6 && month <= 8) sportingEvents.push("Summer Olympics (every 4 years)");
    
    return {
      season,
      holidays,
      weatherTrends: season === "Winter" ? ["Cold weather", "Hot beverages"] :
                    season === "Summer" ? ["Hot weather", "Cold beverages", "Outdoor activities"] :
                    season === "Spring" ? ["Mild weather", "Spring cleaning"] :
                    ["Cool weather", "Back to school", "Holiday preparation"],
      sportingEvents,
      economicTrends: ["Inflation awareness", "Bulk purchasing", "Cost savings"]
    };
  }

  private async getAvailableProducts() {
    return await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        stock: products.stock,
        categoryId: products.categoryId,
        categoryName: categories.name,
        archived: products.archived
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(
        eq(products.archived, false),
        gte(products.stock, 1)
      ));
  }

  private async generateRecommendationsWithAI(context: SeasonalContext, availableProducts: any[]): Promise<{ recommendations: any[], generationTimeMs: number, contextData: SeasonalContext }> {
    const startTime = Date.now();
    
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI recommendation system for Gokul Wholesale, a B2B wholesale business. 
            
            Analyze the current context and recommend products that would be most relevant for wholesale customers.
            
            Current context:
            - Season: ${context.season}
            - Holidays: ${context.holidays.join(", ")}
            - Weather trends: ${context.weatherTrends.join(", ")}
            - Sporting events: ${context.sportingEvents.join(", ")}
            - Economic trends: ${context.economicTrends.join(", ")}
            
            Based on this context, analyze the provided product catalog and recommend the 10 most relevant products.
            Consider:
            1. Seasonal demand (e.g., energy drinks in summer, warm beverages in winter)
            2. Holiday-related products (e.g., tobacco products before holidays)
            3. Economic trends (value-focused products during inflation)
            4. Sporting event tie-ins (snacks and beverages during sports seasons)
            5. Business customer needs (bulk purchase appeal)
            
            Respond with JSON in this exact format:
            {
              "recommendations": [
                {
                  "productId": number,
                  "recommendationReason": "Brief reason (max 30 chars)",
                  "confidenceScore": number (0-100),
                  "seasonalRelevance": number (0-100)
                }
              ]
            }`
          },
          {
            role: "user",
            content: `Analyze these products and recommend the top 10:
            
            ${JSON.stringify(availableProducts.slice(0, 100), null, 2)}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000
      });

      const generationTime = Date.now() - startTime;
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        recommendations: result.recommendations || [],
        generationTimeMs: generationTime,
        contextData: context
      };
      
    } catch (error) {
      console.error("OpenAI API Error:", error);
      // Fallback to rule-based recommendations
      return this.generateFallbackRecommendations(context, availableProducts);
    }
  }

  private generateFallbackRecommendations(context: SeasonalContext, availableProducts: any[]): { recommendations: any[], generationTimeMs: number, contextData: SeasonalContext } {
    // Simple rule-based fallback
    const recommendations = availableProducts
      .filter(p => p.stock > 10) // Only well-stocked items
      .sort((a, b) => b.price - a.price) // Prefer higher-value items
      .slice(0, 10)
      .map(product => ({
        productId: product.id,
        recommendationReason: "Popular Item",
        confidenceScore: 75,
        seasonalRelevance: 50
      }));

    return {
      recommendations,
      generationTimeMs: 100,
      contextData: context
    };
  }

  async shouldRefreshRecommendations(): Promise<boolean> {
    const latestRecommendation = await db
      .select()
      .from(aiRecommendations)
      .where(eq(aiRecommendations.isActive, true))
      .orderBy(desc(aiRecommendations.generatedAt))
      .limit(1);

    if (latestRecommendation.length === 0) {
      return true; // No recommendations exist
    }

    const latest = latestRecommendation[0];
    const now = new Date();
    
    return now > latest.validUntil;
  }

  async generateNewRecommendations(): Promise<any> {
    console.log("Generating new AI recommendations...");
    
    // Get current context and available products
    const [context, availableProducts] = await Promise.all([
      this.getCurrentContext(),
      this.getAvailableProducts()
    ]);

    if (availableProducts.length === 0) {
      throw new Error("No products available for recommendations");
    }

    // Generate recommendations with AI
    const aiResult = await this.generateRecommendationsWithAI(context, availableProducts);
    
    // Get current cycle number
    const lastCycle = await db
      .select({ refreshCycle: aiRecommendations.refreshCycle })
      .from(aiRecommendations)
      .orderBy(desc(aiRecommendations.refreshCycle))
      .limit(1);
    
    const newCycle = (lastCycle[0]?.refreshCycle || 0) + 1;
    
    // Deactivate previous recommendations
    await db
      .update(aiRecommendations)
      .set({ isActive: false })
      .where(eq(aiRecommendations.isActive, true));
    
    // Create new recommendation record
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 3); // 3 days from now
    
    const [newRecommendation] = await db
      .insert(aiRecommendations)
      .values({
        refreshCycle: newCycle,
        validUntil,
        contextData: aiResult.contextData as any,
        recommendations: aiResult.recommendations as any,
        totalProducts: aiResult.recommendations.length,
        generationTimeMs: aiResult.generationTimeMs,
        aiModel: "gpt-4o"
      })
      .returning();

    console.log(`Generated ${aiResult.recommendations.length} recommendations for cycle ${newCycle}`);
    return newRecommendation;
  }

  async getCurrentRecommendations(): Promise<any[]> {
    // Check if refresh is needed
    if (await this.shouldRefreshRecommendations()) {
      await this.generateNewRecommendations();
    }

    // Get current active recommendations
    const current = await db
      .select()
      .from(aiRecommendations)
      .where(eq(aiRecommendations.isActive, true))
      .orderBy(desc(aiRecommendations.generatedAt))
      .limit(1);

    if (current.length === 0) {
      return [];
    }

    const recommendationData = current[0].recommendations as any[];
    const productIds = recommendationData.map(r => r.productId);
    
    // Get full product data for recommended products
    const productDetails = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        stock: products.stock,
        imageUrl: products.imageUrl,
        categoryId: products.categoryId
      })
      .from(products)
      .where(and(
        eq(products.archived, false),
        gte(products.stock, 1),
        inArray(products.id, productIds)
      ));

    // Combine recommendation data with product details
    const recommendations = recommendationData
      .map(rec => {
        const product = productDetails.find(p => p.id === rec.productId);
        if (!product) return null;
        
        return {
          ...product,
          recommendationReason: rec.recommendationReason,
          confidenceScore: rec.confidenceScore,
          seasonalRelevance: rec.seasonalRelevance
        };
      })
      .filter(Boolean);

    return recommendations;
  }
}

export const aiRecommendationService = new AiRecommendationService();