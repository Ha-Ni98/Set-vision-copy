import {
  WilayaResponseSchema,
  CommuneResponseSchema,
  type WilayaDTO,
  type CommuneDTO,
} from "@my-app/contract";

export const mockWilaya: WilayaDTO = WilayaResponseSchema.parse({
  id: "f1000000-0000-4000-8000-000000000001",
  wilayaCode: "16",
  frName: "Alger",
  arName: "الجزائر",
});

export const mockWilayaSecondary: WilayaDTO = WilayaResponseSchema.parse({
  id: "f1000000-0000-4000-8000-000000000002",
  wilayaCode: "31",
  frName: "Oran",
  arName: "وهران",
});

export const mockWilayas: WilayaDTO[] = [mockWilaya, mockWilayaSecondary];

// Arabic content exercises encoding — a plain string-vs-string comparison after a round
// trip through fetch/JSON would silently pass even with mangled encoding, so tests assert
// this fixture, not a transliteration.
export const mockCommune: CommuneDTO = CommuneResponseSchema.parse({
  id: "f2000000-0000-4000-8000-000000000001",
  communeCode: "1601",
  wilayaId: mockWilaya.id,
  frName: "Sidi M'Hamed",
  arName: "سيدي امحمد",
});

export const mockCommuneSecondary: CommuneDTO = CommuneResponseSchema.parse({
  id: "f2000000-0000-4000-8000-000000000002",
  communeCode: "1602",
  wilayaId: mockWilaya.id,
  frName: "El Madania",
  arName: "المدنية",
});

export const mockCommunes: CommuneDTO[] = [mockCommune, mockCommuneSecondary];
