import twilio from "twilio";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  console.error("SMS service missing Twilio credentials");
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export class SMSService {
  async send({ to, body }: { to: string; body: string }): Promise<void> {
    try {
      await client.messages.create({ to, from: TWILIO_PHONE_NUMBER, body });
    } catch (error) {
      console.error("SMS send failed:", error);
      throw error;
    }
  }
}

const smsService = new SMSService();
export { smsService };