import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import cardTemplateUrl from "@/assets/card-template.pdf?url";

const PAGE_WIDTH = 595.44;
const PAGE_HEIGHT = 842.16;
const FONT_SIZE = 26;
const CARDS_PER_PAGE = 4;

// Center of each of the 4 cards' blank key box, in PDF points — measured directly against
// the template (top-left, top-right, bottom-left, bottom-right), not derived from any
// programmatic layout, since the template itself is a fixed Canva-exported asset.
const KEY_SLOTS: { x: number; y: number }[] = [
  { x: 148.53, y: 702.22 },
  { x: 446.6, y: 702.22 },
  { x: 148.53, y: 281.39 },
  { x: 446.6, y: 281.39 },
];

// Builds a multi-page PDF from card-template.pdf's single page-of-4 — one output page per
// group of up to 4 keys, so the last page's unused slots are simply left blank (the
// template's own default state), matching the physical sheet's real card count.
export async function generateCardsPdf(keys: string[]): Promise<Uint8Array<ArrayBuffer>> {
  const templateBytes = await fetch(cardTemplateUrl).then((res) => res.arrayBuffer());
  const templateDoc = await PDFDocument.load(templateBytes);
  const outDoc = await PDFDocument.create();
  const [embeddedTemplate] = await outDoc.embedPages(templateDoc.getPages());
  const font = await outDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < keys.length; i += CARDS_PER_PAGE) {
    const page = outDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawPage(embeddedTemplate, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });

    const pageKeys = keys.slice(i, i + CARDS_PER_PAGE);
    pageKeys.forEach((key, slotIndex) => {
      const slot = KEY_SLOTS[slotIndex];
      const textWidth = font.widthOfTextAtSize(key, FONT_SIZE);
      const textHeight = font.heightAtSize(FONT_SIZE);
      page.drawText(key, {
        x: slot.x - textWidth / 2,
        y: slot.y - textHeight / 2 + textHeight * 0.15,
        size: FONT_SIZE,
        font,
        color: rgb(0, 0, 0),
      });
    });
  }

  // pdf-lib types this as Uint8Array<ArrayBufferLike> (could be a SharedArrayBuffer), which
  // doesn't satisfy BlobPart's stricter ArrayBuffer requirement — copy into a plain
  // Uint8Array so callers can pass this straight into `new Blob([...])`.
  return new Uint8Array(await outDoc.save());
}
