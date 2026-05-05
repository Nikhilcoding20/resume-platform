/** Shared table-based layout: purple → violet → teal gradient header (matches transactional emails). */

export function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function brandedEmailHtml({ title, intro, rows }) {
  const rowHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eaeaf2;font-size:14px;color:#5c5c7a;width:120px;vertical-align:top;font-weight:600;">${r.label}</td>
        <td style="padding:12px 0;border-bottom:1px solid #eaeaf2;font-size:14px;color:#1a1a2e;vertical-align:top;">${r.value}</td>
      </tr>`,
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eaeaf2;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#7c3aed 45%,#06b6d4 100%);padding:24px 28px;">
              <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">${title}</h1>
              ${intro ? `<p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.92);">${intro}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rowHtml}</table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;font-size:12px;color:#94a3b8;">Unemployed Club · unemployedclub.com</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
