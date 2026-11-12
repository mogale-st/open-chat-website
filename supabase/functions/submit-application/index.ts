import {
  getEmailError,
  getNameError,
  getPhoneError,
  hasValidDocumentContent
} from '../_shared/validation.js';

const bucket = 'application-documents';
const maxFileSize = 5 * 1024 * 1024;
const maxRequestSize = 11 * 1024 * 1024;
const rateLimitCount = 5;
const rateLimitWindowSeconds = 60 * 60;
const allowedFiles = {
  id: {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png'
  },
  cv: {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
};

type ValidatedDocument = {
  extension: string;
  contentType: string;
};

function getConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/+$/, '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY');
  const rateLimitSecret = Deno.env.get('RATE_LIMIT_SECRET');
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (
    Deno.env.get('APPLICATIONS_ENABLED') !== 'true'
    || Deno.env.get('OPERATOR_DETAILS_CONFIRMED') !== 'true'
    || Deno.env.get('LEGAL_REVIEW_CONFIRMED') !== 'true'
    || Deno.env.get('DATA_REGION_CONFIRMED') !== 'true'
    || !supabaseUrl
    || !serviceRoleKey
    || !turnstileSecret
    || !rateLimitSecret
    || rateLimitSecret.length < 32
    || allowedOrigins.length === 0
  ) return null;

  return {
    supabaseUrl,
    serviceRoleKey,
    turnstileSecret,
    rateLimitSecret,
    allowedOrigins
  };
}

function jsonResponse(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      'Vary': 'Origin'
    }
  });
}

function textValue(data: FormData, key: string, maxLength: number) {
  const value = data.get(key);
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : '';
}

async function validateDocument(file: File, allowed: Record<string, string>): Promise<ValidatedDocument | null> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const contentType = allowed[extension];
  if (!file.size || file.size > maxFileSize || !contentType) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  return hasValidDocumentContent(extension, bytes) ? { extension, contentType } : null;
}

function authHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  };
}

async function removeDocuments(config: NonNullable<ReturnType<typeof getConfig>>, paths: string[]) {
  if (!paths.length) return true;
  try {
    const response = await fetch(`${config.supabaseUrl}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: {
        ...authHeaders(config.serviceRoleKey),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefixes: paths })
    });
    if (!response.ok) console.error('Application document cleanup failed:', response.status);
    return response.ok;
  } catch (error) {
    console.error('Application document cleanup request failed:', error);
    return false;
  }
}

async function rollbackSubmission(
  config: NonNullable<ReturnType<typeof getConfig>>,
  applicationUrl: string,
  applicationId: string,
  documentPaths: string[]
) {
  if (await removeDocuments(config, documentPaths)) {
    try {
      const deleteResponse = await fetch(`${applicationUrl}?id=eq.${applicationId}`, {
        method: 'DELETE',
        headers: { ...authHeaders(config.serviceRoleKey), Prefer: 'return=minimal' }
      });
      if (deleteResponse.ok) return;
      console.error('Failed application record deletion during rollback:', deleteResponse.status);
    } catch (error) {
      console.error('Application record deletion during rollback failed:', error);
    }
  }

  try {
    const updateResponse = await fetch(`${applicationUrl}?id=eq.${applicationId}`, {
      method: 'PATCH',
      headers: { ...authHeaders(config.serviceRoleKey), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'upload_failed' })
    });
    if (!updateResponse.ok) console.error('Failed to mark incomplete application for cleanup:', updateResponse.status);
  } catch (error) {
    console.error('Could not mark incomplete application for cleanup:', error);
  }
}

async function hashRateLimitEmail(email: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const normalizedEmail = email.trim().toLowerCase();
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(normalizedEmail)));
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function consumeRateLimit(config: NonNullable<ReturnType<typeof getConfig>>, rateLimitKey: string) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/consume_application_rate_limit`, {
    method: 'POST',
    headers: {
      ...authHeaders(config.serviceRoleKey),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_client_key: rateLimitKey,
      p_limit: rateLimitCount,
      p_window_seconds: rateLimitWindowSeconds
    })
  });
  if (!response.ok) {
    console.error('Application rate limit check failed:', response.status);
    return null;
  }
  const result = await response.json();
  if (typeof result !== 'boolean') {
    console.error('Application rate limit service returned an unexpected response.');
    return null;
  }
  return result;
}

