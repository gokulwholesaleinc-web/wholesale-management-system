# Call to Action (CTA) Verification Documentation for Twilio Campaign Approval

## Campaign Information
- **Business Name**: Gokul Wholesale
- **Website**: https://shopgokul.com
- **Privacy Policy**: https://shopgokul.com/privacy-policy
- **Campaign Type**: Business-to-Business (B2B) Wholesale Communications

## Call to Action Methods

### 1. Website Opt-in (Primary Method)
**Location**: User Account Dashboard and Notification Settings
**URL**: https://shopgokul.com/account (after login)

**Consent Flow**:
1. User logs into their wholesale account
2. Navigates to account settings or notification preferences
3. Sees SMS consent modal with clear language:
   - "Would you like to receive SMS notifications from Gokul Wholesale?"
   - Separate checkboxes for:
     * ✅ Transactional SMS (order updates, delivery notifications)
     * ✅ Marketing SMS (special offers, new product alerts)
   - Link to Privacy Policy with SMS-specific terms
4. User explicitly checks desired options and clicks "Save Preferences"
5. System records consent with timestamp, IP address, and method

**Consent Language Used**:
"By providing your mobile phone number and checking this box, you consent to receive text messages from Gokul Wholesale at the number provided. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time. View our Privacy Policy at https://shopgokul.com/privacy-policy"

### 2. Account Registration Opt-in (Secondary Method)
**Location**: New Customer Account Request Form
**URL**: https://shopgokul.com/create-account

**Consent Flow**:
1. Business customer fills out account request form
2. Optional SMS consent checkbox with clear disclosure
3. If checked, user provides mobile number
4. Admin approval process includes consent verification
5. First SMS includes welcome message with opt-out instructions

### 3. In-Person/Phone Consent (Tertiary Method)
**Process**:
- Staff verbally explains SMS program during account setup calls
- Customer verbally confirms consent
- Staff records consent in system with method "phone_call" 
- Follow-up SMS sent with confirmation and opt-out instructions

## Opt-out Mechanisms

### Automated STOP Handling
- Users can reply "STOP" to any SMS
- System automatically processes opt-out
- Confirmation message sent: "You have been unsubscribed from Gokul Wholesale SMS. Reply START to re-subscribe."

### Web-based Opt-out
- Account settings page includes "Opt out of SMS" option
- Privacy policy includes opt-out instructions
- Contact information provided: 630-540-9910, info@shopgokul.com

### Phone-based Opt-out
- Users can call 630-540-9910 to opt out
- Staff manually updates system records

## Message Types and Frequency

### Transactional Messages (With Consent)
- Order confirmations (1 per order)
- Delivery notifications (1-2 per order)
- Account alerts (as needed)
- Payment reminders (1-3 per invoice)

### Marketing Messages (Requires Separate Consent)
- Weekly promotional offers (max 1 per week)
- New product announcements (1-2 per month)
- Special sales alerts (max 4 per month)

## Technical Implementation

### Consent Tracking Database Fields
- `sms_consent_given`: Boolean flag
- `sms_consent_date`: Timestamp of consent
- `sms_consent_method`: web_form, phone_call, in_person
- `sms_consent_ip_address`: IP address when consent given
- `transactional_sms_consent`: Separate boolean for transactional
- `marketing_sms_consent`: Separate boolean for marketing
- `privacy_policy_accepted`: Privacy policy acceptance

### Consent Verification Process
1. Before sending any SMS, system checks user consent status
2. Transactional messages require `transactional_sms_consent = true`
3. Marketing messages require `marketing_sms_consent = true`
4. All messages include business identification and opt-out instructions

## Documentation URLs for Twilio Review

1. **Privacy Policy**: https://shopgokul.com/privacy-policy
   - Contains SMS-specific compliance language
   - Details message types and frequency
   - Clear opt-out instructions
   - Third-party sharing restrictions

2. **Account Settings Demo**: https://shopgokul.com/login
   - Demo credentials can be provided for review
   - Shows actual consent collection interface
   - Demonstrates opt-out functionality

3. **Public Catalog**: https://shopgokul.com/catalog
   - Shows business legitimacy
   - Public-facing business information

## Compliance Certifications

- ✅ TCPA Compliant opt-in process
- ✅ Clear and conspicuous consent language
- ✅ Separate consent for marketing vs transactional
- ✅ Multiple opt-out methods (STOP, web, phone)
- ✅ Consent record keeping with timestamps and IP
- ✅ Privacy policy with SMS-specific terms
- ✅ Business identification in all messages

## Sample Message Templates

### Order Confirmation (Transactional)
"Thank you [Name]! Your order #[ORDER] ($[TOTAL]) has been confirmed. Delivery expected [DATE]. Reply STOP to opt out. - Gokul Wholesale"

### Marketing Offer (Marketing Consent Required)
"[Name], special 15% off electronics this week! Use code SAVE15 at checkout. Shop: shopgokul.com Reply STOP to opt out. - Gokul Wholesale"

## Contact Information for Verification
- **Phone**: 630-540-9910
- **Email**: info@shopgokul.com
- **Address**: 1141 W Bryn Mawr Ave, Itasca, IL 60143
- **Business Hours**: Monday-Saturday 9AM-7PM CST

This documentation provides complete CTA verification details showing how customers can consent to SMS communications through multiple verifiable methods with proper opt-out mechanisms and compliance tracking.