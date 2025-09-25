import React from 'react';
import { useTranslations } from '../hooks/useTranslations';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeatureSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="py-6 border-b border-white/10 last:border-b-0">
    <h3 className="text-xl font-bold text-amber-400 mb-3">{title}</h3>
    <div className="space-y-3 text-gray-300 text-base leading-relaxed">
      {children}
    </div>
  </div>
);

function KnowledgeBaseModal({ isOpen, onClose }: KnowledgeBaseModalProps) {
  const { t } = useTranslations();

  if (!isOpen) {
    return null;
  }
  
  // Helper to render HTML content safely
  const renderHTML = (key: string) => <p dangerouslySetInnerHTML={{ __html: t(key) }}></p>;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-950/80 border border-white/10 rounded-2xl w-full max-w-4xl h-[90vh] mx-4 flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-3xl font-bold text-white">
            <span className="text-cyan-400">VOX</span> {t('knowledgeBase')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200"
            title={t('kbClose')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-8 no-scrollbar">
          <FeatureSection title={t('kbPrimaryActions')}>
            {renderHTML('kbPrimaryActionsDesc1')}
            {renderHTML('kbPrimaryActionsDesc2')}
          </FeatureSection>
          
          <FeatureSection title={t('kbVideoGeneration')}>
            {renderHTML('kbVideoGenerationDesc1')}
          </FeatureSection>
          
          <FeatureSection title={t('kbInpaintingTitle')}>
            {renderHTML('kbInpaintingDesc')}
          </FeatureSection>

          <FeatureSection title={t('kbCreativeTools')}>
            {renderHTML('kbCreativeToolsDesc1')}
            {renderHTML('kbCreativeToolsDesc2')}
            {renderHTML('kbCreativeToolsDesc3')}
            {renderHTML('kbCreativeToolsDesc4')}
            {renderHTML('kbGenerative360ViewDesc')}
          </FeatureSection>

          <FeatureSection title={t('kbResourcesTitle')}>
            {renderHTML('kbResourcesDescVXPL')}
          </FeatureSection>

          <FeatureSection title={t('kbWorkflowTitle')}>
            {renderHTML('kbWorkflowDescHistory')}
            {renderHTML('kbWorkflowDescUpload')}
            {renderHTML('kbWorkflowDescUndoRedo')}
            {renderHTML('kbWorkflowDescAutoSave')}
            {renderHTML('kbWorkflowDescPromptEditor')}
            {renderHTML('kbWorkflowDescResolution')}
            {renderHTML('kbWorkflowDescLanguage')}
            {renderHTML('kbWorkflowDescNewVision')}
            {renderHTML('kbWorkflowDescDownload')}
            {renderHTML('kbWorkflowDescKB')}
          </FeatureSection>

          <FeatureSection title={t('kbFineTuningTitle')}>
            {renderHTML('kbVxogDesc')}
            {renderHTML('kbFineTuningDescSmartTools')}
            {renderHTML('kbFineTuningDescNegative')}
            {renderHTML('kbFineTuningDescIntensity')}
            {renderHTML('kbFineTuningDescStyles')}
            {renderHTML('kbFineTuningDescPersistence')}
          </FeatureSection>

          <FeatureSection title={t('kbGenModel')}>
            <p>{t('kbGenModelDesc')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('kbGenModelListItem1')}</li>
              <li>{t('kbGenModelListItem2')}</li>
              <li>{t('kbGenModelListItem3')}</li>
            </ul>
             <p className="mt-2">{t('kbGenModelNote')}</p>
          </FeatureSection>
        </div>
      </div>
    </div>
  );
}

export default KnowledgeBaseModal;
