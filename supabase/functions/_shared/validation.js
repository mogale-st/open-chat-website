const disposableEmailDomains = new Set([
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
