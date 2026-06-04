import {
  INSTITUTION_NAME,
  INSTITUTION_SUPPORT_EMAIL,
} from '../../../utils/config.js';

export const passwordResetTemplate = (name: string, resetUrl: string) => {
  const subject = `Reset your password - ${INSTITUTION_NAME}`;
  const htmlBody = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Your Password</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    "
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f5; padding: 40px 0"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="max-width: 600px; width: 100%"
          >
            <tr>
              <td align="center" style="padding-bottom: 24px">
                <h1
                  style="
                    margin: 0;
                    font-size: 26px;
                    font-weight: 700;
                    color: #111827;
                    letter-spacing: -0.5px;
                  "
                >
                  ${INSTITUTION_NAME}
                </h1>
              </td>
            </tr>

            <tr>
              <td
                style="
                  background-color: #ffffff;
                  border-radius: 16px;
                  overflow: hidden;
                  border: 1px solid #e5e7eb;
                "
              >
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color: #111827; padding: 40px 48px">
                      <p
                        style="
                          margin: 0 0 8px;
                          font-size: 13px;
                          font-weight: 600;
                          letter-spacing: 0.08em;
                          text-transform: uppercase;
                          color: #9ca3af;
                        "
                      >
                        Security Update
                      </p>
                      <h2
                        style="
                          margin: 0;
                          font-size: 28px;
                          font-weight: 700;
                          color: #ffffff;
                          line-height: 1.3;
                        "
                      >
                        Reset your password
                      </h2>
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 40px 48px">
                      <p
                        style="
                          margin: 0 0 20px;
                          font-size: 15px;
                          color: #374151;
                          line-height: 1.7;
                        "
                      >
                        Hi ${name}, we received a request to reset your password for your ${INSTITUTION_NAME} account. 
                        Click the button below to choose a new one.
                      </p>

                      <table cellpadding="0" cellspacing="0" style="margin: 32px 0">
                        <tr>
                          <td
                            style="
                              background-color: #111827;
                              border-radius: 10px;
                            "
                          >
                            <a
                              href="${resetUrl}"
                              style="
                                display: inline-block;
                                padding: 14px 32px;
                                font-size: 14px;
                                font-weight: 600;
                                color: #ffffff;
                                text-decoration: none;
                                letter-spacing: 0.01em;
                              "
                            >
                              Reset Password →
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p
                        style="
                          margin: 0;
                          font-size: 14px;
                          color: #6b7280;
                          line-height: 1.6;
                        "
                      >
                        <strong>Note:</strong> This link will expire in 30 minutes. If you did not request this, 
                        no further action is required and your account remains secure.
                      </p>
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 0 48px">
                      <div style="height: 1px; background-color: #f3f4f6"></div>
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 24px 48px 40px">
                      <p
                        style="
                          margin: 0;
                          font-size: 12px;
                          color: #9ca3af;
                          line-height: 1.6;
                        "
                      >
                        Having trouble with the button? Copy and paste this URL into your browser:
                        <br />
                        <span style="color: #6b7280; word-break: break-all;">${resetUrl}</span>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding: 28px 0 8px">
                <p style="margin: 0; font-size: 12px; color: #52565c">
                  © ${new Date().getFullYear()} ${INSTITUTION_NAME}. All rights reserved.
                </p>
                <p style="margin: 0; font-size: 12px; color: #52565c">
                  Support: <a href="mailto:${INSTITUTION_SUPPORT_EMAIL}" style="color: #52565c; text-decoration: underline;">${INSTITUTION_SUPPORT_EMAIL}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject,
    htmlBody,
  };
};
