const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const emailService = {
  /**
   * Send an email verification link.
   * @param {string} toEmail 
   * @param {string} name 
   * @param {string} token 
   */
  async sendVerificationEmail(toEmail, name, token) {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[Email Mock] Verification email for ${toEmail}. Link: ${appUrl}/verify-email?token=${token}`);
      return;
    }

    try {
      await resend.emails.send({
        from: `Ozofi Books Pro <${fromEmail}>`,
        to: toEmail,
        subject: 'Verify your Ozofi Books account',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome to Ozofi Books, ${name}!</h2>
            <p>Please verify your email address to get started.</p>
            <div style="margin: 30px 0;">
              <a href="${appUrl}/verify-email?token=${token}" 
                 style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }
  },

  /**
   * Send a welcome email after verification or plan change.
   * @param {string} toEmail 
   * @param {string} name 
   * @param {string} planName 
   */
  async sendWelcomeEmail(toEmail, name, planName = 'Free') {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[Email Mock] Welcome email for ${toEmail}.`);
      return;
    }

    try {
      await resend.emails.send({
        from: `Ozofi Books Pro <${fromEmail}>`,
        to: toEmail,
        subject: 'Welcome to Ozofi Books Pro!',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome aboard, ${name}!</h2>
            <p>Your account is fully set up on the <strong>${planName}</strong> plan.</p>
            <p>You can now start managing your invoices, inventory, and customers.</p>
            <div style="margin: 30px 0;">
              <a href="${appUrl}/dashboard" 
                 style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Go to Dashboard
              </a>
            </div>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }
};

module.exports = emailService;
