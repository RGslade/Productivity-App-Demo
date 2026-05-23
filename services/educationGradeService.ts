import databaseService from '@/services/databaseService';
import { userService } from '@/services/userService';
import { CreateEducationGradeRequest, EducationGrade, UpdateEducationGradeRequest } from '@/types/educationGrade';

//
class EducationGradeService {
  async getGrades(): Promise<EducationGrade[]> {
    //
    const profile = await userService.getUserProfile();
    //
    const { data, error } = await databaseService.getAllWithFilter<EducationGrade>('EducationGrades', 'user_id', profile.id, 'date_achieved');
    //
    if (error) {
      console.error('educationGradeService.getGrades', error);
      throw new Error(error.message);
    }
    return data.sort((a, b) => {
      //
      if (!a.date_achieved && !b.date_achieved) return 0;
      //
      if (!a.date_achieved) return 1;
      //
      if (!b.date_achieved) return -1;
      return new Date(b.date_achieved).getTime() - new Date(a.date_achieved).getTime();
    });
  }

  async getGrade(id: number): Promise<EducationGrade | null> {
    //
    const profile = await userService.getUserProfile();
    //
    const { data, error } = await databaseService.getSingleGlobal<EducationGrade>('EducationGrades', 'id', id);
    //
    if (error) {
      console.error('educationGradeService.getGrade', error);
      throw new Error(error.message);
    }
    //
    if (!data?.id || data.user_id !== profile.id) return null;
    return data;
  }

  async createGrade(payload: CreateEducationGradeRequest): Promise<EducationGrade> {
    //
    const result = await databaseService.insertAndSelect<EducationGrade>('EducationGrades', payload);
    //
    if (result.error) {
      console.error('educationGradeService.createGrade', result.error);
      throw new Error(result.error.message);
    }
    return result.data;
  }

  async updateGrade(id: number, payload: UpdateEducationGradeRequest): Promise<EducationGrade> {
    //
    const profile = await userService.getUserProfile();
    //
    const { data, error } = await databaseService.updateTableGlobal<EducationGrade>('EducationGrades', payload, undefined, 'id', id);
    //
    if (error) {
      console.error('educationGradeService.updateGrade', error);
      throw new Error(error.message);
    }
    //
    if (data.user_id !== profile.id) throw new Error('Grade not found');
    return data;
  }

  async deleteGrade(id: number): Promise<void> {
    //
    const grade = await this.getGrade(id);
    //
    if (!grade) throw new Error('Grade not found');
    await databaseService.deleteFromTable('EducationGrades', 'id', id);
  }
}

//
export const educationGradeService = new EducationGradeService();
//
export default educationGradeService;
