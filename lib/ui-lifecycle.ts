export function shouldRunOtpTimer(success: boolean) {
  return !success;
}

type FeedbackTargetPageInput = {
  currentPage: number;
  totalPages: number;
  highlightedIndex: number;
  itemsPerPage: number;
};

export function getFeedbackTargetPage({
  currentPage,
  totalPages,
  highlightedIndex,
  itemsPerPage,
}: FeedbackTargetPageInput) {
  if (highlightedIndex >= 0) {
    return Math.floor(highlightedIndex / itemsPerPage) + 1;
  }

  return Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
}

export type ProjectPreviewRequestState<T> = {
  projectId: string;
  project: T | null;
};

type ProjectPreviewViewInput<T> = {
  open: boolean;
  projectId: string | null;
  requestState: ProjectPreviewRequestState<T> | null;
};

export function getProjectPreviewView<T>({
  open,
  projectId,
  requestState,
}: ProjectPreviewViewInput<T>) {
  if (!open || !projectId) {
    return { project: null, loading: false };
  }

  if (!requestState || requestState.projectId !== projectId) {
    return { project: null, loading: true };
  }

  return { project: requestState.project, loading: false };
}
