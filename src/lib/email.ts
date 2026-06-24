import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder')

const FROM_EMAIL = 'Insight Hub <noreply@insighthubidn.my.id>'

// ============================================================
// OTP EMAIL TEMPLATES
// ============================================================

function otpEmailHtml(name: string, otp: string, purpose: 'register' | 'forgot_password'): string {
  const isReset = purpose === 'forgot_password'
  const title = isReset ? 'Reset Password Kamu' : 'Verifikasi Email Kamu'
  const greeting = isReset
    ? `Halo <strong>${name || 'kamu'}</strong>, kamu baru aja minta reset password.`
    : `Halo <strong>${name || 'kamu'}</strong>, selamat datang di Insight Hub!`
  const desc = isReset
    ? 'Masukin kode di bawah ini buat reset password kamu. Kode ini cuma berlaku <strong>10 menit</strong>, jadi jangan ditunda ya.'
    : 'Masukin kode di bawah ini buat aktivasi akun kamu. Kode ini cuma berlaku <strong>10 menit</strong>.'
  const footerNote = isReset
    ? 'Kalau kamu nggak minta reset password, abaikan email ini aja. Akun kamu aman kok.'
    : 'Kalau kamu nggak merasa daftar, abaikan email ini aja.'

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0286C3,#17B897);padding:32px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px 16px;">
                    <span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Insight Hub</span>
                  </td>
                </tr>
              </table>
              <p style="color:rgba(255,255,255,0.85);margin:16px 0 0;font-size:15px;">${title}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 12px;font-size:16px;color:#1e2a3a;line-height:1.6;">
                ${greeting}
              </p>
              <p style="margin:0 0 32px;font-size:14px;color:#536171;line-height:1.7;">
                ${desc}
              </p>

              <!-- OTP Box -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <div style="background:#f0f9ff;border:2px dashed #0286C3;border-radius:12px;padding:24px 32px;display:inline-block;">
                      <p style="margin:0 0 6px;font-size:12px;color:#536171;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Kode OTP kamu</p>
                      <p style="margin:0;font-size:42px;font-weight:900;color:#0286C3;letter-spacing:12px;font-family:monospace;">${otp}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#8DA4BE;text-align:center;">
                Kode ini expired dalam <strong style="color:#536171;">10 menit</strong>
              </p>
              <p style="margin:0;font-size:13px;color:#8DA4BE;text-align:center;">
                Kalau nggak nemu di inbox, cek folder <strong>Spam</strong> atau <strong>Promosi</strong> ya.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e8edf2;margin:0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0;font-size:12px;color:#8DA4BE;line-height:1.7;text-align:center;">
                ${footerNote}<br>
                Butuh bantuan? Hubungi kami di <a href="mailto:support@insighthubidn.my.id" style="color:#0286C3;text-decoration:none;">support@insighthubidn.my.id</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ============================================================
// PUBLIC FUNCTIONS
// ============================================================

export async function sendOtpEmail(
  to: string,
  name: string,
  otp: string,
  purpose: 'register' | 'forgot_password'
): Promise<{ success: boolean; error?: string }> {
  try {
    const subject = purpose === 'forgot_password'
      ? `Kode Reset Password Insight Hub — ${otp}`
      : `Kode Verifikasi Insight Hub — ${otp}`

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: otpEmailHtml(name, otp, purpose),
    })

    if (error) {
      console.error('[Email] Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[Email] Send error:', err)
    return { success: false, error: err.message }
  }
}
