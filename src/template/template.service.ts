import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as carbone from 'carbone';

@Injectable()
export class TemplateService {
  async createDocx(data, fileName) {
    try {
      const dir = process.env.SRC_DIR_TEMPLATE || __dirname;

      return await new Promise((resolve, reject) => {
        carbone.render(
          path.resolve(dir, fileName),
          data,
          function (err, result) {
            if (err) {
              return reject(err);
            }
            resolve(result);
          },
        );
      });
    } catch (err) {
      throw err;
    }
  }
}
