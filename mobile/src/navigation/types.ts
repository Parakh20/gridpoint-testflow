export type RootStackParamList = {
  Login: undefined;
  Profile: undefined;
  // Engineer
  Projects: undefined;
  Tasks: { projectId: string; projectNumber: string };
  EquipmentDetail: {
    instanceId: string;
    instanceLabel: string;
    equipmentType: string;
    projectId: string;
  };
  TestForm: {
    taskId: string;
    templateId: string;
    instanceLabel: string;
    testName: string;
    currentStatus: string;
  };
  // GM
  GMProjects: undefined;
  // Supervisor
  SupervisorHome: undefined;
  // Shared (GM + Supervisor)
  ProjectOverview: {
    projectId: string;
    projectNumber: string;
    siteName: string;
  };
  // Platform admin
  PlatformLogin: undefined;
  PlatformDashboard: undefined;
};
