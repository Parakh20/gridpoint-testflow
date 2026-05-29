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
  // GM / SUPERADMIN
  GMProjects: undefined;
  CreateProject: undefined;
  EditProject: { projectId: string; projectNumber: string };
  ScopeManagement: { projectId: string; projectNumber: string };
  TestingScope: { projectId: string; projectNumber: string };
  AssignSupervisor: { projectId: string; projectNumber: string };
  // GM / SUPERADMIN / SUPERVISOR
  EngineerAssignment: { projectId: string; projectNumber: string };
  // SUPERADMIN only
  UserManagement: undefined;
  CreateUser: undefined;
  UserDetail: { userId: string; userName: string };
  // Supervisor
  SupervisorHome: undefined;
  // Shared (GM + Supervisor + SUPERADMIN)
  ProjectOverview: {
    projectId: string;
    projectNumber: string;
    siteName: string;
  };
  // Platform admin
  PlatformLogin: undefined;
  PlatformDashboard: undefined;
};
