import useNetworkErrorStore from '../stores/networkErrorStore';

export const setGlobalNetworkError = (isError: boolean) => {
  useNetworkErrorStore.getState().setNetworkError(isError);
};
