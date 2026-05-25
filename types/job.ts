/**
 * Job Search Feature Types
 * Handles job listings, search parameters, and location data
 */

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  job_type: 'Full-time' | 'Part-time' | 'Temporary' | 'Contract' | 'Freelance' | 'Internship';
  contract_type?: 'Permanent' | 'Temporary' | 'Contract';
  url: string;
  posted_date: string;
  company_logo?: string;
  distance_miles?: number;
  travel_time_minutes?: number;
  source: 'indeed' | 'reed';
}

export interface LocationData {
  latitude: number;
  longitude: number;
  postcode: string;
  address?: string;
}

export interface JobSearchParams {
  description: string;
  location: LocationData;
  distance_miles?: number;
  travel_time_minutes?: number;
  job_type?: Job['job_type'];
  contract_type?: Job['contract_type'];
  salary_min?: number;
  salary_max?: number;
}

export interface IndeedSearchResponse {
  jobs: Job[];
  total_count: number;
  has_more: boolean;
}

// Reed API specific type (before transformation to Job)
export interface ReedJob {
  jobId?: number;
  jobTitle?: string;
  employerName?: string;
  employerProfileId?: string;
  employerId?: number;
  jobDescription?: string;
  locationName?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  minimumSalary?: number;
  maximumSalary?: number;
  yearlyMinimumSalary?: number;
  yearlyMaximumSalary?: number;
  salary?: string;
  currency?: string;
  salaryType?: string; // per hour, per day, per week, per month, per annum
  jobType?: string; // Full Time / Part Time
  contractType?: string; // permanent, contract, temporary
  datePosted?: string;
  expirationDate?: string;
  jobUrl?: string;
  externalUrl?: string;
}

export interface JobSearchError {
  message: string;
  code: 'LOCATION_ERROR' | 'API_ERROR' | 'VALIDATION_ERROR' | 'PERMISSION_ERROR';
  details?: string;
}
