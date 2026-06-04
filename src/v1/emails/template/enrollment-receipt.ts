import {
  INSTITUTION_COURSES_URL,
  INSTITUTION_NAME,
  INSTITUTION_SUPPORT_EMAIL,
} from '../../../utils/config.js';

export const enrollementReceiptTemplate = (
  name: string,
  enrollmentDetails: {
    planName: string;
    planSlug: string;
    price: number;
    earlyBirdDiscountAmount: number;
    promoDiscountAmount: number;
    purchasedAmount: number;
    isEarlyBirdApplied: boolean;
    isPromoApplied: boolean;
    expiresAt: Date;
    classes: { name: string }[];
  },
) => {
  const subject = `Enrollment Confirmed — ${enrollmentDetails.planName}`;

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const formatPrice = (amount: number) =>
    `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const discountRows = [
    enrollmentDetails.isEarlyBirdApplied
      ? `
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6b7280;">Early bird discount</td>
          <td style="padding:8px 0;font-size:13px;color:#059669;text-align:right;">− ${formatPrice(enrollmentDetails.earlyBirdDiscountAmount)}</td>
        </tr>`
      : '',
    enrollmentDetails.isPromoApplied
      ? `
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6b7280;">
            Promo code
          </td>
          <td style="padding:8px 0;font-size:13px;color:#059669;text-align:right;">− ${formatPrice(enrollmentDetails.promoDiscountAmount)}</td>
        </tr>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const classRows = enrollmentDetails.classes
    .map(
      (c) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:6px;height:6px;background-color:#111827;border-radius:50%;vertical-align:middle;"></td>
              <td style="padding-left:10px;font-size:13px;color:#374151;vertical-align:middle;">${c.name}</td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join('');

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Enrollment Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#111827;letter-spacing:-0.5px;">${INSTITUTION_NAME}</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Your learning journey starts here</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

              <!-- Hero band -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#111827;padding:40px 48px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">Enrollment confirmed</p>
                    <h2 style="margin:0 0 6px;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">${enrollmentDetails.planName}</h2>
                    <p style="margin:0;font-size:14px;color:#9ca3af;">Hi ${name}, you're all set!</p>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:40px 48px 0;">
                    <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                      Your enrollment has been confirmed. You now have access to the classes included in this plan until <strong>${formatDate(enrollmentDetails.expiresAt)}</strong>.
                    </p>

                    <!-- Included classes -->
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">Included classes</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #f3f4f6;border-radius:10px;overflow:hidden;">
                      <tr><td style="padding:0 16px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          ${classRows}
                        </table>
                      </td></tr>
                    </table>

                    <!-- Payment summary -->
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">Payment summary</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #f3f4f6;border-radius:10px;overflow:hidden;">
                      <tr><td style="padding:4px 16px;">
                        <table width="100%" cellpadding="0" cellspacing="0">

                          <tr>
                            <td style="padding:8px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Full price</td>
                            <td style="padding:8px 0;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #f3f4f6;">${formatPrice(enrollmentDetails.price)}</td>
                          </tr>

                          ${discountRows}

                          <tr>
                            <td style="padding:12px 0 8px;font-size:14px;font-weight:700;color:#111827;border-top:1px solid #e5e7eb;">Total paid</td>
                            <td style="padding:12px 0 8px;font-size:18px;font-weight:700;color:#111827;text-align:right;border-top:1px solid #e5e7eb;">${formatPrice(enrollmentDetails.purchasedAmount)}</td>
                          </tr>

                        </table>
                      </td></tr>
                    </table>

                    <!-- CTA -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
                      <tr>
                        <td style="background-color:#111827;border-radius:10px;">
                          <a href="${INSTITUTION_COURSES_URL}"
                             style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                            Go to My Classes →
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 48px;">
                    <div style="height:1px;background-color:#f3f4f6;"></div>
                  </td>
                </tr>
              </table>

              <!-- Footer note -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:24px 48px 40px;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                      If you have any questions about your enrollment, contact us at
                      <a href="mailto:${INSTITUTION_SUPPORT_EMAIL}" style="color:#6b7280;">${INSTITUTION_SUPPORT_EMAIL}</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 0 8px;">
              <p style="margin:0;font-size:12px;color:#52565c;">
                © ${new Date().getFullYear()} ${INSTITUTION_NAME}. All rights reserved.
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#52565c;">Powered by Deamoz.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, htmlBody };
};
