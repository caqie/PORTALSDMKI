import React from 'react';
import EvaluasiPPPKApp from './EvaluasiPPPK/EvaluasiPPPKApp';

/**
 * EvaluasiPPPKPage (Standalone Integrated Module)
 * Delegated to the dedicated EvaluasiPPPKApp standalone architecture.
 * Accessible directly at /EvaluasiPPPK with own login, layout, and role-based dashboards.
 */
export const EvaluasiPPPKPage: React.FC = () => {
  return <EvaluasiPPPKApp />;
};

export default EvaluasiPPPKPage;
