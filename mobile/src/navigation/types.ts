export type RootStackParamList = {
  Login: undefined;
  Projects: undefined;
  Profile: undefined;
  Tasks: { projectId: string; projectNumber: string };
  TestForm: {
    taskId: string;
    templateId: string;
    instanceLabel: string;
    testName: string;
    currentStatus: string;
  };
  PlatformLogin: undefined;
  PlatformDashboard: undefined;
};
