import OpenAI from 'openai';
import { storage } from '../storage';
import { emailService } from './emailService';

interface EmailGenerationPrompt {
  type: 'promotional' | 'announcement' | 'seasonal' | 'custom';
  tone: 'professional' | 'friendly' | 'urgent' | 'casual';
  purpose: string;
  targetAudience: string;
  keyPoints?: string[];
  callToAction?: string;
  companyName?: string;
  language?: string;
}

interface GeneratedEmail {
  subject: string;
  content: string;
  htmlContent: string;
}

export class EmailCampaignService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private getLanguageName(code: string): string {
    const languages: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'hi': 'Hindi',
      'gu': 'Gujarati'
    };
    return languages[code] || 'English';
  }

  async generateEmailContent(prompt: EmailGenerationPrompt): Promise<GeneratedEmail> {
    try {
      const systemPrompt = `You are an expert email marketing copywriter specializing in wholesale/B2B communications. Create engaging, professional email content that drives action while maintaining trust and relationship focus.

Company Context: Gokul Wholesale Inc. - A wholesale distribution company serving businesses with quality products and personalized service.

IMPORTANT: Always include this exact business signature and footer in all emails:

For plain text content, end with:
Best Regards,
Gokul Wholesale Inc.
info@shopgokul.com
(416) 123-4567
Visit our website: www.shopgokul.com

For HTML content, include this footer:
<div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-top: 2px solid #e9ecef;">
  <p style="margin: 0; color: #6c757d; font-size: 14px;">
    Best Regards,<br>
    <strong>Gokul Wholesale Inc.</strong><br>
    <a href="mailto:info@shopgokul.com" style="color: #007bff;">info@shopgokul.com</a><br>
    (416) 123-4567<br>
    <a href="https://www.shopgokul.com" style="color: #007bff;">Visit our website</a>
  </p>
  <hr style="margin: 15px 0; border: none; border-top: 1px solid #dee2e6;">
  <p style="margin: 0; color: #6c757d; font-size: 12px; text-align: center;">
    © 2025 Gokul Wholesale Inc. | All rights reserved.
  </p>
</div>

Requirements:
- Generate both plain text and HTML versions in English
- Include compelling subject line
- Maintain professional yet approachable tone
- Focus on value proposition for wholesale customers
- Include clear call-to-action
- Keep content concise but informative
- Use wholesale/B2B appropriate language
- ALWAYS include the complete business signature and footer as specified above
- Content will be automatically translated to recipient's preferred language during delivery

Response format: JSON with "subject", "content" (plain text), and "htmlContent" (HTML) fields.`;

      const userPrompt = `Create an email with these specifications:
Type: ${prompt.type}
Tone: ${prompt.tone}
Purpose: ${prompt.purpose}
Target Audience: ${prompt.targetAudience}
${prompt.keyPoints ? `Key Points: ${prompt.keyPoints.join(', ')}` : ''}
${prompt.callToAction ? `Call to Action: ${prompt.callToAction}` : ''}
Company: ${prompt.companyName || 'Gokul Wholesale Inc.'}
Language: English (will be translated automatically for each recipient)`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        subject: result.subject || 'Important Update from Gokul Wholesale',
        content: result.content || '',
        htmlContent: result.htmlContent || result.content || ''
      };

    } catch (error) {
      console.error('Error generating email content:', error);
      throw new Error('Failed to generate email content');
    }
  }

  async sendCampaign(campaignId: number): Promise<{ success: boolean; message: string; results?: any }> {
    try {
      console.log(`📨 EmailCampaignService: Starting sendCampaign for ID ${campaignId}`);
      
      // Get campaign details
      console.log('📋 Fetching campaign details...');
      const campaign = await storage.getEmailCampaignById(campaignId);
      if (!campaign) {
        console.error(`❌ Campaign ${campaignId} not found`);
        return { success: false, message: 'Campaign not found' };
      }
      console.log(`✅ Campaign found: "${campaign.name}" (status: ${campaign.status})`);

      if (campaign.status !== 'draft') {
        console.error(`❌ Campaign status is ${campaign.status}, not draft`);
        return { success: false, message: 'Campaign is not in draft status' };
      }

      // Get recipients
      console.log('👥 Fetching campaign recipients...');
      const recipients = await storage.getCampaignRecipients(campaignId);
      if (recipients.length === 0) {
        console.error('❌ No recipients found for campaign');
        return { success: false, message: 'No recipients found for campaign' };
      }
      console.log(`✅ Found ${recipients.length} recipients`);

      // Start campaign
      console.log('🚀 Starting campaign (updating status to sending)...');
      await storage.startEmailCampaign(campaignId);

      let sentCount = 0;
      let failedCount = 0;
      const results = [];

      // Send emails to recipients
      for (const recipient of recipients) {
        try {
          const emailResult = await emailService.sendEmailWithTemplate(
            recipient.email,
            campaign.subject,
            campaign.content,
            campaign.htmlContent || campaign.content,
            {
              customerName: `${recipient.user?.firstName || ''} ${recipient.user?.lastName || ''}`.trim() || 'Valued Customer',
              companyName: recipient.user?.company || '',
              language: recipient.user?.preferredLanguage || 'en'
            }
          );

          if (emailResult.success) {
            await storage.updateCampaignRecipientStatus(
              recipient.id,
              'sent',
              new Date()
            );
            sentCount++;
            results.push({ email: recipient.email, status: 'sent' });
          } else {
            await storage.updateCampaignRecipientStatus(
              recipient.id,
              'failed',
              undefined,
              emailResult.error || 'Unknown error'
            );
            failedCount++;
            results.push({ email: recipient.email, status: 'failed', error: emailResult.error });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await storage.updateCampaignRecipientStatus(
            recipient.id,
            'failed',
            undefined,
            errorMessage
          );
          failedCount++;
          results.push({ email: recipient.email, status: 'failed', error: errorMessage });
        }

        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update campaign final status
      const finalUpdates: any = {
        status: sentCount > 0 ? 'sent' : 'failed',
        sentCount,
        failedCount
      };
      
      // Only add sentAt if campaign was successfully sent
      if (sentCount > 0) {
        finalUpdates.sentAt = new Date();
      }

      await storage.updateEmailCampaign(campaignId, finalUpdates);

      return {
        success: true,
        message: `Campaign sent successfully. ${sentCount} sent, ${failedCount} failed.`,
        results: {
          total: recipients.length,
          sent: sentCount,
          failed: failedCount,
          details: results
        }
      };

    } catch (error) {
      console.error('Error sending email campaign:', error);
      
      // Update campaign status to failed
      try {
        await storage.updateEmailCampaign(campaignId, {
          status: 'failed'
        });
      } catch (updateError) {
        console.error('Failed to update campaign status to failed:', updateError);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: `Failed to send campaign: ${errorMessage}`
      };
    }
  }

  async previewEmail(prompt: EmailGenerationPrompt): Promise<GeneratedEmail> {
    return this.generateEmailContent(prompt);
  }

  async getCampaignAnalytics(campaignId: number): Promise<any> {
    try {
      const campaign = await storage.getEmailCampaignById(campaignId);
      const recipients = await storage.getCampaignRecipients(campaignId);

      if (!campaign) {
        return null;
      }

      const analytics = {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          status: campaign.status,
          createdAt: campaign.createdAt,
          sentAt: campaign.sentAt
        },
        metrics: {
          totalRecipients: recipients.length,
          sent: recipients.filter(r => r.status === 'sent').length,
          failed: recipients.filter(r => r.status === 'failed').length,
          pending: recipients.filter(r => r.status === 'pending').length
        },
        recipients: recipients.map(r => ({
          email: r.email,
          customerName: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim(),
          company: r.user?.company,
          status: r.status,
          sentAt: r.sentAt,
          failureReason: r.failureReason
        }))
      };

      return analytics;
    } catch (error) {
      console.error('Error getting campaign analytics:', error);
      return null;
    }
  }
}

export const emailCampaignService = new EmailCampaignService();