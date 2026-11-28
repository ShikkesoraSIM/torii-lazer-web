import React from 'react';
import { useTranslation } from 'react-i18next';

const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen torii-page-stage">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="rounded-3xl border border-white/10 bg-card shadow-elev-2 p-6 sm:p-10 md:p-12">
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-8 text-center">
            {t('common.privacyPolicy')}
          </h1>
          
          <div className="max-w-none text-text-secondary leading-relaxed">
            <section className="mb-8">
              <h2 className="font-heading text-xl sm:text-2xl font-semibold text-text-primary mb-4">
                {t('privacy.dataCollection.title')}
              </h2>
              <p className="mb-4">
                {t('privacy.dataCollection.description')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-heading text-xl sm:text-2xl font-semibold text-text-primary mb-4">
                {t('privacy.microsoftClarity.title')}
              </h2>
              <p className="mb-4">
                {t('privacy.microsoftClarity.description')}
              </p>
              <div className="bg-torii/10 border-l-4 border-torii p-4 rounded-r-xl mb-4">
                <h3 className="text-base sm:text-lg font-medium text-sky-300 mb-2">
                  {t('privacy.microsoftClarity.whatWeCollect.title')}
                </h3>
                <ul className="list-disc list-inside text-text-secondary space-y-1">
                  <li>{t('privacy.microsoftClarity.whatWeCollect.interactions')}</li>
                  <li>{t('privacy.microsoftClarity.whatWeCollect.pageViews')}</li>
                  <li>{t('privacy.microsoftClarity.whatWeCollect.clickData')}</li>
                  <li>{t('privacy.microsoftClarity.whatWeCollect.scrollBehavior')}</li>
                  <li>{t('privacy.microsoftClarity.whatWeCollect.deviceInfo')}</li>
                </ul>
              </div>
              <p className="mb-4">
                {t('privacy.microsoftClarity.purpose')}
              </p>
              <p className="mb-4">
                <strong className="text-text-primary">{t('privacy.microsoftClarity.optOut.title')}</strong> {t('privacy.microsoftClarity.optOut.description')}
              </p>
              <p>
                {t('privacy.microsoftClarity.learnMore')}{' '}
                <a 
                  href="https://privacy.microsoft.com/privacystatement" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-torii hover:underline"
                >
                  {t('privacy.microsoftClarity.privacyStatement')}
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-heading text-xl sm:text-2xl font-semibold text-text-primary mb-4">
                {t('privacy.userData.title')}
              </h2>
              <p className="mb-4">
                {t('privacy.userData.description')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-heading text-xl sm:text-2xl font-semibold text-text-primary mb-4">
                {t('privacy.dataSecurity.title')}
              </h2>
              <p className="mb-4">
                {t('privacy.dataSecurity.description')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-heading text-xl sm:text-2xl font-semibold text-text-primary mb-4">
                {t('privacy.yourRights.title')}
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t('privacy.yourRights.access')}</li>
                <li>{t('privacy.yourRights.correction')}</li>
                <li>{t('privacy.yourRights.deletion')}</li>
                <li>{t('privacy.yourRights.portability')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="font-heading text-xl sm:text-2xl font-semibold text-text-primary mb-4">
                {t('privacy.contact.title')}
              </h2>
              <p>
                {t('privacy.contact.description')}
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl sm:text-2xl font-semibold text-text-primary mb-4">
                {t('privacy.updates.title')}
              </h2>
              <p>
                {t('privacy.updates.description')}
              </p>
              <p className="text-sm text-text-muted mt-4">
                {t('privacy.lastUpdated')}: <time dateTime="2025-10-01">October 1, 2025</time>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
