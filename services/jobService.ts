/**
 * Job Search Service
 * Handles job search functionality with Reed.co.uk API
 * Includes geographic filtering and distance calculations
 */

import { Job, JobSearchParams, ReedJob, JobSearchError } from '@/types/job';
import {Linking} from 'react-native';
//const REED_API_BASE = 'https://www.reed.co.uk/api/1.0';

// Commented: Indeed API (alternative, no longer used)
// const INDEED_API_BASE = 'https://api.indeed.com/v2';

class JobService {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in miles
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Search for jobs by redirecting to Indeed UK job search
   * Uses user's search filters to build the Indeed URL
   */
  async searchJobs(params: JobSearchParams): Promise<Job[]> {
    try {
      // Validate search parameters
      if (!params.description || params.description.trim().length === 0) {
        throw {
          message: 'Job description search term is required',
          code: 'VALIDATION_ERROR',
        } as JobSearchError;
      }

      if (!params.location) {
        throw {
          message: 'Location is required for job search',
          code: 'LOCATION_ERROR',
        } as JobSearchError;
      }

      // Build Indeed URL with user's search parameters
      const jobQuery = encodeURIComponent(params.description.trim().replace(' ', '+'));
      const locationQuery = encodeURIComponent(params.location.postcode);
      const indeedUrl = `https://uk.indeed.com/jobs?q=${jobQuery}&l=${locationQuery}&radius=${params.distance_miles || 5}`;

      // Navigate to Indeed job search
      await Linking.openURL(indeedUrl);

      // Return empty array since we're redirecting to Indeed
      return [];

      // Build Reed API request
    //   const searchQuery = encodeURIComponent(params.description.replace(' ', '%20'));
    //   const locationStr = params.location.address.split(' ')?.[0] || '';

    //   const reedUrl = `${REED_API_BASE}/search?keywords=${searchQuery}&locationName=${encodeURIComponent(locationStr)}`;

    //   // Build Indeed URL with user's search parameters
    //   const jobQuery = encodeURIComponent(params.description.trim());
    //   const locationQuery = encodeURIComponent(params.location.address);
    //   const indeedUrl = `https://uk.indeed.com/jobs?q=${jobQuery}&l=${locationQuery}`;


    //   // const response = await fetch(reedUrl, {
    //   //   method: 'GET',
    //   //   headers: {
    //   //     'Accept': 'application/json',
    //   //     'Authorization': `Basic ${REED_API_KEY}`,
    //   //   },
    //   // });

    //   if (!response.ok) {
    //     const errorText = await response.text();
    //     console.error('Reed API error:', response.status, errorText);
    //     throw {
    //       message: `Reed API error: ${response.status}`,
    //       code: 'API_ERROR',
    //       details: errorText,
    //     } as JobSearchError;
    //   }

    //   const data = await response.json();
    //   const reedJobs: ReedJob[] = data.results || [];

    //   // Transform and filter jobs
    //   const transformedJobs = reedJobs
    //     .map((job) => this.transformReedJob(job))
    //     .filter((job): job is Job => {
    //       if (!job) return false;

    //       // Calculate distance if coordinates are available
    //       if (job.latitude && job.longitude) {
    //         const distance = this.calculateDistance(
    //           params.location.latitude,
    //           params.location.longitude,
    //           job.latitude,
    //           job.longitude,
    //         );
    //         job.distance_miles = distance;

    //         // Apply distance filter
    //         if (params.distance_miles && distance > params.distance_miles) {
    //           return false;
    //         }
    //       }

    //       return true;
    //     });

    //   // Sort by distance if available
    //   transformedJobs.sort((a, b) => {
    //     if (a.distance_miles && b.distance_miles) {
    //       return a.distance_miles - b.distance_miles;
    //     }
    //     return 0;
    //   });

    //   return transformedJobs;
    } catch (error) {
      console.error('Job search error:', error);
      throw error;
    }
  }

  /**
   * Transform Reed API response to internal Job format
   */
  private transformReedJob(job: ReedJob): Job | null {
    try {
      const id = job.jobId?.toString() || '';
      const title = job.jobTitle || '';
      const company = job.employerName || '';
      const description = job.jobDescription || '';
      const location = job.locationName || '';
      const url = job.jobUrl || '';
      const postedDate = job.datePosted || new Date().toISOString();

      if (!id || !title || !company || !location) {
        return null; // Skip incomplete jobs
      }

      // Extract salary information
      let salary_min: number | undefined;
      let salary_max: number | undefined;
      let salary_currency = 'GBP';

      if (job.minimumSalary) {
        salary_min = job.minimumSalary;
      }
      if (job.maximumSalary) {
        salary_max = job.maximumSalary;
      }

      // Extract job type
      let job_type: Job['job_type'] = 'Full-time';
      if (job.jobType) {
        const type = job.jobType.toLowerCase();
        if (type.includes('part')) job_type = 'Part-time';
        else if (type.includes('temp')) job_type = 'Temporary';
        else if (type.includes('contract')) job_type = 'Contract';
        else if (type.includes('freelance')) job_type = 'Freelance';
        else if (type.includes('internship')) job_type = 'Internship';
      }

      // Extract contract type
      let contract_type: Job['contract_type'] | undefined;
      if (job.contractType) {
        const ctype = job.contractType.toLowerCase();
        if (ctype.includes('permanent')) contract_type = 'Permanent';
        else if (ctype.includes('temp')) contract_type = 'Temporary';
        else if (ctype.includes('contract')) contract_type = 'Contract';
      }

      // Get latitude/longitude from location (Reed API doesn't always provide)
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (job.latitude && job.longitude) {
        latitude = job.latitude;
        longitude = job.longitude;
      }

      const transformedJob: Job = {
        id,
        title,
        company,
        description,
        location,
        postcode: job.postcode,
        latitude,
        longitude,
        salary_min,
        salary_max,
        salary_currency,
        job_type,
        contract_type,
        url,
        posted_date: postedDate,
        source: 'reed',
      };

      return transformedJob;
    } catch (error) {
      console.error('Error transforming Reed job:', error);
      return null;
    }
  }

  /**
   * COMMENTED OUT: Indeed API Integration
   * Was the primary job search method, now using Reed API instead
   *
   * async searchJobsIndeed(params: JobSearchParams): Promise<Job[]> {
   *   // Previous Indeed implementation removed in favor of Reed API
   * }
   */
}

export default new JobService();
