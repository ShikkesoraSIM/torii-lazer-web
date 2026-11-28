import React from 'react';
import { Link } from 'react-router-dom';

// "About Torii" page. This is a personal, hand-written note from the owner,
// kept in his own words on purpose (not run through i18n) so it reads as a
// real letter and not localised UI chrome.
const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen torii-page-stage">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="rounded-3xl border border-white/10 bg-card shadow-elev-2 p-6 sm:p-10 md:p-12">
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-8 text-center">
            About Torii
          </h1>

          <div className="max-w-none space-y-4 text-text-secondary leading-relaxed">
            <h2 className="font-heading text-xl sm:text-2xl font-semibold text-text-primary mb-4">
              An honest note about AI on Torii
            </h2>

            <p>
              {`Torii is developed, maintained and paid for by one person; me. A few people help me moderate, but all the building and the upkeep is just me. I use AI to help with parts of it: some of the art (like the default avatars), and chunks of the server, client and website work too. But of course next to that there's an enormous amount of manual work that no tool does for me, and endless hours I spent putting my effort in this cool project. I'm telling you this on purpose instead of hiding it; I just feel like you should know this.`}
            </p>

            <p>
              {`I know a big part of the rhythm game community feels strongly about AI, and I really do get it. But here's the honest reality on my end: I'm one person trying to build and run something this big, and the server loses money every month it's online, I also have a life; work and study at the same time. Leaning on AI for some of the work is what lets me keep putting my real time into the gameplay, the features, fixing what breaks, and just keeping Torii up for you.`}
            </p>

            <p>
              {`If you'd rather not have an AI default avatar, there's a toggle in your `}
              <Link to="/settings" className="text-torii hover:underline font-medium">
                settings
              </Link>
              {` to switch to the plain Torii logo instead.`}
            </p>

            <p>
              {`If you'd rather not be in a server where AI help is used, you can feel free to stop playing or ask for account deletion.`}
            </p>

            <p>
              {`Thanks for being here, and for understanding. It means a lot.`}
            </p>
            <p className="text-text-primary font-semibold pt-2">
              - Nahuel (Shikkesora)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
