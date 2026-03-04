const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const FROM_NAME = process.env.MAIL_FROM_NAME || 'MatchFlow';
const FROM_EMAIL = process.env.SMTP_USER || 'noreply@matchflow.com';

/**
 * Send company approval email
 */
async function sendApprovalEmail(company) {
  const transporter = createTransporter();

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
        <p style="color: #d1fae5; margin: 8px 0 0; font-size: 16px;">Your company has been approved</p>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
          Hi <strong>${company.companyName || company.name}</strong>,
        </p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
          Great news! Your company account on <strong>${FROM_NAME}</strong> has been reviewed and <span style="color: #10b981; font-weight: 600;">approved</span> by our admin team.
        </p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
          You now have full access to the platform and can:
        </p>
        <ul style="font-size: 14px; color: #4b5563; line-height: 2; padding-left: 20px;">
          <li>✅ Browse and apply to projects</li>
          <li>✅ Submit quotations and proposals</li>
          <li>✅ Receive contracts and work on milestones</li>
          <li>✅ Upload deliverables and manage your workspace</li>
        </ul>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard"
             style="display: inline-block; background: #10b981; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Go to Dashboard →
          </a>
        </div>
        <p style="font-size: 13px; color: #9ca3af; text-align: center;">
          If you have any questions, contact our support team.
        </p>
      </div>
      <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          © ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: company.email,
    subject: `✅ Your company "${company.companyName || company.name}" has been approved!`,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Approval email sent to ${company.email} (messageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send approval email to ${company.email}:`, err.message);
    // Don't throw — email failure shouldn't block the approval
    return null;
  }
}

/**
 * Send company rejection email
 */
async function sendRejectionEmail(company, reason) {
  const transporter = createTransporter();

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Verification Update</h1>
        <p style="color: #fee2e2; margin: 8px 0 0; font-size: 16px;">Action required for your account</p>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
          Hi <strong>${company.companyName || company.name}</strong>,
        </p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
          We've reviewed your company verification request on <strong>${FROM_NAME}</strong>. Unfortunately, we were unable to approve your account at this time.
        </p>
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 6px 6px 0; margin: 20px 0;">
          <p style="font-size: 14px; color: #991b1b; margin: 0; font-weight: 600;">Reason:</p>
          <p style="font-size: 14px; color: #7f1d1d; margin: 6px 0 0;">${reason || 'Your application did not meet our verification requirements.'}</p>
        </div>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
          You can update your company profile and reapply. Make sure to:
        </p>
        <ul style="font-size: 14px; color: #4b5563; line-height: 2; padding-left: 20px;">
          <li>Complete all required company details</li>
          <li>Use a business domain email</li>
          <li>Provide an accurate company description</li>
          <li>Add a valid website URL</li>
        </ul>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile"
             style="display: inline-block; background: #3b82f6; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Update Profile →
          </a>
        </div>
        <p style="font-size: 13px; color: #9ca3af; text-align: center;">
          If you believe this is an error, please contact our support team.
        </p>
      </div>
      <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          © ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: company.email,
    subject: `⚠️ Verification update for "${company.companyName || company.name}"`,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Rejection email sent to ${company.email} (messageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send rejection email to ${company.email}:`, err.message);
    return null;
  }
}

module.exports = { sendApprovalEmail, sendRejectionEmail };
