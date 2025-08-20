// Unified, typed SMS service with legacy shim (sendSms)

import Twilio from 'twilio';

type SmsPayload = {
  to: string;
  message: string;
  from?: string; // optional override
};

const REQUIRED_ENV = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'] as const;

function assertEnv() {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      throw new Error(`[smsService] Missing env ${key}`);
    }
  }
}

let client: Twilio.Twilio | null = null;
function initIfNeeded() {
  if (client) return;
  assertEnv();
  client = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

export const smsService = {
  /**
   * Primary typed send method
   */
  async send(payload: SmsPayload): Promise<void> {
    initIfNeeded();
    
    // Use the correct phone number from environment
    const fromNumber = payload.from ?? process.env.TWILIO_FROM_NUMBER ?? process.env.TWILIO_PHONE_NUMBER;
    
    if (!fromNumber) {
      console.error('[smsService] No valid Twilio phone number configured');
      throw new Error('SMS service not properly configured');
    }
    
    try {
      await client!.messages.create({
        to: payload.to,
        from: fromNumber,
        body: payload.message,
      });
      console.log(`[smsService] SMS sent → ${payload.to.slice(-4)} | ${payload.message.slice(0, 50)}...`);
    } catch (err: any) {
      console.error('[smsService] Send failed', { message: err?.message, code: err?.code, from: fromNumber });
      throw new Error('Failed to send SMS');
    }
  },

  /**
   * Legacy shim
   */
  async sendSms(to: string, message: string) {
    return this.send({ to, message });
  },
};