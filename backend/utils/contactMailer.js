
const { Resend } = require("resend");

function parseRecipients(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getMailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "";
  const to = parseRecipients(process.env.CONTACTO_NOTIF_TO);

  return {
    provider: "resend",
    enabled: Boolean(apiKey && from && to.length),
    apiKey,
    from,
    to
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(consulta) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#171320">
      <h2>Nueva consulta recibida</h2>

      <p>
        Se registró una nueva consulta desde el sitio institucional.
      </p>

      <table style="border-collapse:collapse;width:100%;max-width:720px">
        <tr>
          <td style="padding:8px;border:1px solid #ddd"><b>Nombre</b></td>
          <td style="padding:8px;border:1px solid #ddd">${escapeHtml(consulta.nombre)}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd"><b>Email</b></td>
          <td style="padding:8px;border:1px solid #ddd">${escapeHtml(consulta.email)}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd"><b>Motivo</b></td>
          <td style="padding:8px;border:1px solid #ddd">${escapeHtml(consulta.motivo)}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd"><b>Estado</b></td>
          <td style="padding:8px;border:1px solid #ddd">${escapeHtml(consulta.estado || "nueva")}</td>
        </tr>
      </table>

      <div style="
        margin-top:16px;
        padding:12px 14px;
        border:1px solid #ddd;
        border-radius:8px;
        background:#fafafa;
        white-space:pre-wrap;
      ">${escapeHtml(consulta.mensaje)}</div>
    </div>
  `;
}

async function sendConsultaNotification(consulta) {
  const config = getMailConfig();

  if (!config.enabled) {
    console.warn("Configuración de Resend incompleta");

    return {
      skipped: true,
      reason: "Configuración de Resend o destinatarios incompleta"
    };
  }

  try {
    const resend = new Resend(config.apiKey);

    const { data, error } = await resend.emails.send({
      from: config.from,
      to: config.to,
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

    if (error) {
      console.error("Error de Resend:", error);
      throw new Error(error.message || "Error al enviar el correo");
    }

    console.log("Notificación enviada a Resend:", data.id);

    return {
      skipped: false,
      recipients: config.to
    };

  } catch (error) {
    console.error("Error al enviar notificación:", error.message);
    throw error;
  }
}

module.exports = {
  sendConsultaNotification,
  getMailConfig
};
