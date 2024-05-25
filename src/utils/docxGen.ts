import * as carbone from 'carbone';
import * as path from 'path';

const formatData = (values) => {
  const data = {
    denunciante: {
      nombre: values?.denunciante?.nombre || '',
      apellido: values?.denunciante?.apellido || '',
      dni: values?.denunciante?.dni || '',
      email: values?.denunciante?.email || '',
      tel: values?.denunciante?.telefono || '',
      telalt: values?.denunciante?.telefonoAlter || '',
      celular: values?.denunciante?.celular || '',
      domicilio: values?.denunciante?.domicilio || '',
      localidad: values?.denunciante?.localidad || '',
      codpostal: values?.denunciante?.codPostal || '',
    },
    autorizado: {
      nombre: values?.autorizado?.nombre || '',
      apellido: values?.autorizado?.apellido || '',
      dni: values?.autorizado?.dni || '',
      domicilio: values?.autorizado?.domicilio || '',
      localidad: values?.autorizado?.localidad || '',
      tel: values?.autorizado?.telefono || '',
      email: values?.autorizado?.email || '',
    },
    denunciados: values?.denunciadoDenuncia?.map((d) => ({
      nombre: d.denunciado?.nombre || '',
      dni: d.denunciado?.dni || '',
      codpostal: d.denunciado?.codPostal || '',
      domicilio: d.denunciado?.domicilio || '',
      localidad: d.denunciado?.localidad || '',
      tel: d.denunciado?.tel || '',
      telalt: d.denunciado?.telefonoAlter || '',
      email: d.denunciado?.email || '',
    })),
    hechos: values?.descripcionHechos || '',
    pretension: values?.pretension || '',
    maneraContratar: values?.maneraContrato || '',
    metodoPago: values?.metodoPago || '',
    realizoReclamo: values?.realizoReclamo || '',
    observaciones: values?.observaciones || '',
    servicio: values?.servicio || '',
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
