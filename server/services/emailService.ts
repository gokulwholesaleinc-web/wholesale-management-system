import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const emailService = {
  async send({ to, subject, html, text, disableTracking = false }: { 
    to: string; 
    subject: string; 
    html: string; 
    text: string; 
    disableTracking?: boolean;
  }) {
    try {
      const mailSettings: any = {};
      
      if (disableTracking) {
        // Disable click tracking to prevent link corruption
        mailSettings.clickTracking = { enable: false };
        mailSettings.openTracking = { enable: false };
      }

      await sgMail.send({
        to,
        from: { email: "info@shopgokul.com", name: "Gokul Wholesale Inc." },
        subject,
        html,
        text,
        mailSettings,
      });
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  },
};