class RequestTooLargeError extends Error {}

async function readFormData(request: Request) {
  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength) || Number(contentLength) > maxRequestSize) {
      throw new RequestTooLargeError();
    }
  }

  const contentType = request.headers.get('content-type');
  if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) {
    throw new Error('Expected multipart form data.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request body.');

  const chunks: Uint8Array[] = [];
  let totalSize = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalSize += value.byteLength;
    if (totalSize > maxRequestSize) {
      try {
        await reader.cancel();
      } catch (error) {
        console.error('Could not cancel oversized application request body:', error);
      }
      throw new RequestTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(body, { headers: { 'Content-Type': contentType } }).formData();
}

async function verifyTurnstile(token: string, secret: string, origin: string) {
  const body = new URLSearchParams({ secret, response: token });

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!response.ok) {
      console.error('Turnstile verification request failed:', response.status);
      return false;
    }
    const result = await response.json();
    return result.success === true && result.hostname === new URL(origin).hostname;
  } catch (error) {
    console.error('Turnstile verification service request failed:', error);
    return false;
  }
}

Deno.serve(async request => {
  const config = getConfig();
  const origin = request.headers.get('origin') || '';

  if (!config) return new Response('Application intake is not configured.', { status: 503 });
  if (!config.allowedOrigins.includes(origin)) return new Response('Origin not allowed.', { status: 403 });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Vary': 'Origin'
  } });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, origin);

  let data: FormData;
  try {
    data = await readFormData(request);
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return jsonResponse({ error: 'The submitted files exceed the allowed size.' }, 413, origin);
    }
    console.error('Application form parsing failed:', error);
    return jsonResponse({ error: 'The application form could not be read.' }, 400, origin);
  }

  const fullName = textValue(data, 'fullName', 200);
  const email = textValue(data, 'email', 254).toLowerCase();
  const countryCode = textValue(data, 'country', 2).toUpperCase();
  const phoneCountryCallingCode = textValue(data, 'phoneCountryCallingCode', 4);
  const phone = textValue(data, 'phone', 40);
  const whatsapp = textValue(data, 'whatsapp', 40);
  const idFile = data.get('idFile');
  const cvEntry = data.get('cvFile');
  const cvFile = cvEntry instanceof File && cvEntry.name ? cvEntry : null;
  const turnstileToken = textValue(data, 'cf-turnstile-response', 4096);

  if (
    getNameError(fullName)
    || !/^[A-Z]{2}$/.test(countryCode)
    || !/^\+[1-9][0-9]{0,2}$/.test(phoneCountryCallingCode)
    || getPhoneError(phone, phoneCountryCallingCode)
    || getPhoneError(whatsapp, phoneCountryCallingCode)
    || getEmailError(email)
  ) {
    return jsonResponse({ error: 'Check your name, email address, and country, then try again.' }, 400, origin);
  }
  if (data.get('age') !== 'yes' || data.get('adult') !== 'on' || data.get('consent') !== 'on') {
    return jsonResponse({ error: 'Confirm the required age and consent statements to continue.' }, 400, origin);
  }
  if (!(idFile instanceof File)) {
    return jsonResponse({ error: 'Upload a valid PDF, JPG, or PNG ID document up to 5 MB.' }, 400, origin);
  }
  if (cvEntry && !(cvEntry instanceof File)) {
    return jsonResponse({ error: 'The CV file could not be read.' }, 400, origin);
  }
  if (!turnstileToken || !await verifyTurnstile(turnstileToken, config.turnstileSecret, origin)) {
    return jsonResponse({ error: 'Verification failed. Please complete the verification and try again.' }, 400, origin);
  }

  let rateLimitKey: string;
  try {
    rateLimitKey = await hashRateLimitEmail(email, config.rateLimitSecret);
  } catch (error) {
    console.error('Could not create application email rate limit key:', error);
    return jsonResponse({ error: 'Applications are temporarily unavailable. Please try again later.' }, 503, origin);
  }
  let rateLimitAllowed: boolean | null;
  try {
    rateLimitAllowed = await consumeRateLimit(config, rateLimitKey);
  } catch (error) {
    console.error('Application rate limit service request failed:', error);
    return jsonResponse({ error: 'Applications are temporarily unavailable. Please try again later.' }, 503, origin);
  }
  if (rateLimitAllowed === null) {
    return jsonResponse({ error: 'Applications are temporarily unavailable. Please try again later.' }, 503, origin);
  }
  if (!rateLimitAllowed) {
    return jsonResponse({ error: 'Too many attempts. Please try again in about an hour.' }, 429, origin);
  }

  let idDocument: ValidatedDocument | null;
  let cvDocument: ValidatedDocument | null = null;
  try {
    idDocument = await validateDocument(idFile, allowedFiles.id);
    if (cvFile) cvDocument = await validateDocument(cvFile, allowedFiles.cv);
  } catch (error) {
    console.error('Application document validation failed:', error);
    return jsonResponse({ error: 'The uploaded document could not be verified.' }, 400, origin);
  }
  if (!idDocument) {
    return jsonResponse({ error: 'Upload a valid PDF, JPG, or PNG ID document up to 5 MB.' }, 400, origin);
  }
  if (cvFile && !cvDocument) {
    return jsonResponse({ error: 'Upload a valid PDF or Word CV up to 5 MB.' }, 400, origin);
  }

  const applicationId = crypto.randomUUID();
  const idDocumentPath = `${applicationId}/id.${idDocument.extension}`;
  const cvDocumentPath = cvFile && cvDocument
    ? `${applicationId}/cv.${cvDocument.extension}`
    : null;
  const documentPaths = [idDocumentPath, cvDocumentPath].filter((path): path is string => Boolean(path));
  const headers = authHeaders(config.serviceRoleKey);
  const applicationUrl = `${config.supabaseUrl}/rest/v1/applications`;

  let insertResponse: Response;
  try {
    insertResponse = await fetch(applicationUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: applicationId,
        status: 'pending',
        full_name: fullName,
        email,
        country_code: countryCode,
        phone_country_calling_code: phoneCountryCallingCode,
        phone: phone || null,
        whatsapp: whatsapp || null,
        age_confirmed: true,
        adult_work_acknowledged: true,
        contact_consent: true,
        id_document_path: idDocumentPath,
        cv_document_path: cvDocumentPath
      })
    });
  } catch (error) {
    console.error('Application record creation request failed:', error);
    return jsonResponse({ error: 'We could not submit your application securely. Please try again later.' }, 502, origin);
  }

  if (!insertResponse.ok) {
    console.error('Application record creation failed:', insertResponse.status);
    return jsonResponse({ error: 'We could not submit your application securely. Please try again later.' }, 500, origin);
  }

  const upload = (file: File, path: string, contentType: string) => fetch(
    `${config.supabaseUrl}/storage/v1/object/${bucket}/${path}`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': contentType, 'x-upsert': 'false' },
      body: file
    }
  );

  let uploadFailed = false;
  const filesToUpload: Array<[File, string, string]> = [[idFile, idDocumentPath, idDocument.contentType]];
  if (cvFile && cvDocumentPath && cvDocument) {
    filesToUpload.push([cvFile, cvDocumentPath, cvDocument.contentType]);
  }
  for (const [file, path, contentType] of filesToUpload) {
    try {
      const response = await upload(file, path, contentType);
      if (response.ok) continue;
      console.error('Application document upload failed:', response.status);
      uploadFailed = true;
      break;
    } catch (error) {
      console.error('Application document upload request failed:', error);
      uploadFailed = true;
      break;
    }
  }

  if (uploadFailed) {
    await rollbackSubmission(config, applicationUrl, applicationId, documentPaths);
    return jsonResponse({ error: 'We could not store your documents securely. Please try again later.' }, 502, origin);
  }

  let updateSucceeded = false;
  try {
    const updateResponse = await fetch(`${applicationUrl}?id=eq.${applicationId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'submitted' })
    });
    updateSucceeded = updateResponse.ok;
    if (!updateSucceeded) console.error('Application status update failed:', updateResponse.status);
  } catch (error) {
    console.error('Application status update request failed:', error);
  }
  if (!updateSucceeded) {
    await rollbackSubmission(config, applicationUrl, applicationId, documentPaths);
    return jsonResponse({ error: 'We could not complete your submission securely. Please try again later.' }, 502, origin);
  }

  return jsonResponse({ ok: true }, 201, origin);
});
