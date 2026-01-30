import React from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import NewAnalysis from './NewAnalysis';

export default function NewAnalysisProtected() {
  return (
    <RequireAuth>
      <NewAnalysis />
    </RequireAuth>
  );
}