import {
  INSTITUTION_COURSES_URL,
  INSTITUTION_NAME,
  INSTITUTION_SUPPORT_EMAIL,
} from '../../../utils/config.js';

export const welcomeMessageTemplate = (name: string) => {
  const subject = `Welcome to ${INSTITUTION_NAME}!`;
  const htmlBody = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to ${INSTITUTION_NAME}</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #f4f4f5;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
            <!-- Header -->
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
                <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280">
                  Your learning journey starts here
                </p>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td
                style="
                  background-color: #ffffff;
                  border-radius: 16px;
                  overflow: hidden;
                  border: 1px solid #e5e7eb;
                "
              >
                <!-- Hero band -->
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
                        Welcome aboard
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
                        Hi ${name}, welcome to ${INSTITUTION_NAME}!
                      </h2>
                    </td>
                  </tr>
                </table>

                <!-- Body -->
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
                        Your ${INSTITUTION_NAME} account is ready. You
                        now have access to a growing library of courses taught
                        by expert teachers — learn at your own pace, on your
                        schedule.
                      </p>

                      <!-- Steps -->
                      <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        style="margin-bottom: 32px"
                      >
                        <tr>
                          <td
                            style="
                              padding: 14px 0;
                              border-bottom: 1px solid #f3f4f6;
                            "
                          >
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td
                                  style="
                                    width: 36px;
                                    height: 36px;
                                    background-color: #ebebeb;
                                    border-radius: 50%;
                                    text-align: center;
                                    vertical-align: middle;
                                  "
                                >
                                  <span
                                    style="
                                      font-size: 15px;
                                      font-weight: 700;
                                      color: #111827;
                                    "
                                    >1</span
                                  >
                                </td>
                                <td style="padding-left: 14px">
                                  <p
                                    style="
                                      margin: 0;
                                      font-size: 14px;
                                      font-weight: 600;
                                      color: #111827;
                                    "
                                  >
                                    Browse courses
                                  </p>
                                  <p
                                    style="
                                      margin: 2px 0 0;
                                      font-size: 12px;
                                      color: #6b7280;
                                    "
                                  >
                                    Explore all available classes and find what
                                    suits you
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <tr>
                          <td
                            style="
                              padding: 14px 0;
                              border-bottom: 1px solid #f3f4f6;
                            "
                          >
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td
                                  style="
                                    width: 36px;
                                    height: 36px;
                                    background-color: #ebebeb;
                                    border-radius: 50%;
                                    text-align: center;
                                    vertical-align: middle;
                                  "
                                >
                                  <span
                                    style="
                                      font-size: 15px;
                                      font-weight: 700;
                                      color: #111827;
                                    "
                                    >2</span
                                  >
                                </td>
                                <td style="padding-left: 14px">
                                  <p
                                    style="
                                      margin: 0;
                                      font-size: 14px;
                                      font-weight: 600;
                                      color: #111827;
                                    "
                                  >
                                    Choose a plan
                                  </p>
                                  <p
                                    style="
                                      margin: 2px 0 0;
                                      font-size: 12px;
                                      color: #6b7280;
                                    "
                                  >
                                    Pick a pricing plan and upload your payment
                                    receipt
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding: 14px 0">
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td
                                  style="
                                    width: 36px;
                                    height: 36px;
                                    background-color: #ebebeb;
                                    border-radius: 50%;
                                    text-align: center;
                                    vertical-align: middle;
                                  "
                                >
                                  <span
                                    style="
                                      font-size: 15px;
                                      font-weight: 700;
                                      color: #111827;
                                    "
                                    >3</span
                                  >
                                </td>
                                <td style="padding-left: 14px">
                                  <p
                                    style="
                                      margin: 0;
                                      font-size: 14px;
                                      font-weight: 600;
                                      color: #111827;
                                    "
                                  >
                                    Start learning
                                  </p>
                                  <p
                                    style="
                                      margin: 2px 0 0;
                                      font-size: 12px;
                                      color: #6b7280;
                                    "
                                  >
                                    Access your classes and begin your learning
                                    journey
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA -->
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td
                            style="
                              background-color: #111827;
                              border-radius: 10px;
                            "
                          >
                            <a
                              href="${INSTITUTION_COURSES_URL}"
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
                              Browse Courses →
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
                    <td style="padding: 0 48px">
                      <div style="height: 1px; background-color: #f3f4f6"></div>
                    </td>
                  </tr>
                </table>

                <!-- Footer note -->
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
                        If you didn't create this account, you can safely ignore
                        this email. Need help? Contact us at
                        <a
                          href="mailto:${INSTITUTION_SUPPORT_EMAIL}"
                          style="color: #6b7280"
                          >${INSTITUTION_SUPPORT_EMAIL}</a
                        >
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding: 28px 0 8px">
                <p style="margin: 0; font-size: 12px; color: #52565c">
                  © ${new Date().getFullYear()} ${INSTITUTION_NAME}. All
                  rights reserved.
                </p>
                <p style="margin: 0; font-size: 12px; color: #52565c">
                  Powered by Deamoz.
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
