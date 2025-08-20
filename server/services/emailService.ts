import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const emailService = {
  async send({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
    try {
      await sgMail.send({
        to,
        from: { email: "info@shopgokul.com", name: "Gokul Wholesale Inc." },
        subject,
        html,
        text,
      });
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  },
};