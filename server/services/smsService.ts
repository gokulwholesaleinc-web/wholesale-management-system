import twilio from "twilio";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  console.error("SMS service missing Twilio credentials");
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const smsService = {
  async send({ to, body }: { to: string; body: string }) {
    try {
      const message = await client.messages.create({
        from: TWILIO_PHONE_NUMBER,
        to,
        body,
      });
      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error("SMS service error:", error);
      throw error;
    }
  },
};