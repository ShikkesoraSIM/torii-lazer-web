import React from 'react';
import { Link } from 'react-router-dom';

// "About Torii" page. This is a personal, hand-written note from the owner,
// kept in his own words on purpose (not run through i18n) so it reads as a
// real letter and not localised UI chrome.
const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto container-padding py-12">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            About Torii
          </h1>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              An honest note about AI on Torii
            </h2>

            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {`Torii is developed, maintained and paid for by one person; me. A few people help me moderate, but all the building and the upkeep is just me. I use AI to help with parts of it: some of the art (like the default avatars), and chunks of the server, client and website work too. But of course next to that there's an enormous amount of manual work that no tool does for me, and endless hours I spent putting my effort in this cool project. I'm telling you this on purpose instead of hiding it; I just feel like you should know this.`}
            </p>

            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {`I know a big part of the osu community feels strongly about AI, and I really do get it. But here's the honest reality on my end: I'm one person trying to build and run something this big, and the server loses money every month it's online, I also have a life; work and study at the same time. Leaning on AI for some of the work is what lets me keep putting my real time into the gameplay, the features, fixing what breaks, and just keeping Torii up for you.`}
            </p>

            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {`If you'd rather not have an AI default avatar, there's a toggle in your `}
              <Link to="/settings" className="text-osu-pink hover:underline">
                settings
              </Link>
              {` to switch to the plain Torii logo instead.`}
            </p>

            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {`If you'd rather not be in a server where AI help is used, you can feel free to stop playing or ask for account deletion.`}
            </p>

            <p className="text-gray-600 dark:text-gray-300 mb-2">
              {`Thanks for being here, and for understanding. It means a lot.`}
            </p>
            <p className="text-gray-700 dark:text-gray-200 font-medium">
              - Nahuel (Shikkesora)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
