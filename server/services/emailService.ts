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
        // Disable click tracking to prevent link corruption
        mailSettings.clickTracking = { enable: false, enableText: false };
        mailSettings.openTracking = { enable: false };
        // Additional settings to prevent URL wrapping
        mailSettings.ganalytics = { enable: false };
        mailSettings.subscriptionTracking = { enable: false };
      }

      console.log("[EMAIL] Attempting to send email:", {
        to: to.replace(/(.{2}).*(@.*)/, '$1***$2'),
        from: "info@shopgokul.com",
        subject,
        disableTracking
      });

      const result = await sgMail.send({
        to,
        from: { email: "info@shopgokul.com", name: "Gokul Wholesale Inc." },
        subject,
        html,
        text,
        mailSettings,
      });

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