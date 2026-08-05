const nodemailer = require("nodemailer");

function parseBool(value) {
  return String(value || "").toLowerCase() === "true";
}

function parseRecipients(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = parseBool(process.env.SMTP_SECURE);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "";
  const to = parseRecipients(process.env.CONTACTO_NOTIF_TO);

  return {
    enabled: Boolean(host && port && user && pass && from && to.length),
    host,
    port,
    secure,
    user,
    pass,
    from,
    to
  };
}

let transporterPromise = null;

async function getTransporter() {
  if (!transporterPromise) {
    const config = getMailConfig();
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass
        }
      })
    );
  }
  return transporterPromise;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(consulta) {
  return [
    "<div style=\"font-family:Arial,sans-serif;line-height:1.5;color:#171320\">",
    "<h2 style=\"margin:0 0 16px\">Nueva consulta recibida</h2>",
    "<p style=\"margin:0 0 16px\">Se registró una nueva consulta desde el sitio institucional.</p>",
    "<table style=\"border-collapse:collapse;width:100%;max-width:720px\">",
    "<tr><td style=\"padding:8px;border:1px solid #ddd;font-weight:bold\">Nombre</td><td style=\"padding:8px;border:1px solid #ddd\">" + escapeHtml(consulta.nombre) + "</td></tr>",
    "<tr><td style=\"padding:8px;border:1px solid #ddd;font-weight:bold\">Email</td><td style=\"padding:8px;border:1px solid #ddd\">" + escapeHtml(consulta.email) + "</td></tr>",
    "<tr><td style=\"padding:8px;border:1px solid #ddd;font-weight:bold\">Motivo</td><td style=\"padding:8px;border:1px solid #ddd\">" + escapeHtml(consulta.motivo) + "</td></tr>",
    "<tr><td style=\"padding:8px;border:1px solid #ddd;font-weight:bold\">Estado</td><td style=\"padding:8px;border:1px solid #ddd\">" + escapeHtml(consulta.estado || "nueva") + "</td></tr>",
    "</table>",
    "<div style=\"margin-top:16px;padding:12px 14px;border:1px solid #ddd;border-radius:8px;background:#fafafa;white-space:pre-wrap\">" + escapeHtml(consulta.mensaje) + "</div>",
    "</div>"
  ].join("");
}

async function sendConsultaNotification(consulta) {
  const config = getMailConfig();
  if (!config.enabled) {
    return {
      skipped: true,
      reason: "Configuración SMTP o destinatarios incompleta"
    };
  }

  const transporter = await getTransporter();
  await transporter.sendMail({
    from: config.from,
    to: config.to.join(", "),
    replyTo: consulta.email,
    subject: "Nueva consulta: " + (consulta.motivo || "Sitio institucional"),
    text:
      "Nueva consulta recibida\n\n" +
      "Nombre: " + (consulta.nombre || "-") + "\n" +
      "Email: " + (consulta.email || "-") + "\n" +
      "Motivo: " + (consulta.motivo || "-") + "\n" +
      "Estado: " + (consulta.estado || "nueva") + "\n\n" +
      (consulta.mensaje || ""),
    html: buildHtml(consulta)
  });

  return {
    skipped: false,
    recipients: config.to
  };
}

module.exports = {
  sendConsultaNotification,
  getMailConfig
};
