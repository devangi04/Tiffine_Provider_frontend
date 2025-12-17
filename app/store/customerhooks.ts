// hooks/useCustomers.ts
import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  fetchCustomers, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer,
  setCurrentCustomer 
} from '../store/slices/customerslice';

export const useCustomers = () => {
  const dispatch = useAppDispatch();
  const { customers, currentCustomer, loading, error } = useAppSelector((state) => state.customer);

  const loadCustomers = useCallback((providerId: string) => {
    return dispatch(fetchCustomers(providerId)).unwrap();
  }, [dispatch]);

  const addCustomer = useCallback((customerData: any) => {
    return dispatch(createCustomer(customerData)).unwrap();
  }, [dispatch]);

  const editCustomer = useCallback((customer: any) => {
    dispatch(setCurrentCustomer(customer));
  }, [dispatch]);

  const saveCustomer = useCallback((id: string | undefined, customerData: any) => {
    if (id) {
      return dispatch(updateCustomer({ id, customerData })).unwrap();
    } else {
      return dispatch(createCustomer(customerData)).unwrap();
    }
  }, [dispatch]);

  const removeCustomer = useCallback((id: string) => {
    return dispatch(deleteCustomer(id)).unwrap();
  }, [dispatch]);

  const clearCurrentCustomer = useCallback(() => {
    dispatch(setCurrentCustomer(null));
  }, [dispatch]);

  return {
    customers,
    currentCustomer,
    loading,
    error,
    loadCustomers,
    addCustomer,
    editCustomer,
    saveCustomer,
    removeCustomer,
    clearCurrentCustomer,
  };
};