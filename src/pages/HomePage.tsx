import React from 'react';
import HeroSection from '../components/Home/HeroSection';
import HomeFooter from '../components/Home/HomeFooter';

const HomePage: React.FC = () => (
  <div className="torii-home">
    <HeroSection />
    <HomeFooter />
  </div>
);

export default HomePage;
