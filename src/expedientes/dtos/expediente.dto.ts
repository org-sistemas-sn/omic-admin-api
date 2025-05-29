export type TipoExpediente = 'digital' | 'no_digital';

export interface ExpedienteDto {
  idCausa?: number;
  idCausaNoDigitalizada?: number;
  nroExpediente: string;
  denunciante: string;
  denunciados: string[];
  fecha: string;
  estado: string;
  tipo: TipoExpediente;
}

export interface PaginatedExpedientesResponse {
  page: number;
  limit: number;
  totalItems: number;
  data: ExpedienteDto[];
}

export interface DenunciadoNoDigitalizado {
  id: number;
  nombre: string;
}

export interface CausaNoDigitalizadaDto {
  id: number;
  nroExpediente: string;
  denunciante: string;
  fechaInicio: string;
  estado: string;
  denunciados: DenunciadoNoDigitalizado[];
}

export interface PaginatedCausasNoDigitalizadasResponse {
  page: number;
  limit: number;
  totalItems: number;
  data: CausaNoDigitalizadaDto[];
}
