import { PipeTransform, ArgumentMetadata } from '@nestjs/common';

export class ParseFormDataJsonPipe implements PipeTransform {
  constructor(private _prop: string) {}
  transform(value: object, metadata: ArgumentMetadata) {
    const valueToParse = value[this._prop];
    const parsed = JSON.parse(valueToParse);
    // console.log(parsed, 'PARSED');

    return parsed;
  }
}
