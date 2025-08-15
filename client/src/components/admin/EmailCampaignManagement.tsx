import React, { useState } from 'react';
import { EmailCampaignList } from './EmailCampaignList';
import { EmailComposer } from './EmailComposer';
import { EmailCampaignAnalytics } from './EmailCampaignAnalytics';

type EmailCampaignView = 'list' | 'compose' | 'analytics';

interface EmailCampaign {
  id: number;
  name: string;
  subject: string;
  content: string;
  htmlContent?: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdBy: string;
  createdAt: string;
  sentAt?: string;
}

export function EmailCampaignManagement() {
  const [currentView, setCurrentView] = useState<EmailCampaignView>('list');
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | undefined>(undefined);

  const handleCreateNew = () => {
    setSelectedCampaign(undefined);
    setCurrentView('compose');
  };

  const handleEdit = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setCurrentView('compose');
  };

  const handleViewAnalytics = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setCurrentView('analytics');
  };

  const handleBack = () => {
    setSelectedCampaign(undefined);
    setCurrentView('list');
  };

  const handleSaved = () => {
    setSelectedCampaign(undefined);
    setCurrentView('list');
  };

  switch (currentView) {
    case 'compose':
      return (
        <EmailComposer
          campaign={selectedCampaign}
          onBack={handleBack}
          onSaved={handleSaved}
        />
      );
    case 'analytics':
      return selectedCampaign ? (
        <EmailCampaignAnalytics
          campaign={selectedCampaign}
          onBack={handleBack}
        />
      ) : (
        <EmailCampaignList
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onViewAnalytics={handleViewAnalytics}
        />
      );
    default:
      return (
        <EmailCampaignList
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onViewAnalytics={handleViewAnalytics}
        />
      );
  }
}