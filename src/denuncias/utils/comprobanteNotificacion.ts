export const comprobanteNotificacion = (d: any) => {
  return `
  <!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación OMIC</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      padding: 20px;
      border: 1px solid #ddd;
      max-width: 600px;
      margin: auto;
    }

    .header {
      font-size: 14px;
      color: #555;
    }

    .header p {
      margin: 2px 0;
    }

    .title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin-top: 20px;
    }

    .content {
      margin-top: 20px;
      text-align: center;
    }

    .content p {
      margin: 5px 0;
    }

    .footer {
      margin-top: 40px;
      font-size: 12px;
      color: gray;
    }

    .document {
      margin-top: 20px;
      padding: 10px;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
    }

    .document img {
      width: 40px;
      height: auto;
      margin-right: 10px;
    }

    .document-info {
      font-size: 14px;
    }
  </style>
</head>

<body>
  <div class="header">
    <p><strong>From:</strong> snsistemas@sannicolas.gob.ar</p>
    <p><strong>Subject:</strong> Omic</p>
    <p><strong>Date:</strong> ${d.fechaHora}</p>
    <p><strong>To:</strong> ${d.email}</p>
  </div>
  <div class="title">
    <p>Notificación de Oficina Municipal de Informacion al Consumidor (OMIC)</p>
  </div>
  <div class="content">
    ${d.expte ? `<p><strong>Expte:</strong> ${d.expte}</p>` : ''}
    <p>${d.message}</p>
    ${d.motivo ? `<p>${d.motivo}</p>` : ''}
    ${d.saludos ? `<p>Saludos cordiales</p>` : ''}
  </div>

  ${
    d.documentos && d.documento.length > 0
      ? `
      <div class="document">
        <div class="document-info">
          ${d.documentos
            .map(
              (doc: any) =>
                `<p><strong>${doc.name}</strong> - ${doc.weight}</p>`,
            )
            .join('')}
        </div>
      </div>
    `
      : ''
  }

  <div class="footer">
    <p>*Documento generado a partir del sistema OMIC-ADMIN</p>
  </div>
</body>

</html>
  `;
};
