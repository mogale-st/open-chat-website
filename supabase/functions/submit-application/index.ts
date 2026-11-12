import { getEmailError } from '../_shared/validation.js';

const bucket = 'application-documents';
const maxFileSize = 5 * 1024 * 1024;
const allowedFiles = {
  id: {
    pdf: ['application/pdf'],
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    png: ['image/png']
  },
  cv: {
    pdf: ['application/pdf'],
    doc: ['application/msword'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  }
};

function getConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/+$/, '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY');
  const retentionDays = Number(Deno.env.get('ID_RETENTION_DAYS'));
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (
    Deno.env.get('APPLICATIONS_ENABLED') !== 'true'
    || Deno.env.get('OPERATOR_DETAILS_CONFIRMED') !== 'true'
    || Deno.env.get('LEGAL_REVIEW_CONFIRMED') !== 'true'
    || Deno.env.get('DATA_REGION_CONFIRMED') !== 'true'
    || Deno.env.get('RETENTION_CLEANUP_CONFIGURED') !== 'true'
    || !Number.isInteger(retentionDays)
    || retentionDays < 1
    || retentionDays > 3650
    || !supabaseUrl
    || !serviceRoleKey
    || !turnstileSecret
    || allowedOrigins.length === 0
  ) return null;

  return {
    supabaseUrl,
    serviceRoleKey,
    turnstileSecret,
    retentionDays,
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
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function getFileExtension(file: File, allowed: Record<string, string[]>) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return file.size > 0 && file.size <= maxFileSize && allowed[extension]?.includes(file.type)
    ? extension
    : null;
}

function authHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  };
}

async function removeDocuments(config: NonNullable<ReturnType<typeof getConfig>>, paths: string[]) {
  if (!paths.length) return true;
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
}

async function verifyTurnstile(token: string, secret: string, origin: string, request: Request) {
  const body = new URLSearchParams({ secret, response: token });
  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) body.set('remoteip', clientIp);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true && result.hostname === new URL(origin).hostname;
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

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 11 * 1024 * 1024) return jsonResponse({ error: 'The submitted files exceed the allowed size.' }, 413, origin);

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
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
    !fullName
    || !/^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/.test(fullName)
    || !/^[A-Z]{2}$/.test(countryCode)
    || !/^\+[1-9][0-9]{0,2}$/.test(phoneCountryCallingCode)
    || getEmailError(email)
  ) {
    return jsonResponse({ error: 'Check your name, email address, and country, then try again.' }, 400, origin);
  }
  if (data.get('age') !== 'yes' || data.get('adult') !== 'on' || data.get('consent') !== 'on') {
    return jsonResponse({ error: 'Confirm the required age and consent statements to continue.' }, 400, origin);
  }
  if (!(idFile instanceof File) || !getFileExtension(idFile, allowedFiles.id)) {
    return jsonResponse({ error: 'Upload a valid PDF, JPG, or PNG ID document up to 5 MB.' }, 400, origin);
  }
  if (cvEntry && !(cvEntry instanceof File)) {
    return jsonResponse({ error: 'The CV file could not be read.' }, 400, origin);
  }
  if (cvFile && !getFileExtension(cvFile, allowedFiles.cv)) {
    return jsonResponse({ error: 'Upload a valid PDF or Word CV up to 5 MB.' }, 400, origin);
  }
  if (!turnstileToken || !await verifyTurnstile(turnstileToken, config.turnstileSecret, origin, request)) {
    return jsonResponse({ error: 'Verification failed. Please complete the verification and try again.' }, 400, origin);
  }

  const applicationId = crypto.randomUUID();
  const idDocumentPath = `${applicationId}/id.${getFileExtension(idFile, allowedFiles.id)}`;
  const cvDocumentPath = cvFile
    ? `${applicationId}/cv.${getFileExtension(cvFile, allowedFiles.cv)}`
    : null;
  const documentPaths = [idDocumentPath, cvDocumentPath].filter((path): path is string => Boolean(path));
  const headers = authHeaders(config.serviceRoleKey);
  const applicationUrl = `${config.supabaseUrl}/rest/v1/applications`;

  const insertResponse = await fetch(applicationUrl, {
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

  if (!insertResponse.ok) {
    console.error('Application record creation failed:', insertResponse.status);
    return jsonResponse({ error: 'We could not submit your application securely. Please try again later.' }, 500, origin);
  }

  const upload = async (file: File, path: string) => fetch(
    `${config.supabaseUrl}/storage/v1/object/${bucket}/${path}`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': file.type, 'x-upsert': 'false' },
      body: file
    }
  );

  let uploadFailed = false;
  const filesToUpload: Array<[File, string]> = [[idFile, idDocumentPath]];
  if (cvFile && cvDocumentPath) filesToUpload.push([cvFile, cvDocumentPath]);
  for (const [file, path] of filesToUpload) {
    const response = await upload(file, path);
    if (!response.ok) {
      console.error('Application document upload failed:', response.status);
      uploadFailed = true;
      break;
    }
  }

  if (uploadFailed) {
    const documentsRemoved = await removeDocuments(config, documentPaths);
    if (documentsRemoved) {
      await fetch(`${applicationUrl}?id=eq.${applicationId}`, {
        method: 'DELETE',
        headers: { ...headers, Prefer: 'return=minimal' }
      });
    } else {
      await fetch(`${applicationUrl}?id=eq.${applicationId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'upload_failed' })
      });
    }
    return jsonResponse({ error: 'We could not store your documents securely. Please try again later.' }, 502, origin);
  }

  const updateResponse = await fetch(`${applicationUrl}?id=eq.${applicationId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'submitted' })
  });
  if (!updateResponse.ok) {
    console.error('Application status update failed:', updateResponse.status);
    const documentsRemoved = await removeDocuments(config, documentPaths);
    if (documentsRemoved) {
      await fetch(`${applicationUrl}?id=eq.${applicationId}`, {
        method: 'DELETE',
        headers: { ...headers, Prefer: 'return=minimal' }
      });
    }
    return jsonResponse({ error: 'We could not complete your submission securely. Please try again later.' }, 502, origin);
  }

  return jsonResponse({ ok: true }, 201, origin);
});
