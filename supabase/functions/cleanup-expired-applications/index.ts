const bucket = 'application-documents';
const batchSize = 200;

function authHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  };
}

function authorized(request: Request, secret: string) {
  const supplied = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  if (supplied.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= supplied.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/+$/, '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cronSecret = Deno.env.get('CRON_SECRET');
  const retentionDays = Number(Deno.env.get('ID_RETENTION_DAYS'));
  if (
    !supabaseUrl
    || !serviceRoleKey
    || !cronSecret
    || !Number.isInteger(retentionDays)
    || retentionDays < 1
    || retentionDays > 3650
  ) return new Response('Retention cleanup is not configured.', { status: 503 });
  if (!authorized(request, cronSecret)) return new Response('Unauthorized.', { status: 401 });

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const query = new URLSearchParams({
    select: 'id,id_document_path,cv_document_path',
    status: 'in.(pending,submitted,upload_failed)',
    created_at: `lt.${cutoff}`,
    order: 'created_at.asc',
    limit: String(batchSize)
  });
  const headers = authHeaders(serviceRoleKey);
  const applicationsResponse = await fetch(`${supabaseUrl}/rest/v1/applications?${query}`, { headers });
  if (!applicationsResponse.ok) {
    console.error('Expired application lookup failed:', applicationsResponse.status);
    return new Response('Could not find expired applications.', { status: 502 });
  }

  const applications = await applicationsResponse.json();
  if (!Array.isArray(applications)) return new Response('Unexpected cleanup query response.', { status: 502 });
  if (applications.length === 0) return Response.json({ deleted: 0 });

  const documentPaths = applications.flatMap(application =>
    [application.id_document_path, application.cv_document_path].filter((path): path is string => Boolean(path))
  );
  if (documentPaths.length) {
    const storageResponse = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: documentPaths })
    });
    if (!storageResponse.ok) {
      console.error('Expired application document deletion failed:', storageResponse.status);
      return new Response('Could not delete expired application documents.', { status: 502 });
    }
  }

  const ids = applications.map(application => application.id);
  const deleteQuery = new URLSearchParams({ id: `in.(${ids.join(',')})` });
  const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/applications?${deleteQuery}`, {
    method: 'DELETE',
    headers: { ...headers, Prefer: 'return=minimal' }
  });
  if (!deleteResponse.ok) {
    console.error('Expired application record deletion failed:', deleteResponse.status);
    return new Response('Could not delete expired application records.', { status: 502 });
  }

  return Response.json({ deleted: applications.length });
});
