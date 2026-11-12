import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEmailError,
  getNameError,
  getPhoneError,
  hasValidDocumentContent
} from './validation.js';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(fileNames) {
  const encoder = new TextEncoder();
  const localEntries = [];
  const centralEntries = [];
  let localOffset = 0;


  for (const fileName of fileNames) {
    const name = encoder.encode(fileName);
    const content = encoder.encode({
      '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      'word/document.xml': '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Test</w:t></w:r></w:p><w:sectPr/></w:body></w:document>'
    }[fileName] || 'test content');
    const checksum = crc32(content);
    const local = new Uint8Array(30 + name.length + content.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, content.length, true);
    localView.setUint32(22, content.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(content, 30 + name.length);
    localEntries.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, content.length, true);
    centralView.setUint32(24, content.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, localOffset, true);
    central.set(name, 46);
    centralEntries.push(central);
    localOffset += local.length;
  }

  const centralSize = centralEntries.reduce((total, entry) => total + entry.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, fileNames.length, true);
  endView.setUint16(10, fileNames.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);

  const parts = [...localEntries, ...centralEntries, endRecord];
  const zip = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    zip.set(part, offset);
    offset += part.length;
  }
  return zip;
}

test('accepts valid email addresses', () => {
  for (const email of [
    'candidate@gmail.com',
    'recruitment@example.co.za',
    'person.name@company.org'
  ]) {
    assert.equal(getEmailError(email), '');
  }
});

test('rejects invalid and disposable email addresses', () => {
  for (const email of [
    'not-an-email',
    'missing@domain',
    'candidate@mailinator.com',
    'person@yopmail.com',
    'user@sub.mailinator.com'
  ]) {
    assert.notEqual(getEmailError(email), '');
  }
});
test('accepts international names and common name punctuation', () => {
  for (const name of ['José Núñez', 'O’Connor Smith', 'Anne-Marie Dlamini', '李 小龍']) {
    assert.equal(getNameError(name), '');
  }
});

test('rejects empty names, names without letters, and unsafe characters', () => {
  for (const name of ['', '---', 'Jane <script>']) {
    assert.notEqual(getNameError(name), '');
  }
});

test('accepts formatted phone strings within the overall digit-length limit', () => {
  assert.equal(getPhoneError('(212) 555-0100', '+1'), '');
  assert.equal(getPhoneError('021 555 0184', '+27'), '');
  assert.equal(getPhoneError('', '+27'), '');
});

test('rejects malformed or overlong phone numbers', () => {
  assert.notEqual(getPhoneError('123', '+27'), '');
  assert.notEqual(getPhoneError('0800 ABC HELP', '+27'), '');
  assert.notEqual(getPhoneError('12345678901234', '+27'), '');
});

test('checks PDF, JPG, and JPEG signatures rather than filenames alone', () => {
  assert.equal(hasValidDocumentContent('pdf', new TextEncoder().encode('%PDF-1.7')), true);
  assert.equal(hasValidDocumentContent('jpg', new Uint8Array([0xff, 0xd8, 0xff, 0x00])), true);
  assert.equal(hasValidDocumentContent('jpeg', new Uint8Array([0xff, 0xd8, 0xff, 0x00])), true);
  assert.equal(hasValidDocumentContent('png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
  assert.equal(hasValidDocumentContent('pdf', new TextEncoder().encode('<html>')), false);
  assert.equal(hasValidDocumentContent('exe', new Uint8Array([0x4d, 0x5a])), false);
});

test('checks the legacy DOC signature and WordDocument marker', () => {
  const docHeader = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const wordDocument = new TextEncoder().encode('WordDocument');
  const validDoc = new Uint8Array(docHeader.length + wordDocument.length);
  validDoc.set(docHeader);
  validDoc.set(wordDocument, docHeader.length);

  assert.equal(hasValidDocumentContent('doc', validDoc), true);
  assert.equal(hasValidDocumentContent('doc', docHeader), false);
  assert.equal(hasValidDocumentContent('doc', new Uint8Array([0x4d, 0x5a, ...wordDocument])), false);
});

test('rejects empty documents for every supported format', () => {
  for (const extension of ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']) {
    assert.equal(hasValidDocumentContent(extension, new Uint8Array()), false);
  }
});

test('checks DOCX ZIP structure and required entries', () => {
  const validDocx = makeZip(['[Content_Types].xml', '_rels/.rels', 'word/document.xml']);
  const missingContentTypes = makeZip(['_rels/.rels', 'word/document.xml']);
  const missingDocument = makeZip(['[Content_Types].xml', '_rels/.rels']);
  const truncatedDocx = validDocx.subarray(0, validDocx.length - 10);
  const malformedDocx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);

  assert.equal(hasValidDocumentContent('docx', validDocx), true);
  assert.equal(hasValidDocumentContent('docx', missingContentTypes), false);
  assert.equal(hasValidDocumentContent('docx', missingDocument), false);
  assert.equal(hasValidDocumentContent('docx', truncatedDocx), false);
  assert.equal(hasValidDocumentContent('docx', malformedDocx), false);
});
