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
    console.log(':rocket: Iniciando Puppeteer...');

    const browser = await puppeteer.launch({
      // executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // '--disable-dev-shm-usage',
        // '--disable-accelerated-2d-canvas',
        // '--disable-gpu',
        // '--no-zygote',
        // '--disable-software-rasterizer',
        // '--single-process',
        // '--disable-background-timer-throttling',
        // '--disable-backgrounding-occluded-windows',
        // '--disable-renderer-backgrounding',
      ],
      protocolTimeout: 120000,
      headless: true,
      timeout: 60000, // 60 segundos
    });

    console.log(':white_check_mark: Puppeteer iniciado correctamente.');
    console.log(
      ':small_blue_diamond: Versión de Chromium:',
      await browser.version(),
    );

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);

    console.log(':page_facing_up: Configurando contenido HTML...');
    await page.setContent(htmlContent, { waitUntil: 'networkidle2' });

    // Esperar a que las imágenes se carguen completamente
    const hasImages = await page.evaluate(() => document.images.length > 0);
    if (hasImages) {
      console.log(
        ':frame_with_picture: Esperando que las imágenes se carguen...',
      );
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images).map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });
          }),
        ),
      );
      console.log(
        ':white_check_mark: Todas las imágenes se han cargado correctamente.',
      );
    }

    console.log(':page_facing_up: Generando PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    console.log(':white_check_mark: PDF generado con éxito.');

    // Esperar un poco antes de cerrar el navegador
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await browser.close();
    console.log(':door: Puppeteer cerrado correctamente.');

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error(':x: Error al generar el PDF:', error);
    throw new Error('No se pudo generar el PDF');
  }
};
