/**
 * Job Details Service
 * Handles fetching detailed job information from Reed API
 */

import { Job, JobSearchError } from '@/types/job';
import { supabase } from '@/lib/supabase';

const REED_API_BASE = 'https://www.reed.co.uk/api';

/**
 * Reads the local Reed API key for development builds only.
 */
function getLocalDevelopmentReedApiKey() {
  return __DEV__ ? process.env.EXPO_PUBLIC_REED_API_KEY?.trim() ?? '' : '';
}

/**
 * Converts a Reed API response to the app's job shape.
 */
function transformReedJob(job: any): Job {
  let jobType: Job['job_type'] = 'Full-time';
  const reedJobType = job?.jobType?.toLowerCase() ?? '';
  if (reedJobType.includes('part')) jobType = 'Part-time';
  else if (reedJobType.includes('temp')) jobType = 'Temporary';
  else if (reedJobType.includes('contract')) jobType = 'Contract';
  else if (reedJobType.includes('freelance')) jobType = 'Freelance';
  else if (reedJobType.includes('internship')) jobType = 'Internship';

  let contractType: Job['contract_type'] | undefined;
  const reedContractType = job?.contractType?.toLowerCase() ?? '';
  if (reedContractType.includes('permanent')) contractType = 'Permanent';
  else if (reedContractType.includes('temp')) contractType = 'Temporary';
  else if (reedContractType.includes('contract')) contractType = 'Contract';

  return {
    id: job?.jobId?.toString() || '',
    title: job?.jobTitle || '',
    company: job?.employerName || '',
    description: job?.jobDescription || '',
    location: job?.locationName || '',
    postcode: job?.postcode,
    latitude: job?.latitude,
    longitude: job?.longitude,
    salary_min: job?.minimumSalary,
    salary_max: job?.maximumSalary,
    salary_currency: job?.currency || 'GBP',
    job_type: jobType,
    contract_type: contractType,
    url: job?.jobUrl || '',
    posted_date: job?.datePosted || new Date().toISOString(),
    source: 'reed',
  };
}

class JobDetailsService {
  /**
   * Fetch detailed job information from Reed API
   */
  async getJobDetails(jobId: string | number): Promise<Job | null> {
    try {
      if (!jobId) {
        throw {
          message: 'Job ID is required',
          code: 'VALIDATION_ERROR',
        } as JobSearchError;
      }

      const localReedApiKey = getLocalDevelopmentReedApiKey();
      if (localReedApiKey) {
        const response = await fetch(`${REED_API_BASE}/1.0/jobs/${jobId}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Basic ${btoa(`:${localReedApiKey}`)}`,
          },
        });

        if (!response.ok) {
          const details = await response.text();
          throw {
            message: `Failed to fetch job details: ${response.status}`,
            code: 'API_ERROR',
            details,
          } as JobSearchError;
        }

        return transformReedJob(await response.json());
      }

      const { data, error } = await supabase.functions.invoke('reed-job-details', {
        body: { jobId },
      });

      if (error) {
        throw {
          message: error.message || 'Failed to fetch job details',
          code: 'API_ERROR',
          details: String(error),
        } as JobSearchError;
      }

      if (!data?.job) {
        throw {
          message: 'Job not found',
          code: 'VALIDATION_ERROR',
          details: `No job found with ID: ${jobId}`,
        } as JobSearchError;
      }

      return data.job as Job;
    } catch (error) {
      console.error('Job details fetch error:', error);
      throw error;
    }
  }

}

export default new JobDetailsService();
