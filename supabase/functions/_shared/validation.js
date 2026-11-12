const dideno test supabase/functions/_shared/validation.test.jsdeno test supabase/functions/_shared/validation.test.jsposableEmailDomains = new Set([
  '10minutemail.com', 'dispostable.com', 'emailondeck.com', 'example.com',
  'example.net', 'example.org', 'fakeinbox.com', 'getnada.com',
  'guerrillamail.com', 'maildrop.cc', 'mailinator.com', 'invalid', 'localhost',
  'mintemail.com', 'sharklasers.com', 'temp', 'temp-mail.org', 'tempail.com',
  'test', 'throwawaymail.com', 'trashmail.com', 'yopmail.com'
]);

export function getEmailError(value) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  const domain = email.slice(email.lastIndexOf('@') + 1);
  if ([...disposableEmailDomains].some(blocked => domain === blocked || domain.endsWith(`.${blocked}`))) {
    return 'Please use a permanent email address, not a temporary email service.';
  }
  return '';
}

export function getNameError(value) {
  const name = value.trim();
  if (
    !name
    || name.length > 200
    || !/\p{L}/u.test(name)
    || !/^[\p{L}\p{M} .'\u2019-]+$/u.test(name)
  ) return 'Enter a valid full name.';
  return '';
}

export function getPhoneError(value, callingCode) {
  const phone = value.trim();
  if (!phone) return '';
  if (!/^[0-9\s().-]+$/.test(phone)) return 'Enter a valid phone number.';

  const phoneDigitCount = (phone.match(/[0-9]/g) || []).length;
  const callingCodeDigitCount = (callingCode.match(/[0-9]/g) || []).length;
  if (phoneDigitCount < 4 || phoneDigitCount + callingCodeDigitCount > 15) {
    return 'Enter a valid phone number.';
  }
  return '';
}

function hasPrefix(bytes, prefix) {
  return prefix.every((byte, index) => bytes[index] === byte);
}

function containsAscii(bytes, value) {
  const expected = new TextEncoder().encode(value);
  return bytes.some((byte, index) =>
    byte === expected[0]
    && expected.every((character, characterIndex) => bytes[index + characterIndex] === character)
  );
}

function hasWordDocumentEntries(bytes) {
  const endRecordSignature = 0x06054b50;
  const centralEntrySignature = 0x02014b50;
  const minimumEndOffset = Math.max(0, bytes.length - 22 - 65535);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let endOffset = -1;

  for (let offset = bytes.length - 22; offset >= minimumEndOffset; offset -= 1) {
    if (view.getUint32(offset, true) === endRecordSignature) {
      endOffset = offset;
      break;
    }
  }
  if (
    endOffset < 0
    || view.getUint16(endOffset + 4, true) !== 0
    || view.getUint16(endOffset + 6, true) !== 0
    || view.getUint16(endOffset + 8, true) !== view.getUint16(endOffset + 10, true)
    || view.getUint16(endOffset + 20, true) !== bytes.length - endOffset - 22
  ) {
    return false;
  }

  const entryCount = view.getUint16(endOffset + 10, true);
  const centralDirectorySize = view.getUint32(endOffset + 12, true);
  const centralDirectoryOffset = view.getUint32(endOffset + 16, true);
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  if (
    entryCount === 0
    || entryCount === 0xffff
    || centralDirectoryEnd > endOffset
    || centralDirectoryOffset >= bytes.length
  ) return false;

  const decoder = new TextDecoder();
  const requiredEntries = new Set(['[Content_Types].xml', 'word/document.xml']);
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > centralDirectoryEnd || view.getUint32(offset, true) !== centralEntrySignature) return false;
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const entryEnd = offset + 46 + fileNameLength + extraLength + commentLength;
    if (entryEnd > centralDirectoryEnd) return false;

    const fileName = decoder.decode(bytes.subarray(offset + 46, offset + 46 + fileNameLength));
    requiredEntries.delete(fileName);
    offset = entryEnd;
  }

  return requiredEntries.size === 0;
}

export function hasValidDocumentContent(extension, bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) return false;

  switch (extension) {
    case 'pdf':
      return hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    case 'jpg':
    case 'jpeg':
      return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
    case 'png':
      return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'doc':
      return hasPrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
        && containsAscii(bytes, 'WordDocument');
    case 'docx':
      return hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04]) && hasWordDocumentEntries(bytes);
    default:
      return false;
  }
}
