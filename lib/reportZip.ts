// Uncompressed ZIP, UTF-8 filenames. Files are fetched one at a time in the browser.
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
export class ReportZip {
  private chunks: BlobPart[] = [];
  private directory: ArrayBuffer[] = [];
  private offset = 0;
  async add(filename: string, blob: Blob) {
    const name = new TextEncoder().encode(filename);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let crc = 0xffffffff;
    for (const value of Array.from(bytes)) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8);
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true);
    view.setUint16(12, 0x21, true); view.setUint32(14, crc, true); view.setUint32(18, bytes.length, true); view.setUint32(22, bytes.length, true);
    view.setUint16(26, name.length, true); header.set(name, 30);
    const central = new Uint8Array(46 + name.length);
    const record = new DataView(central.buffer);
    record.setUint32(0, 0x02014b50, true); record.setUint16(4, 20, true); record.setUint16(6, 20, true);
    record.setUint16(8, 0x800, true); record.setUint16(14, 0x21, true); record.setUint32(16, crc, true);
    record.setUint32(20, bytes.length, true); record.setUint32(24, bytes.length, true);
    record.setUint16(28, name.length, true); record.setUint32(42, this.offset, true); central.set(name, 46);
    this.chunks.push(header.buffer, blob); this.directory.push(central.buffer); this.offset += header.length + bytes.length;
    if (this.offset > 0xffffffff || this.directory.length > 65535) throw new Error('ZIP 크기 한도를 초과했습니다. 조회 범위를 줄여 주세요.');
  }
  finish() {
    const length = this.directory.reduce((n, row) => n + row.byteLength, 0);
    const footer = new Uint8Array(22), view = new DataView(footer.buffer);
    view.setUint32(0, 0x06054b50, true); view.setUint16(8, this.directory.length, true);
    view.setUint16(10, this.directory.length, true); view.setUint32(12, length, true); view.setUint32(16, this.offset, true);
    return new Blob([...this.chunks, ...this.directory, footer.buffer], { type: 'application/zip' });
  }
}
