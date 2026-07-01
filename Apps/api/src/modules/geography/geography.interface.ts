import type { WilayaDTO, CommuneDTO } from '@my-app/contract';

export interface IGeographyService {
  getWilayas(): Promise<WilayaDTO[]>;
  getCommunes(wilayaId: string): Promise<CommuneDTO[]>;
}
