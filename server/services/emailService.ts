import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export class EmailService {
  async send({ to, subject, html, text, disableTracking = false }: { 
    to: string; 
    subject: string; 
    html: string; 
    text?: string; 
    disableTracking?: boolean;
  }): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: { email: 'info@shopgokul.com', name: 'Gokul Wholesale Inc.' },
        subject,
        html,
        text,
        trackingSettings: {
          clickTracking: { enable: false, enableText: false }
        },
      });
    } catch (error) {
      console.error("Email send failed:", error);
      throw error;
    }
  }
}

const emailService = new EmailService();
export { emailService };