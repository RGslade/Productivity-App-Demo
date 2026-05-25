type ReedJob = {
  jobId?: number;
  jobTitle?: string;
  employerName?: string;
  jobDescription?: string;
  locationName?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  minimumSalary?: number;
  maximumSalary?: number;
  currency?: string;
  jobType?: string;
  contractType?: string;
  datePosted?: string;
  jobUrl?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function transformReedJob(job: ReedJob) {
  let jobType = 'Full-time';
  const reedJobType = job.jobType?.toLowerCase() ?? '';
  if (reedJobType.includes('part')) jobType = 'Part-time';
  else if (reedJobType.includes('temp')) jobType = 'Temporary';
  else if (reedJobType.includes('contract')) jobType = 'Contract';
  else if (reedJobType.includes('freelance')) jobType = 'Freelance';
  else if (reedJobType.includes('internship')) jobType = 'Internship';

  let contractType: string | undefined;
  const reedContractType = job.contractType?.toLowerCase() ?? '';
  if (reedContractType.includes('permanent')) contractType = 'Permanent';
  else if (reedContractType.includes('temp')) contractType = 'Temporary';
  else if (reedContractType.includes('contract')) contractType = 'Contract';

  return {
    id: job.jobId?.toString() || '',
    title: job.jobTitle || '',
    company: job.employerName || '',
    description: job.jobDescription || '',
    location: job.locationName || '',
    postcode: job.postcode,
    latitude: job.latitude,
    longitude: job.longitude,
    salary_min: job.minimumSalary,
    salary_max: job.maximumSalary,
    salary_currency: job.currency || 'GBP',
    job_type: jobType,
    contract_type: contractType,
    url: job.jobUrl || '',
    posted_date: job.datePosted || new Date().toISOString(),
    source: 'reed',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json().catch(() => ({ jobId: null }));
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'JOB_ID_REQUIRED' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reedApiKey = Deno.env.get('REED_API_KEY')?.trim() ?? '';
    if (!reedApiKey) {
      return new Response(JSON.stringify({ error: 'REED_API_KEY_MISSING' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`https://www.reed.co.uk/api/1.0/jobs/${jobId}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${btoa(`:${reedApiKey}`)}`,
      },
    });

    if (!response.ok) {
      const details = await response.text();
      return new Response(JSON.stringify({ error: 'REED_API_ERROR', details }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const job = await response.json();
    return new Response(JSON.stringify({ job: transformReedJob(job) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'REED_JOB_DETAILS_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
