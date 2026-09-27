type PublicProjectPreview = {
  id: string;
  name: string;
  code?: string;
  province?: string;
  city?: string;
  farmOperation?: string;
};

export function buildReportIssuePath(projectId: string) {
  return `/report-issue/new?projectId=${encodeURIComponent(projectId)}`;
}

export function projectPreviewToSelectedProject(project: PublicProjectPreview) {
  return {
    id: project.id,
    name: project.name,
    sourceId: project.id,
    sourceProjectId: project.code,
    province: project.province,
    municipality: project.city,
    farmOperation: project.farmOperation,
  };
}
