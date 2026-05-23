import databaseService from '@/services/databaseService';
import { JobApplicationRecord, RecordJobApplicationRequest } from '@/types/jobApplication';

//
class JobApplicationService {
  async getRecentAppliedJobs(limit: number = 5): Promise<JobApplicationRecord[]> {
    //
    try {
      //
      const { data } = await databaseService.getAll<JobApplicationRecord>('JobApplications', 'applied_at');
      //
      const sorted = [...(data || [])].sort(
        (a, b) => new Date(b.applied_at || b.created_at).getTime() - new Date(a.applied_at || a.created_at).getTime()
      );
      return sorted.slice(0, Math.max(limit, 0));
    } catch (error) {
      console.error('jobApplicationService.getRecentAppliedJobs', error);
      return [];
    }
  }

  async recordAppliedJob(request: RecordJobApplicationRequest): Promise<JobApplicationRecord | null> {
    //
    try {
      //
      const { data, error } = await databaseService.insertAndSelect<JobApplicationRecord>('JobApplications', {
        ...request,
        applied_at: new Date().toISOString(),
      });

      //
      if (error) {
        console.error('jobApplicationService.recordAppliedJob', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('jobApplicationService.recordAppliedJob', error);
      return null;
    }
  }
}

//
export const jobApplicationService = new JobApplicationService();
//
export default jobApplicationService;
