//
export interface JobApplicationRecord {
  id: number;
  user_id: string;
  job_id: string;
  title: string;
  company: string;
  location?: string;
  source?: string;
  application_url?: string;
  applied_at: string;
  created_at: string;
  updated_at: string;
}

//
export interface RecordJobApplicationRequest {
  job_id: string;
  title: string;
  company: string;
  location?: string;
  source?: string;
  application_url?: string;
}
