import databaseService from './databaseService';

export type DashboardCardKey =
  | 'tasks'
  | 'checklists'
  | 'finances'
  | 'news'
  | 'grades'
  | 'notes'
  | 'lifenest'
  | 'movingOut';

export type DashboardLayoutState = {
  order: DashboardCardKey[];
  hidden: DashboardCardKey[];
};

const DEFAULT_LAYOUT: DashboardLayoutState = {
  order: ['tasks', 'checklists', 'finances', 'news', 'grades', 'notes', 'lifenest', 'movingOut'],
  hidden: ['movingOut'],
};

class DashboardCustomizationService {
  /** Returns user dashboard customisation or creates a default row. */
  async getLayout(): Promise<DashboardLayoutState> {
    const { data } = await databaseService.getSingleOrCreate<{ layout_json?: DashboardLayoutState }>(
      'DashboardCustomizations',
    );

    const layout = data?.layout_json;
    if (!layout?.order || !Array.isArray(layout.order) || !Array.isArray(layout.hidden)) {
      return DEFAULT_LAYOUT;
    }

    const order = [...layout.order];
    DEFAULT_LAYOUT.order.forEach((key, index) => {
      if (!order.includes(key)) order.splice(index, 0, key);
    });

    return {
      order,
      hidden: layout.hidden.filter((key) => DEFAULT_LAYOUT.order.includes(key)),
    };
  }

  /** Persists user dashboard customisation JSON payload. */
  async saveLayout(layout: DashboardLayoutState): Promise<void> {
    await databaseService.updateTable('DashboardCustomizations', {
      layout_json: layout,
    });
  }

  /** Returns baseline layout for reset behaviour in the UI. */
  getDefaultLayout(): DashboardLayoutState {
    return DEFAULT_LAYOUT;
  }
}

export const dashboardCustomizationService = new DashboardCustomizationService();
export default dashboardCustomizationService;
