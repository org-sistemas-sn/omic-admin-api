import * as fs from 'fs';
import * as puppeteer from 'puppeteer';
import { cedulaDenunciante } from './cedulaDenunciante';
import { cedulaDenunciado } from './cedulaDenunciado';
import { comprobanteNotificacion } from './comprobanteNotificacion';

export const generatePDF = async (info: any, tipo: string) => {
  let htmlContent = '';

  switch (tipo) {
    case 'denunciante':
      htmlContent = cedulaDenunciante(info);
      break;
    case 'denunciado':
      htmlContent = cedulaDenunciado(info);
      break;
    case 'notificacion':
      htmlContent = comprobanteNotificacion(info);
      break;
    default:
      throw new Error(`Tipo de documento desconocido: ${tipo}`);
  }

  try {
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--disable-gpu',
        '--no-zygote',
      ],
      protocolTimeout: 60000,
      headless: true,
    });
    const page = await browser.newPage();

    // Configuración mejorada de espera
    await page.setDefaultNavigationTimeout(60000);

    // Esperar a que las imágenes se carguen antes de generar el PDF
    await page
      .waitForSelector('img', { timeout: 5000 })
      .catch(() => console.log('No hay imágenes o timeout alcanzado'));

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    // Configurar el contenido HTML en la página
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Esperar a que las imágenes se carguen antes de generar el PDF
    const hasImages = await page.evaluate(() => document.images.length > 0);

    if (hasImages) {
      await page.evaluate(() => {
        return new Promise((resolve) => {
          const images = Array.from(document.images);
          let loaded = 0;
          images.forEach((img) => {
            if (img.complete) {
              loaded++;
              if (loaded === images.length) resolve(null);
            } else {
              img.onload = () => {
                loaded++;
                if (loaded === images.length) resolve(null);
              };
              img.onerror = () => {
                loaded++;
                if (loaded === images.length) resolve(null);
              };
            }
          });
        });
      });
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    // fs.writeFileSync('output.pdf', pdfBuffer);
    await browser.close();
    console.log('📄 Documento PDF generado exitosamente: output.pdf');

    const buffer = Buffer.from(pdfBuffer);

    return buffer;
  } catch (error) {
    console.error('Error al generar el documento:', error);
    throw new Error('No se pudo generar el PDF');
  }
};
