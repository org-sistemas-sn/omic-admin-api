import * as carbone from 'carbone';
import * as path from 'path';

const formatData = (values) => {
  const data = {
    denunciante: {
      nombre: values?.denunciante?.nombre || 'Sin Nombre',
      apellido: values?.denunciante?.apellido || 'Sin Apellido',
      dni: values?.denunciante?.dni || 'Sin DNI',
      email: values?.denunciante?.email || 'Sin Email',
      tel: values?.denunciante?.telefono || 'Sin Teléfono',
      telalt: values?.denunciante?.telefonoAlter || 'Sin Teléfono Alternativo',
      celular: values?.denunciante?.celular || 'Sin Celular',
      domicilio: values?.denunciante?.domicilio || 'Sin Domicilio',
      localidad: values?.denunciante?.localidad || 'Sin Localidad',
      codpostal: values?.denunciante?.codPostal || 'Sin Código Postal',
    },
    autorizado: {
      nombre: values?.autorizado?.nombre || 'Sin Nombre',
      apellido: values?.autorizado?.apellido || 'Sin Apellido',
      dni: values?.autorizado?.dni || 'Sin DNI',
      domicilio: values?.autorizado?.domicilio || 'Sin Domicilio',
      localidad: values?.autorizado?.localidad || 'Sin Localidad',
      tel: values?.autorizado?.telefono || 'Sin Teléfono',
      email: values?.autorizado?.email || 'Sin Email',
    },
    denunciados: values?.denunciadoDenuncia?.map((d) => ({
      nombre: d.denunciado?.nombre || 'Sin Nombre',
      dni: d.denunciado?.dni || 'Sin DNI',
      codpostal: d.denunciado?.codPostal || 'Sin Código Postal',
      domicilio: d.denunciado?.domicilio || 'Sin Domicilio',
      localidad: d.denunciado?.localidad || 'Sin Localidad',
      tel: d.denunciado?.tel || 'Sin Teléfono',
      telalt: d.denunciado?.telefonoAlter || 'Sin Teléfono Alternativo',
      email: d.denunciado?.email || 'Sin Email',
    })),
    hechos: values?.descripcionHechos || 'Sin Descripción de Hechos',
    pretension: values?.pretension || 'Sin Pretensión',
    maneraContratar: values?.maneraContrato || 'Sin Manera de Contratar',
    metodoPago: values?.metodoPago || 'Sin Método de Pago',
    realizoReclamo: values?.realizoReclamo || 'Sin Reclamo Realizado',
    observaciones: values?.observaciones || 'Sin Observaciones',
    servicio: values?.servicio || 'Sin Servicio',
  };

  return data;
};

export const createDocx = (values) =>
  new Promise((resolve, reject) => {
    const data = formatData(values);

    const dir = process.env.SRC_DIR || __dirname;

    carbone.render(
      path.join(dir, `template.docx`),
      data,
      function (err, result) {
        if (err) {
          return reject(err);
        }
        resolve(result);
      },
    );
  });
