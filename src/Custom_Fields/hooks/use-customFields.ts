import { useContext } from 'react';
import { CustomFieldsContext } from '../Context';

// Create a custom hook to use the context
export const useCustomFields = () => {
  const context = useContext(CustomFieldsContext);
  if (context === undefined) {
    throw new Error(
      'useCustomFields must be used within a CustomFieldsProvider',
    );
  }
  return context;
};
