// One shared look for every email INFRA Watch sends. Email programs ignore most modern CSS,
// so this uses tables and inline styles only, with a plain-text fallback kept by the callers.

const NAVY = "#14305f";
const GOLD = "#f5b400";
const INK = "#172033";
const MUTED = "#5b6577";
const LINE = "#e2e8f0";

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}

export function paragraphsToHtml(text: string) {
  return text
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim().length > 0)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${INK}">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`,
    )
    .join("");
}

// A large, easy-to-read box for one-time codes. The code is written with spaces between
// digits only on screen (letter-spacing), so copying it still gives the plain digits.
export function codeBoxHtml(code: string, note?: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td align="center" style="background:#eef3fb;border:1px solid #c9d6ee;border-radius:8px;padding:20px 12px">
<div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};margin-bottom:8px">Your code</div>
<div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:8px;color:${NAVY}">${escapeHtml(code)}</div>
${note ? `<div style="font-size:13px;color:${MUTED};margin-top:10px">${escapeHtml(note)}</div>` : ""}
</td></tr></table>`;
}

export function buttonHtml(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="background:${NAVY};border-radius:6px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${escapeHtml(label)}</a></td></tr></table>`;
}

const ORGANIZATION = "Bureau of Agricultural and Fisheries Engineering";

export function wrapEmailHtml({
  bodyHtml,
  preheader,
  footerNote = "This is an automated message. Please do not reply directly.",
  siteUrl = process.env.NEXT_PUBLIC_BASE_URL,
}: {
  bodyHtml: string;
  preheader?: string;
  footerNote?: string;
  siteUrl?: string;
}) {
  const logo = siteUrl
    ? `<img src="${escapeHtml(siteUrl.replace(/\/$/, ""))}/infra-watch-logo-dark.png" alt="" height="36" style="display:inline-block;vertical-align:middle;margin-right:10px;border:0">`
    : "";
  const footerLogo = siteUrl
    ? `<img src="${escapeHtml(siteUrl.replace(/\/$/, ""))}/bafe-logo-email.png" alt="" width="56" style="display:block;width:56px;height:auto;border:0">`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${LINE};border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif">
<tr><td style="background:${NAVY};padding:18px 24px">${logo}<span style="vertical-align:middle;font-size:20px;font-weight:700;color:#ffffff">INFRA Watch</span><div style="font-size:12px;color:#cdd8ee;margin-top:4px">Public Transparency and Monitoring Portal</div></td></tr>
<tr><td style="background:${GOLD};height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:28px 24px 20px">${bodyHtml}<p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:${MUTED}">Best regards,<br><strong style="color:#33415c">${ORGANIZATION}</strong></p></td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid ${LINE};padding:18px 24px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
${footerLogo ? `<td valign="middle" style="padding-right:14px">${footerLogo}</td>` : ""}
<td valign="middle">
<div style="font-size:14px;line-height:1.4;font-weight:600;color:${INK}">${ORGANIZATION} (BAFE)</div>
<div style="font-size:13px;line-height:1.5;color:${MUTED}">Department of Agriculture, Diliman, Quezon City</div>
<div style="font-size:11.5px;line-height:1.5;color:#8a94a6;margin-top:6px">${escapeHtml(footerNote)}</div>
</td></tr></table>
</td></tr>
</table></td></tr></table></body></html>`;
}
