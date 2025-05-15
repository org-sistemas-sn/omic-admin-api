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
