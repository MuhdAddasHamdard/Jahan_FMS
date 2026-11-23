export const showMutationFeedback = (toast, result, successMessage) => {
  if (result?.queued) {
    toast.info("Saved on this device. It will sync when the server is reachable.");
    return false;
  }
  toast.success(successMessage);
  return true;
};
