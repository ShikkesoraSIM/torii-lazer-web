import React from 'react';
import HeroSection from '../components/Home/HeroSection';
import HomeFooter from '../components/Home/HomeFooter';

const HomePage: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-[#030014]">
    <HeroSection />
    <HomeFooter />
  </div>
);

export default HomePage;
