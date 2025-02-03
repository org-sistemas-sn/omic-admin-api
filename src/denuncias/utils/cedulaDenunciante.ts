export const cedulaDenunciante = (d: any) => {
  return `
  <!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<style>
  @page {
    size: A4;
    margin: 10mm;
  }
  body {
    font-size: 14px;
    line-height: 1.2;
  }
</style> 
<body style="text-align: center; font-family: sans-serif;">
  <div style="margin-bottom: 30px;"><img
      src="https://staticcontent.sannicolasciudad.gob.ar/images/omic-admin/images/sn-logo.jpg" /></div>
  <div style="font-weight: 700;">
    <div style="display: flex; justify-content: space-between;">
      <div
        style="width: 155px; height: 33px; display: flex; align-items: center; justify-content: center; background-color: #EBE8E8; color: #0477AD; border-radius: 10px;">
        San Nicolás</div>
      <div
        style="width: 155px; height: 33px; display: flex; align-items: center; justify-content: center; color: #0477AD; border: 1px solid #0477AD; border-radius: 10px;">
        ${d.dia} de ${d.mes} de ${d.año}</div>
      <div
        style="width: 177px; height: 33px; display: flex; align-items: center; justify-content: center; background-color: #0477AD; color: white; border-radius: 10px;">
        Expte: ${d.nro_expediente}</div>
    </div>
  </div>
  <div style="margin: 30px 0px; color: #0477AD; font-weight: 700; text-align: center;">
    <b>CÉDULA DE NOTIFICACIÓN APERTURA DE INICIO</b>
  </div>
  <div style="display: flex; justify-content: center; color: #0477AD; background-color: #EBE8E8; border-radius: 10px;">
    <div style="display: flex; flex-direction: column; align-items: flex-start; padding: 30px; gap: 4px;">
      <div><b>DENUNCIANTE:</b> ${d.denunciante}</div>
      <div><b>DOMICILIO:</b> ${d.direccion_denunciante} - ${d.localidad_denunciante} CP (${d.cod_postal_denunciante}) ${d.provincia_denunciante}</div>
      <div><b>TEL DE CONTACTO:</b> ${d.tel_denunciante}</div>
      <div><b>CORREO ELECTRÓNICO CONSTITUIDO</b> ${d.email_denunciante}</div>
    </div>
  </div>
  <div style="padding: 30px; color: #0477AD; font-weight: 700;">
    <div style="display: flex; align-items: center; gap: 5px;">
      <div><img src="https://staticcontent.sannicolasciudad.gob.ar/images/omic-admin/images/icon1.jpg" /></div>
      <div>AUDIENCIA VIRTUAL</div>
    </div>
    <div style="display: flex; align-items: center; gap: 5px;">
      <div><img src="https://staticcontent.sannicolasciudad.gob.ar/images/omic-admin/images/icon2.jpg" /></div>
      <div>${d.denunciante} C/ ${d.denunciado}</div>
    </div>
    <div style="display: flex; align-items: center; gap: 5px;">
      <div><img src="https://staticcontent.sannicolasciudad.gob.ar/images/omic-admin/images/icon3.jpg" /></div>
      <div>FECHA: ${d.weekday_meet}, ${d.day_meet} de ${d.month_meet} de ${d.year_meet} </div>
    </div>
    <div style="display: flex; align-items: center; gap: 5px;">
      <div><img src="https://staticcontent.sannicolasciudad.gob.ar/images/omic-admin/images/icon1.jpg" /></div>
      <div>HORA: ${d.hhmm_meet} hs</div>
    </div>
  </div>
  <div
    style="margin-bottom: 30px; background-color: #0477AD; border-radius: 10px; font-size: 15px; padding: 20px;">
    <a href="${d.link_meet}" style="color: white;">${d.link_meet}</a>
  </div>
  <div>
    Se le hace saber a las partes que la modalidad de audiencia virtual se realiza en el marco de las disposiciones que
    ha determinado la Secretaria de Comercio interior mediante Resolución 616/2020.
    Ante la incomparecencia injustificada a la primera audiencia, se procederá al cierre de la etapa de conciliación y
    su posterior archivo. Respecto al denunciado se le hace saber que, ante la incomparecencia injustificada a la
    primera audiencia, se procederá al cierre de la etapa de conciliación y se labrará auto de imputación conforme las
    prescripciones de los Art. 47 y 48 de la ley 13133.
    <br />
    <br />
    Que, a tenor de la modificación introducida por Ley 15.230 en el Art. 24 del Decreto-Ley 7647/70, se implementa el
    domicilio electrónico con carácter obligatorio y sustitutivo del domicilio real por lo que los proveedores citados a
    la instancia deberán constituir domicilio electrónico mediante un e-mail.
    <br />
    <br />
    Que, adicionalmente y conf. art. 10 y cctes. del Anexo I de la Res. Sec. Com. Nac. 1033/21, se dispone que a fin de
    agilizar los procesos de notificación de reclamos de consumo se podrán realizar las notificaciones a los correos
    electrónicos que se encuentren informados por los Proveedores en sus páginas web, cuenta de redes sociales y/o
    similares en pos de generar procesos más eficientes y eficaces (Art. 42 CN in fine).
    <br />
    <br />
    Finalmente se informa que la Provincia de Bs As ha adherido, mediante Resol 315/2021, a la Resol 274/2021 de la SC
    PEN, la que establece que todo proveedor requerido, deberá constituir domicilio electrónico dentro de los 10 días
    hábiles de notificado siempre que no hubiesen constituido domicilio electrónico ante el Servicio de Conciliación
    Previa de las Relaciones de Consumo.  El mismo tendrá carácter de domicilio constituido y en él serán consideradas
    válidas todas las notificaciones que se cursen en el marco de los procedimientos administrativos que se lleven a
    cabo por las Autoridades de Aplicación Locales que adhieran a dicha Resolución.
    <br />
    <br />
    La Oficina Municipal de Información al Consumidor establece como domicilio legal electrónico el correo
    “omicsannicolas@sannicolas.gob.ar”.
    <br />
    <br />
    Hágase saber a las partes lo que dispone el ARTICULO 47 de ley 13133: “Con la comparecencia de las partes se
    celebrará audiencia de conciliación, labrándose acta. El acuerdo será rubricado por los intervinientes y homologado.
    El acuerdo homologado suspenderá el procedimiento en cualquier momento del sumario hasta la oportunidad del cierre
    de la instancia conciliatoria. Si no hubiere acuerdo, o notificada la audiencia el denunciado no compareciere sin
    causa justificada, se formulará auto de imputación el que contendrá una relación suscinta de los hechos y la
    determinación de la norma legal infringida. Notificado el mismo y efectuado el descargo pertinente, en este estado
    se elevarán las actuaciones al funcionario municipal competente quien resolverá la sanción aplicable. Ello, sin
    perjuicio de las facultades conferidas por el artículo 44º de la Ley 24.240.”
    <br />
    <br />
    Los comparecientes deberán acreditar su identidad personal con D.N.I.; L.C. y/o L.E., constituir domicilio dentro
    del radio del Municipio y acreditar personería con los instrumentos legales correspondientes donde constaren dichas
    facultades.
    <br />
    <br />
    Se notifica a usted dejando constancia que en caso de incomparecencia injustificada a la audiencia y/o el
    incumplimiento de los acuerdos homologados, se considera violación de la Ley 13.133 y Ley 24.240 según artículo
    48º de la Ley 13.133.- NOTIFIQUESÉ A LAS PARTES.
  </div>
  <div style="padding: 30px 0px;">
    QUEDA USTED DEBIDAMENTE NOTIFICADO
  </div>
  <div style="padding: 30px 0px;">
    <div style="display: flex; flex-direction: column;">
      <div>
        <img src="https://staticcontent.sannicolasciudad.gob.ar/images/omic-admin/images/firma1.jpg" />
      </div>
      <div>
        <b>Juan Manuel Sofreddi</b>
      </div>
    </div>
  </div>
  <div style="background-color: #0477AD; color: white; border-radius: 10px; padding: 20px;">
    Ante cualquier inconveniente podrá comunicarse al correo electrónico a omicsannicolas@sannicolas.gob.ar
  </div>
</body>

</html>
  `;
};
