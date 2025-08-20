import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const emailService = {
  async send({ to, subject, html, text, disableTracking = false }: { 
    to: string; 
    subject: string; 
    html: string; 
    text: string; 
    disableTracking?: boolean;
  }): Promise<void> {
    try {
      const mailSettings: any = {};
      
      if (disableTracking) {
        // Comprehensive tracking prevention per SendGrid docs
        mailSettings.clickTracking = { enable: false, enableText: false };
        mailSettings.openTracking = { enable: false };
        mailSettings.subscriptionTracking = { enable: false };
        mailSettings.ganalytics = { enable: false };
      }

      console.log("[EMAIL] Attempting to send email:", {
        to: to.replace(/(.{2}).*(@.*)/, '$1***$2'),
        from: "info@shopgokul.com",
        subject,
        disableTracking
      });

      const emailConfig: any = {
        to,
        from: { email: "info@shopgokul.com", name: "Gokul Wholesale Inc." },
        subject,
        html,
        text,
      };

      // Only add mailSettings if tracking is disabled
      if (disableTracking && Object.keys(mailSettings).length > 0) {
        emailConfig.mailSettings = mailSettings;
      }

      const result = await sgMail.send(emailConfig);

      console.log("[EMAIL] SendGrid response:", {
        messageId: result[0]?.headers?.['x-message-id'],
        statusCode: result[0]?.statusCode
      });
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  },
};