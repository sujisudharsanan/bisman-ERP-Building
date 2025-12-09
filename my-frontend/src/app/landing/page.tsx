"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavActive, setMobileNavActive] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    // Initialize AOS-like animations with delay support
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const delay = el.dataset.aosDelay ? parseInt(el.dataset.aosDelay) : 0;
          setTimeout(() => {
            el.classList.add('aos-animate');
          }, delay);
        }
      });
    };
    
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    document.querySelectorAll('[data-aos]').forEach(el => {
      observer.observe(el);
    });
    
    // Initialize skill progress bars animation
    const skillObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const progressBars = entry.target.querySelectorAll('.progress-bar');
          progressBars.forEach((bar) => {
            const element = bar as HTMLElement;
            const value = element.getAttribute('aria-valuenow');
            if (value) {
              element.style.width = value + '%';
            }
          });
        }
      });
    }, { threshold: 0.5 });
    
    const skillsSection = document.querySelector('.skills-content');
    if (skillsSection) {
      skillObserver.observe(skillsSection);
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      skillObserver.disconnect();
    };
  }, []);

  const toggleMobileNav = () => {
    setMobileNavActive(!mobileNavActive);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };
  
  // Portfolio items with categories
  const portfolioItems = [
    { id: 1, title: 'Core Operations', category: 'Operations', img: 'portfolio-1.webp', desc: 'Sales, Purchasing & Inventory' },
    { id: 2, title: 'Finance & Compliance', category: 'Finance', img: 'portfolio-2.webp', desc: 'Accounting, GST & Reports' },
    { id: 3, title: 'Growth & Support', category: 'Growth', img: 'portfolio-3.webp', desc: 'CRM, Support & Marketing' },
    { id: 4, title: 'Manufacturing', category: 'Operations', img: 'portfolio-4.webp', desc: 'BOM, Work Orders & Production' },
    { id: 5, title: 'Quality Assurance', category: 'Operations', img: 'portfolio-5.webp', desc: 'QC, Inspections & Compliance' },
    { id: 6, title: 'Analytics', category: 'Growth', img: 'portfolio-6.webp', desc: 'Dashboards & Business Intelligence' },
  ];
  
  const filteredPortfolio = activeFilter === 'All' 
    ? portfolioItems 
    : portfolioItems.filter(item => item.category === activeFilter);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900&family=Jost:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900&display=swap');
        
        :root {
          --default-font: "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          --heading-font: "Jost", sans-serif;
          --nav-font: "Poppins", sans-serif;
          --background-color: #ffffff;
          --default-color: #444444;
          --heading-color: #093562;
          --accent-color: #47b2e4;
          --surface-color: #ffffff;
          --contrast-color: #ffffff;
          --nav-color: #ffffff;
          --nav-hover-color: #47b2e4;
          --nav-mobile-background-color: #ffffff;
          --nav-dropdown-background-color: #ffffff;
          --nav-dropdown-color: #444444;
          --nav-dropdown-hover-color: #47b2e4;
          scroll-behavior: smooth;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          color: var(--default-color);
          background-color: var(--background-color);
          font-family: var(--default-font);
        }
        
        a {
          color: var(--accent-color);
          text-decoration: none;
          transition: 0.3s;
        }
        
        a:hover {
          text-decoration: none;
        }
        
        h1, h2, h3, h4, h5, h6 {
          color: var(--heading-color);
          font-family: var(--heading-font);
        }
        
        /* Header */
        .header {
          --background-color: #093562;
          --heading-color: #ffffff;
          color: var(--default-color);
          background-color: var(--background-color);
          padding: 15px 0;
          transition: all 0.5s;
          z-index: 997;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
        }
        
        .index-page .header {
          --background-color: rgba(255, 255, 255, 0);
          --heading-color: #ffffff;
          --nav-color: #ffffff;
        }
        
        .index-page.scrolled .header {
          --background-color: rgba(9, 53, 98, 0.9);
        }
        
        .header .logo h1 {
          font-size: 30px;
          margin: 0;
          font-weight: 500;
          color: var(--heading-color);
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        
        .header .btn-getstarted {
          color: var(--contrast-color);
          background: var(--accent-color);
          font-size: 14px;
          padding: 8px 25px;
          margin: 0 0 0 30px;
          border-radius: 50px;
          transition: 0.3s;
          text-decoration: none;
        }
        
        .header .btn-getstarted:hover {
          background: color-mix(in srgb, var(--accent-color), transparent 15%);
        }
        
        /* Navigation */
        .navmenu ul {
          margin: 0;
          padding: 0;
          display: flex;
          list-style: none;
          align-items: center;
        }
        
        .navmenu li {
          position: relative;
        }
        
        .navmenu a {
          color: var(--nav-color);
          padding: 18px 15px;
          font-size: 15px;
          font-family: var(--nav-font);
          font-weight: 400;
          display: flex;
          align-items: center;
          justify-content: space-between;
          white-space: nowrap;
          transition: 0.3s;
          text-decoration: none;
        }
        
        .navmenu li:hover > a,
        .navmenu .active {
          color: var(--nav-hover-color);
        }
        
        .navmenu .dropdown ul {
          margin: 0;
          padding: 10px 0;
          background: var(--nav-dropdown-background-color);
          display: none;
          position: absolute;
          left: 14px;
          top: 100%;
          border-radius: 4px;
          z-index: 99;
          box-shadow: 0px 0px 30px rgba(0, 0, 0, 0.1);
          min-width: 200px;
        }
        
        .navmenu .dropdown:hover ul {
          display: block;
        }
        
        .navmenu .dropdown ul a {
          padding: 10px 20px;
          font-size: 15px;
          color: var(--nav-dropdown-color);
        }
        
        .navmenu .dropdown ul a:hover {
          color: var(--nav-dropdown-hover-color);
        }
        
        .mobile-nav-toggle {
          display: none;
          color: var(--nav-color);
          font-size: 28px;
          cursor: pointer;
        }
        
        @media (max-width: 1199px) {
          .mobile-nav-toggle {
            display: block;
          }
          
          .navmenu ul {
            display: none;
          }
          
          .mobile-nav-active .navmenu ul {
            display: block;
            position: fixed;
            top: 60px;
            left: 20px;
            right: 20px;
            background: var(--nav-mobile-background-color);
            padding: 20px;
            border-radius: 6px;
            box-shadow: 0px 0px 30px rgba(0, 0, 0, 0.1);
          }
          
          .mobile-nav-active .navmenu a {
            color: var(--nav-dropdown-color);
            padding: 10px 20px;
          }
          
          .header .btn-getstarted {
            margin: 0 15px 0 0;
            padding: 6px 15px;
          }
        }
        
        /* Section styling */
        section {
          color: var(--default-color);
          background-color: var(--background-color);
          padding: 60px 0;
          scroll-margin-top: 88px;
          overflow: clip;
        }
        
        .light-background {
          --background-color: #f5f6f8;
          --surface-color: #ffffff;
        }
        
        .dark-background {
          --background-color: #093562;
          --default-color: #ffffff;
          --heading-color: #ffffff;
          --surface-color: #0d4a7a;
          --contrast-color: #ffffff;
        }
        
        .section-title {
          text-align: center;
          padding-bottom: 60px;
          position: relative;
        }
        
        .section-title h2 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 20px;
          padding-bottom: 20px;
          text-transform: uppercase;
          position: relative;
        }
        
        .section-title h2:before {
          content: "";
          position: absolute;
          display: block;
          width: 160px;
          height: 1px;
          background: color-mix(in srgb, var(--default-color), transparent 60%);
          left: 0;
          right: 0;
          bottom: 1px;
          margin: auto;
        }
        
        .section-title h2::after {
          content: "";
          position: absolute;
          display: block;
          width: 60px;
          height: 3px;
          background: var(--accent-color);
          left: 0;
          right: 0;
          bottom: 0;
          margin: auto;
        }
        
        /* Hero Section */
        .hero {
          width: 100%;
          min-height: 80vh;
          position: relative;
          padding: 120px 0 60px 0;
          display: flex;
          align-items: center;
          background: linear-gradient(135deg, #093562 0%, #061f3a 100%);
        }
        
        .hero h1 {
          margin: 0;
          font-size: 48px;
          font-weight: 700;
          line-height: 56px;
          color: #fff;
        }
        
        .hero p {
          color: rgba(255, 255, 255, 0.7);
          margin: 5px 0 30px 0;
          font-size: 22px;
          line-height: 1.3;
          font-weight: 600;
        }
        
        .hero .btn-get-started {
          color: var(--contrast-color);
          background: var(--accent-color);
          font-family: var(--heading-font);
          font-weight: 500;
          font-size: 15px;
          letter-spacing: 1px;
          display: inline-block;
          padding: 10px 28px 12px 28px;
          border-radius: 50px;
          transition: 0.5s;
          text-decoration: none;
        }
        
        .hero .btn-get-started:hover {
          background: color-mix(in srgb, var(--accent-color), transparent 15%);
        }
        
        .hero .btn-watch-video {
          font-size: 16px;
          transition: 0.5s;
          margin-left: 25px;
          color: #fff;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }
        
        .hero .btn-watch-video i {
          color: var(--contrast-color);
          font-size: 32px;
          margin-right: 8px;
          line-height: 0;
        }
        
        .hero .animated {
          animation: up-down 2s ease-in-out infinite alternate-reverse both;
        }
        
        @keyframes up-down {
          0% { transform: translateY(10px); }
          100% { transform: translateY(-10px); }
        }
        
        @media (max-width: 640px) {
          .hero h1 {
            font-size: 28px;
            line-height: 36px;
          }
          .hero p {
            font-size: 18px;
            line-height: 24px;
          }
        }
        
        /* Clients Section */
        .clients {
          padding: 12px 0;
        }
        
        .clients img {
          max-height: 45px;
          transition: 0.3s;
          opacity: 0.5;
          filter: grayscale(100);
        }
        
        .clients img:hover {
          filter: none;
          opacity: 1;
          transform: scale(1.1);
        }
        
        /* About Section */
        .about ul {
          list-style: none;
          padding: 0;
        }
        
        .about ul li {
          padding-bottom: 5px;
          display: flex;
          align-items: center;
        }
        
        .about ul i {
          font-size: 20px;
          padding-right: 4px;
          color: var(--accent-color);
        }
        
        .about .read-more {
          color: var(--accent-color);
          font-family: var(--heading-font);
          font-weight: 500;
          font-size: 16px;
          letter-spacing: 1px;
          padding: 8px 28px;
          border-radius: 5px;
          transition: 0.3s;
          display: inline-flex;
          align-items: center;
          border: 2px solid var(--accent-color);
          text-decoration: none;
        }
        
        .about .read-more:hover {
          background: var(--accent-color);
          color: var(--contrast-color);
        }
        
        /* Services Section */
        .services .service-item {
          background-color: var(--surface-color);
          box-shadow: 0px 5px 90px 0px rgba(0, 0, 0, 0.1);
          padding: 50px 30px;
          transition: all ease-in-out 0.4s;
          height: 100%;
        }
        
        .services .service-item .icon i {
          color: var(--accent-color);
          font-size: 36px;
          transition: 0.3s;
        }
        
        .services .service-item h4 {
          font-weight: 700;
          margin-bottom: 15px;
          font-size: 20px;
        }
        
        .services .service-item h4 a {
          color: var(--heading-color);
          transition: ease-in-out 0.3s;
          text-decoration: none;
        }
        
        .services .service-item p {
          line-height: 24px;
          font-size: 14px;
          margin-bottom: 0;
        }
        
        .services .service-item:hover {
          transform: translateY(-10px);
        }
        
        .services .service-item:hover h4 a {
          color: var(--accent-color);
        }
        
        /* Call to Action */
        .call-to-action {
          padding: 120px 0;
          position: relative;
          clip-path: inset(0);
        }
        
        .call-to-action img {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 1;
        }
        
        .call-to-action:before {
          content: "";
          background: rgba(9, 53, 98, 0.65);
          position: absolute;
          inset: 0;
          z-index: 2;
        }
        
        .call-to-action .container {
          position: relative;
          z-index: 3;
        }
        
        .call-to-action h3 {
          color: #fff;
          font-size: 28px;
          font-weight: 700;
        }
        
        .call-to-action p {
          color: #fff;
        }
        
        .call-to-action .cta-btn {
          font-family: var(--heading-font);
          font-weight: 500;
          font-size: 16px;
          letter-spacing: 1px;
          display: inline-block;
          padding: 12px 40px;
          border-radius: 50px;
          transition: 0.5s;
          border: 2px solid #fff;
          color: #fff;
          text-decoration: none;
        }
        
        .call-to-action .cta-btn:hover {
          background: var(--accent-color);
          border: 2px solid var(--accent-color);
        }
        
        /* Portfolio Section */
        .portfolio .portfolio-filters {
          padding: 0;
          margin: 0 auto 20px auto;
          list-style: none;
          text-align: center;
        }
        
        .portfolio .portfolio-filters li {
          cursor: pointer;
          display: inline-block;
          padding: 8px 20px 10px 20px;
          font-size: 15px;
          font-weight: 500;
          line-height: 1;
          margin-bottom: 5px;
          border-radius: 50px;
          transition: all 0.3s ease-in-out;
          font-family: var(--heading-font);
        }
        
        .portfolio .portfolio-filters li:hover,
        .portfolio .portfolio-filters li.filter-active {
          color: var(--contrast-color);
          background-color: var(--accent-color);
        }
        
        .portfolio .portfolio-item {
          position: relative;
          overflow: hidden;
        }
        
        .portfolio .portfolio-item img {
          width: 100%;
          transition: 0.3s;
        }
        
        .portfolio .portfolio-item .portfolio-info {
          opacity: 0;
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: -100%;
          z-index: 3;
          transition: all ease-in-out 0.5s;
          background: rgba(255, 255, 255, 0.9);
          padding: 15px;
        }
        
        .portfolio .portfolio-item:hover .portfolio-info {
          opacity: 1;
          bottom: 0;
        }
        
        /* Team Section */
        .team .team-member {
          background-color: var(--surface-color);
          box-shadow: 0px 2px 15px rgba(0, 0, 0, 0.1);
          position: relative;
          border-radius: 5px;
          transition: 0.5s;
          padding: 30px;
          height: 100%;
          display: flex;
          align-items: flex-start;
        }
        
        .team .team-member .pic {
          overflow: hidden;
          width: 150px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .team .team-member .pic img {
          width: 100%;
          transition: ease-in-out 0.3s;
        }
        
        .team .team-member:hover {
          transform: translateY(-10px);
        }
        
        .team .team-member .member-info {
          padding-left: 30px;
        }
        
        .team .team-member h4 {
          font-weight: 700;
          margin-bottom: 5px;
          font-size: 20px;
        }
        
        .team .team-member span {
          display: block;
          font-size: 15px;
          padding-bottom: 10px;
          position: relative;
          font-weight: 500;
        }
        
        .team .team-member p {
          margin: 10px 0 0 0;
          font-size: 14px;
        }
        
        /* Pricing Section */
        .pricing .pricing-item {
          background-color: var(--surface-color);
          box-shadow: 0 3px 20px -2px rgba(0, 0, 0, 0.1);
          border-top: 4px solid var(--background-color);
          padding: 60px 40px;
          height: 100%;
          border-radius: 5px;
        }
        
        .pricing h3 {
          font-weight: 600;
          margin-bottom: 15px;
          font-size: 20px;
        }
        
        .pricing h4 {
          color: var(--accent-color);
          font-size: 48px;
          font-weight: 400;
          font-family: var(--heading-font);
          margin-bottom: 0;
        }
        
        .pricing h4 sup {
          font-size: 28px;
        }
        
        .pricing h4 span {
          color: color-mix(in srgb, var(--default-color), transparent 50%);
          font-size: 18px;
        }
        
        .pricing ul {
          padding: 20px 0;
          list-style: none;
          text-align: left;
          line-height: 20px;
        }
        
        .pricing ul li {
          padding: 10px 0;
          display: flex;
          align-items: center;
        }
        
        .pricing ul i {
          color: #059652;
          font-size: 24px;
          padding-right: 3px;
        }
        
        .pricing .buy-btn {
          color: var(--accent-color);
          display: inline-block;
          padding: 8px 35px 10px 35px;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 500;
          font-family: var(--heading-font);
          transition: 0.3s;
          border: 1px solid var(--accent-color);
          text-decoration: none;
        }
        
        .pricing .buy-btn:hover {
          background: var(--accent-color);
          color: var(--contrast-color);
        }
        
        .pricing .featured {
          border-top-color: var(--accent-color);
        }
        
        .pricing .featured .buy-btn {
          background: var(--accent-color);
          color: var(--contrast-color);
        }
        
        /* Contact Section */
        .contact .info-wrap {
          background-color: var(--surface-color);
          box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.1);
          border-top: 3px solid var(--accent-color);
          border-bottom: 3px solid var(--accent-color);
          padding: 30px;
          height: 100%;
        }
        
        .contact .info-item {
          margin-bottom: 40px;
          display: flex;
          align-items: flex-start;
        }
        
        .contact .info-item i {
          font-size: 20px;
          color: var(--accent-color);
          background: color-mix(in srgb, var(--accent-color), transparent 92%);
          width: 44px;
          height: 44px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 50px;
          margin-right: 15px;
          flex-shrink: 0;
        }
        
        .contact .info-item h3 {
          padding: 0;
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        
        .contact .info-item p {
          padding: 0;
          margin-bottom: 0;
          font-size: 14px;
        }
        
        .contact form input,
        .contact form textarea {
          font-size: 14px;
          padding: 10px 15px;
          box-shadow: none;
          border-radius: 0;
          color: var(--default-color);
          background-color: var(--surface-color);
          border: 1px solid color-mix(in srgb, var(--default-color), transparent 80%);
          width: 100%;
          margin-bottom: 15px;
        }
        
        .contact form input:focus,
        .contact form textarea:focus {
          border-color: var(--accent-color);
          outline: none;
        }
        
        .contact form button {
          color: var(--contrast-color);
          background: var(--accent-color);
          border: 0;
          padding: 10px 30px;
          transition: 0.4s;
          border-radius: 50px;
          cursor: pointer;
        }
        
        .contact form button:hover {
          background: color-mix(in srgb, var(--accent-color), transparent 25%);
        }
        
        /* Why Us Section */
        .why-us {
          padding: 60px 0;
        }
        
        .why-us .content h3 {
          font-weight: 400;
          font-size: 34px;
          color: var(--heading-color);
        }
        
        .why-us .content h3 span {
          color: #093562;
        }
        
        .why-us .content h3 strong {
          color: var(--accent-color);
        }
        
        .why-us .content p {
          color: #6c757d;
        }
        
        .why-us .faq-container .faq-item {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 15px;
          box-shadow: 0 2px 15px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .why-us .faq-container .faq-item:hover {
          box-shadow: 0 5px 25px rgba(0,0,0,0.12);
        }
        
        .why-us .faq-container .faq-item h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--heading-color);
          margin: 0;
          display: flex;
          align-items: center;
        }
        
        .why-us .faq-container .faq-item h3 span {
          color: var(--accent-color);
          font-size: 22px;
          margin-right: 15px;
          font-weight: 700;
        }
        
        .why-us .faq-container .faq-item .faq-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
          padding-left: 37px;
        }
        
        .why-us .faq-container .faq-item.faq-active .faq-content {
          max-height: 200px;
          padding-top: 15px;
        }
        
        .why-us .faq-container .faq-item .faq-toggle {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          transition: transform 0.3s;
        }
        
        .why-us .faq-container .faq-item.faq-active .faq-toggle {
          transform: translateY(-50%) rotate(90deg);
        }
        
        .why-us .faq-container .faq-item {
          position: relative;
        }
        
        /* Skills Section */
        .skills .progress {
          height: auto;
          background: none;
          border-radius: 0;
          margin-bottom: 25px;
        }
        
        .skills .progress .skill {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-weight: 600;
          color: var(--heading-color);
        }
        
        .skills .progress .skill .val {
          font-style: normal;
          color: var(--accent-color);
        }
        
        .skills .progress-bar-wrap {
          background: #e8e8e8;
          height: 10px;
          border-radius: 5px;
        }
        
        .skills .progress-bar {
          width: 0;
          height: 10px;
          border-radius: 5px;
          background: var(--accent-color);
          transition: width 1s ease;
        }
        
        /* Work Process Section */
        .work-process .steps-item {
          background: #fff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 5px 30px rgba(0,0,0,0.08);
          transition: all 0.3s;
        }
        
        .work-process .steps-item:hover {
          transform: translateY(-10px);
          box-shadow: 0 10px 40px rgba(0,0,0,0.12);
        }
        
        .work-process .steps-image img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }
        
        .work-process .steps-content {
          padding: 25px;
        }
        
        .work-process .steps-number {
          font-size: 48px;
          font-weight: 700;
          color: rgba(9, 53, 98, 0.1);
          line-height: 1;
          margin-bottom: 10px;
        }
        
        .work-process .steps-content h3 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 15px;
        }
        
        .work-process .steps-features {
          margin-top: 15px;
        }
        
        .work-process .steps-features .feature-item {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          color: #6c757d;
        }
        
        .work-process .steps-features .feature-item i {
          color: var(--accent-color);
          margin-right: 10px;
        }
        
        /* FAQ Section */
        .faq-2 .faq-container .faq-item {
          background: #fff;
          border-radius: 8px;
          padding: 20px 25px;
          margin-bottom: 15px;
          box-shadow: 0 2px 15px rgba(0,0,0,0.08);
          position: relative;
          cursor: pointer;
        }
        
        .faq-2 .faq-container .faq-item h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--heading-color);
          margin: 0;
          padding-right: 30px;
        }
        
        .faq-2 .faq-container .faq-item .faq-icon {
          position: absolute;
          left: 25px;
          top: 22px;
          font-size: 20px;
          color: var(--accent-color);
        }
        
        .faq-2 .faq-container .faq-item h3 {
          padding-left: 35px;
        }
        
        .faq-2 .faq-container .faq-item .faq-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
          padding-left: 35px;
        }
        
        .faq-2 .faq-container .faq-item.faq-active .faq-content {
          max-height: 200px;
          padding-top: 15px;
        }
        
        .faq-2 .faq-container .faq-item .faq-toggle {
          position: absolute;
          right: 25px;
          top: 22px;
          transition: transform 0.3s;
        }
        
        .faq-2 .faq-container .faq-item.faq-active .faq-toggle {
          transform: rotate(90deg);
        }
        
        /* Testimonials Section */
        .testimonials {
          padding: 80px 0;
        }
        
        .testimonials .testimonial-item {
          text-align: center;
          padding: 30px;
        }
        
        .testimonials .testimonial-img {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          margin: 0 auto 20px;
          object-fit: cover;
        }
        
        .testimonials .testimonial-item h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 5px;
        }
        
        .testimonials .testimonial-item h4 {
          font-size: 14px;
          color: #999;
          margin-bottom: 15px;
        }
        
        .testimonials .testimonial-item .stars {
          margin-bottom: 15px;
        }
        
        .testimonials .testimonial-item .stars i {
          color: #ffc107;
          font-size: 16px;
        }
        
        .testimonials .testimonial-item p {
          font-style: italic;
          color: #555;
        }
        
        .testimonials .quote-icon-left,
        .testimonials .quote-icon-right {
          color: var(--accent-color);
          font-size: 24px;
          vertical-align: middle;
        }
        
        .testimonials .swiper-pagination {
          margin-top: 30px;
          position: relative;
        }
        
        .testimonials .swiper-pagination .swiper-pagination-bullet {
          width: 10px;
          height: 10px;
          background: #ddd;
          opacity: 1;
        }
        
        .testimonials .swiper-pagination .swiper-pagination-bullet-active {
          background: var(--accent-color);
        }
        
        /* Bottom CTA Section */
        .bottom-cta .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #F5A623;
          color: #0d1b2a;
          padding: 16px 40px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        
        .bottom-cta .cta-btn:hover {
          background: #e09000;
          transform: translateY(-3px);
        }
        
        /* Footer */
        .footer {
          color: var(--default-color);
          background-color: #093562;
          font-size: 14px;
          padding: 50px 0;
        }
        
        .footer h4 {
          font-size: 16px;
          font-weight: bold;
          color: #fff;
          margin-bottom: 20px;
        }
        
        .footer a {
          color: rgba(255, 255, 255, 0.7);
        }
        
        .footer a:hover {
          color: #fff;
        }
        
        .footer .footer-links ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .footer .footer-links ul li {
          padding: 10px 0;
          display: flex;
          align-items: center;
        }
        
        .footer .footer-links ul i {
          margin-right: 8px;
          color: var(--accent-color);
        }
        
        .footer .social-links a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.5);
          font-size: 16px;
          color: rgba(255, 255, 255, 0.7);
          margin-right: 10px;
          transition: 0.3s;
        }
        
        .footer .social-links a:hover {
          color: #fff;
          border-color: var(--accent-color);
          background: var(--accent-color);
        }
        
        .footer .copyright {
          text-align: center;
          padding-top: 25px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
        }
        
        /* Scroll Top */
        .scroll-top {
          position: fixed;
          visibility: hidden;
          opacity: 0;
          right: 15px;
          bottom: -15px;
          z-index: 99999;
          background-color: var(--accent-color);
          width: 44px;
          height: 44px;
          border-radius: 50px;
          transition: all 0.4s;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        
        .scroll-top i {
          font-size: 24px;
          color: #fff;
          line-height: 0;
        }
        
        .scroll-top.active {
          visibility: visible;
          opacity: 1;
          bottom: 15px;
        }
        
        /* Container */
        .container {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 15px;
        }
        
        .container-fluid {
          width: 100%;
          padding: 0 15px;
        }
        
        /* Grid */
        .row {
          display: flex;
          flex-wrap: wrap;
          margin: 0 -15px;
        }
        
        .row > * {
          padding: 0 15px;
        }
        
        .col-lg-6 { flex: 0 0 50%; max-width: 50%; }
        .col-lg-4 { flex: 0 0 33.333333%; max-width: 33.333333%; }
        .col-lg-3 { flex: 0 0 25%; max-width: 25%; }
        .col-lg-2 { flex: 0 0 16.666667%; max-width: 16.666667%; }
        .col-md-6 { flex: 0 0 50%; max-width: 50%; }
        .col-md-3 { flex: 0 0 25%; max-width: 25%; }
        .col-md-12 { flex: 0 0 100%; max-width: 100%; }
        .col-xl-3 { flex: 0 0 25%; max-width: 25%; }
        .col-xl-4 { flex: 0 0 33.333333%; max-width: 33.333333%; }
        .col-xl-9 { flex: 0 0 75%; max-width: 75%; }
        
        @media (max-width: 991px) {
          .col-lg-6, .col-lg-4, .col-lg-3, .col-lg-2 {
            flex: 0 0 100%;
            max-width: 100%;
          }
        }
        
        @media (max-width: 767px) {
          .col-md-6, .col-md-3, .col-xl-3, .col-xl-4 {
            flex: 0 0 100%;
            max-width: 100%;
          }
        }
        
        .gy-4 { row-gap: 1.5rem; }
        .gy-5 { row-gap: 3rem; }
        
        .d-flex { display: flex; }
        .flex-column { flex-direction: column; }
        .align-items-center { align-items: center; }
        .align-items-start { align-items: flex-start; }
        .justify-content-center { justify-content: center; }
        .justify-content-between { justify-content: space-between; }
        .text-center { text-align: center; }
        .text-xl-start { text-align: left; }
        
        .order-1 { order: 1; }
        .order-2 { order: 2; }
        .order-lg-1 { order: 1; }
        .order-lg-2 { order: 2; }
        
        @media (max-width: 991px) {
          .order-lg-1, .order-lg-2 {
            order: 0;
          }
        }
        
        .position-relative { position: relative; }
        
        .img-fluid {
          max-width: 100%;
          height: auto;
        }
        
        .me-auto { margin-right: auto; }
        
        /* AOS Animation */
        [data-aos] {
          opacity: 0;
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        [data-aos="zoom-out"] {
          transform: scale(1.1);
        }
        
        [data-aos="fade-up"] {
          transform: translateY(40px);
        }
        
        [data-aos="zoom-in"] {
          transform: scale(0.9);
        }
        
        [data-aos].aos-animate {
          opacity: 1;
          transform: none;
        }
        
        /* Bootstrap Icons (subset) */
        .bi {
          display: inline-block;
          font-style: normal;
        }
        
        .bi-list::before { content: "☰"; }
        .bi-x::before { content: "✕"; }
        .bi-chevron-down::before { content: "▼"; font-size: 10px; }
        .bi-chevron-right::before { content: "›"; }
        .bi-play-circle::before { content: "▶"; }
        .bi-arrow-up-short::before { content: "↑"; }
        .bi-check2-circle::before { content: "✓"; }
        .bi-activity::before { content: "📊"; }
        .bi-bounding-box-circles::before { content: "⬡"; }
        .bi-calendar4-week::before { content: "📅"; }
        .bi-broadcast::before { content: "📡"; }
        .bi-geo-alt::before { content: "📍"; }
        .bi-telephone::before { content: "📞"; }
        .bi-envelope::before { content: "✉"; }
        .bi-twitter-x::before { content: "𝕏"; }
        .bi-facebook::before { content: "f"; font-weight: bold; }
        .bi-instagram::before { content: "📷"; }
        .bi-linkedin::before { content: "in"; font-weight: bold; }
        .bi-check::before { content: "✓"; }
        .bi-arrow-right::before { content: "→"; }
      `}</style>
      
      <div className={`index-page ${scrolled ? 'scrolled' : ''} ${mobileNavActive ? 'mobile-nav-active' : ''}`}>
        {/* Header */}
        <header id="header" className="header d-flex align-items-center">
          <div className="container-fluid d-flex align-items-center justify-content-between" style={{ maxWidth: 1320 }}>
            <Link href="/" className="logo d-flex align-items-center" style={{ textDecoration: 'none', gap: 8 }}>
              <img src="/brand/bisman-logo.svg" alt="BISMAN" style={{ height: 40 }} />
            </Link>
            
            <nav id="navmenu" className="navmenu" style={{ display: 'flex', alignItems: 'center' }}>
              <ul>
                <li><a href="#services">Features</a></li>
                <li><a href="#portfolio">Modules</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </nav>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <Link href="/login" className="btn-getstarted" style={{ background: '#fff', color: '#093562', fontWeight: 600 }}>Go to Application</Link>
              <i className="mobile-nav-toggle bi bi-list" onClick={toggleMobileNav}></i>
            </div>
          </div>
        </header>
        
        <main className="main">
          {/* Hero Section */}
          <section id="hero" className="hero section dark-background">
            <div className="container">
              <div className="row gy-4">
                <div className="col-lg-6 order-2 order-lg-1 d-flex flex-column justify-content-center" data-aos="zoom-out">
                  <p style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, color: 'rgba(255,255,255,0.8)' }}>Built for Ambitious Leaders</p>
                  <h1>The Operating System for the Next Global Leader</h1>
                  <p>A unified, corporate-grade SaaS platform for ambitious business leaders. Scale from startup to enterprise on one secure, cloud-native system.</p>
                  <div className="d-flex">
                    <a href="#pricing" className="btn-get-started">Start Your Free Trial</a>
                    <a href="#about" className="btn-watch-video d-flex align-items-center">
                      <i className="bi bi-play-circle"></i><span>Watch Demo</span>
                    </a>
                  </div>
                  <p style={{ fontSize: 12, marginTop: 15, color: 'rgba(255,255,255,0.6)' }}>No credit card required • 14-day free trial • Cancel anytime</p>
                </div>
                <div className="col-lg-6 order-1 order-lg-2 hero-img" data-aos="zoom-out">
                  <img src="/arsha/img/hero-img.png" className="img-fluid animated" alt="BISMAN ERP Dashboard" />
                </div>
              </div>
            </div>
          </section>
          
          {/* Clients Section */}
          <section id="clients" className="clients section light-background">
            <div className="container" data-aos="zoom-in">
              <div className="row" style={{ justifyContent: 'center', gap: 30, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} style={{ flex: '0 0 auto' }}>
                    <img src={`/arsha/img/clients/clients-${i}.webp`} className="img-fluid" alt="" />
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          {/* About Section */}
          <section id="about" className="about section">
            <div className="container section-title" data-aos="fade-up">
              <h2>Scale Without Limits</h2>
            </div>
            
            <div className="container">
              <div className="row gy-4">
                <div className="col-lg-6 content" data-aos="fade-up" data-aos-delay="100">
                  <p>
                    Most ERPs force you to choose between simplicity and capability. BISMAN gives you both.
                  </p>
                  <ul>
                    <li><i className="bi bi-check2-circle"></i> <span>Experience the speed of a startup tool with the depth of an enterprise suite.</span></li>
                    <li><i className="bi bi-check2-circle"></i> <span>Fully GST compliant with deep logistics workflows built-in.</span></li>
                    <li><i className="bi bi-check2-circle"></i> <span>Multi-tenant architecture drives costs down without compromising quality.</span></li>
                  </ul>
                </div>
                <div className="col-lg-6" data-aos="fade-up" data-aos-delay="200">
                  <p>From chaos to clarity. From spreadsheets to streamlined operations. BISMAN ERP transforms how ambitious leaders run their businesses with 70% less time on data entry, 3x faster decision making, and 100% data visibility.</p>
                  <a href="#services" className="read-more"><span>See Features</span><i className="bi bi-arrow-right"></i></a>
                </div>
              </div>
            </div>
          </section>
          
          {/* Why Us Section */}
          <section id="why-us" className="section why-us light-background">
            <div className="container-fluid">
              <div className="row gy-4">
                <div className="col-lg-7 d-flex flex-column justify-content-center order-2 order-lg-1">
                  <div className="content px-xl-5" data-aos="fade-up" data-aos-delay="100">
                    <h3><span>Why choose </span><strong>BISMAN ERP?</strong></h3>
                    <p>We built BISMAN for business leaders who refuse to compromise between simplicity and power.</p>
                  </div>
                  
                  <div className="faq-container px-xl-5" data-aos="fade-up" data-aos-delay="200">
                    <div className={`faq-item ${activeFaq === 0 ? 'faq-active' : ''}`} onClick={() => toggleFaq(0)}>
                      <h3><span>01</span> What makes BISMAN different from other ERPs?</h3>
                      <div className="faq-content">
                        <p>BISMAN combines startup speed with enterprise depth. Our cloud-native architecture means faster performance, automatic updates, and no hardware costs. Plus, our multi-tenant design keeps costs low while maintaining data isolation.</p>
                      </div>
                      <i className="faq-toggle bi bi-chevron-right"></i>
                    </div>
                    
                    <div className={`faq-item ${activeFaq === 1 ? 'faq-active' : ''}`} onClick={() => toggleFaq(1)}>
                      <h3><span>02</span> How quickly can we get started?</h3>
                      <div className="faq-content">
                        <p>Most clients are live within 2-4 weeks. Our pre-configured industry templates and guided onboarding accelerate deployment while our team handles data migration.</p>
                      </div>
                      <i className="faq-toggle bi bi-chevron-right"></i>
                    </div>
                    
                    <div className={`faq-item ${activeFaq === 2 ? 'faq-active' : ''}`} onClick={() => toggleFaq(2)}>
                      <h3><span>03</span> Is our data secure?</h3>
                      <div className="faq-content">
                        <p>Absolutely. We use bank-grade encryption, role-based access control (RBAC), row-level security, and complete audit trails. Your data is isolated and backed up continuously.</p>
                      </div>
                      <i className="faq-toggle bi bi-chevron-right"></i>
                    </div>
                  </div>
                </div>
                
                <div className="col-lg-5 order-1 order-lg-2 why-us-img">
                  <img src="/arsha/img/why-us.png" className="img-fluid" alt="" data-aos="zoom-in" data-aos-delay="100" />
                </div>
              </div>
            </div>
          </section>
          
          {/* Skills Section */}
          <section id="skills" className="skills section">
            <div className="container" data-aos="fade-up" data-aos-delay="100">
              <div className="row">
                <div className="col-lg-6 d-flex align-items-center">
                  <img src="/arsha/img/illustration/illustration-10.webp" className="img-fluid" alt="" />
                </div>
                
                <div className="col-lg-6 pt-4 pt-lg-0 content">
                  <h3>Measurable Business Impact</h3>
                  <p className="fst-italic">
                    BISMAN delivers quantifiable improvements across key business metrics.
                  </p>
                  
                  <div className="skills-content skills-animation">
                    <div className="progress">
                      <span className="skill"><span>Data Entry Reduction</span> <i className="val">70%</i></span>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar" role="progressbar" aria-valuenow={70} aria-valuemin={0} aria-valuemax={100}></div>
                      </div>
                    </div>
                    
                    <div className="progress">
                      <span className="skill"><span>Decision Speed Improvement</span> <i className="val">85%</i></span>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar" role="progressbar" aria-valuenow={85} aria-valuemin={0} aria-valuemax={100}></div>
                      </div>
                    </div>
                    
                    <div className="progress">
                      <span className="skill"><span>Operational Visibility</span> <i className="val">100%</i></span>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar" role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}></div>
                      </div>
                    </div>
                    
                    <div className="progress">
                      <span className="skill"><span>Cost Savings</span> <i className="val">60%</i></span>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar" role="progressbar" aria-valuenow={60} aria-valuemin={0} aria-valuemax={100}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Services Section */}
          <section id="services" className="services section light-background">
            <div className="container section-title" data-aos="fade-up">
              <h2>What Makes BISMAN Different</h2>
              <p>Enterprise-grade features designed for growing businesses</p>
            </div>
            
            <div className="container">
              <div className="row gy-4">
                <div className="col-xl-3 col-md-6 d-flex" data-aos="fade-up" data-aos-delay="100">
                  <div className="service-item position-relative">
                    <div className="icon"><i className="bi bi-shield-lock icon"></i></div>
                    <h4><a href="">Enterprise Security</a></h4>
                    <p>RBAC + ABAC, Row-Level Security, maker-checker, and full audit logs for corporate-grade governance.</p>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 d-flex" data-aos="fade-up" data-aos-delay="200">
                  <div className="service-item position-relative">
                    <div className="icon"><i className="bi bi-gear-wide-connected icon"></i></div>
                    <h4><a href="">Workflow Automation</a></h4>
                    <p>Trigger-based automation for postings, reminders, approvals, notifications, and background jobs.</p>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 d-flex" data-aos="fade-up" data-aos-delay="300">
                  <div className="service-item position-relative">
                    <div className="icon"><i className="bi bi-clipboard-check icon"></i></div>
                    <h4><a href="">Integrated QA Module</a></h4>
                    <p>Built-in QA workspace for test tasks, issues, timelines, and change history directly inside the ERP.</p>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6 d-flex" data-aos="fade-up" data-aos-delay="400">
                  <div className="service-item position-relative">
                    <div className="icon"><i className="bi bi-building icon"></i></div>
                    <h4><a href="">Multi-Tenant Architecture</a></h4>
                    <p>Cost-effective scaling with isolated tenant data and shared infrastructure.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Work Process Section */}
          <section id="work-process" className="work-process section">
            <div className="container section-title" data-aos="fade-up">
              <h2>How It Works</h2>
              <p>Get started with BISMAN in three simple steps</p>
            </div>
            
            <div className="container" data-aos="fade-up" data-aos-delay="100">
              <div className="row gy-5">
                <div className="col-lg-4" data-aos="fade-up" data-aos-delay="200">
                  <div className="steps-item">
                    <div className="steps-image">
                      <img src="/arsha/img/steps/steps-1.webp" alt="Step 1" className="img-fluid" loading="lazy" />
                    </div>
                    <div className="steps-content">
                      <div className="steps-number">01</div>
                      <h3>Discovery &amp; Setup</h3>
                      <p>We analyze your business processes and configure BISMAN to match your workflow. Import your existing data seamlessly.</p>
                      <div className="steps-features">
                        <div className="feature-item"><i className="bi bi-check-circle"></i><span>Business Analysis</span></div>
                        <div className="feature-item"><i className="bi bi-check-circle"></i><span>Data Migration</span></div>
                        <div className="feature-item"><i className="bi bi-check-circle"></i><span>Custom Configuration</span></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="col-lg-4" data-aos="fade-up" data-aos-delay="300">
                  <div className="steps-item">
                    <div className="steps-image">
                      <img src="/arsha/img/steps/steps-2.webp" alt="Step 2" className="img-fluid" loading="lazy" />
                    </div>
                    <div className="steps-content">
                      <div className="steps-number">02</div>
                      <h3>Training &amp; Go-Live</h3>
                      <p>Your team gets hands-on training. We go live together and provide support during the critical first weeks.</p>
                      <div className="steps-features">
                        <div className="feature-item"><i className="bi bi-check-circle"></i><span>Team Training</span></div>
                        <div className="feature-item"><i className="bi bi-check-circle"></i><span>Parallel Running</span></div>
                        <div className="feature-item"><i className="bi bi-check-circle"></i><span>Go-Live Support</span></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="col-lg-4" data-aos="fade-up" data-aos-delay="400">
                  <div className="steps-item">
                    <div className="steps-image">
                      <img src="/arsha/img/steps/steps-3.webp" alt="Step 3" className="img-fluid" loading="lazy" />
                    </div>
                    <div className="steps-content">
                      <div className="steps-number">03</div>
                      <h3>Scale &amp; Optimize</h3>
                      <p>Add modules as you grow. Our analytics help identify optimization opportunities and bottlenecks.</p>
                      <div className="steps-features">
                        <div className="feature-item"><i className="bi bi-check-circle"></i><span>Continuous Improvement</span></div>
                        <div className="feature-item"><i className="bi bi-check-circle"></i><span>24/7 Support</span></div>
                        <div className="feature-item"><i className="bi bi-check-circle"></i><span>Regular Updates</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Call To Action Section */}
          <section id="call-to-action" className="call-to-action section dark-background">
            <img src="/arsha/img/bg/bg-8.webp" alt="" />
            <div className="container">
              <div className="row" data-aos="zoom-in">
                <div className="col-xl-9 text-center text-xl-start">
                  <h3>Your ERP is ready. Are you?</h3>
                  <p>Join the ambitious leaders using BISMAN to unify their operations and scale globally. Start your transformation today.</p>
                </div>
                <div className="col-xl-3 d-flex align-items-center justify-content-center">
                  <a className="cta-btn" href="#pricing">Start Free Trial</a>
                </div>
              </div>
            </div>
          </section>
          
          {/* Portfolio Section */}
          <section id="portfolio" className="portfolio section">
            <div className="container section-title" data-aos="fade-up">
              <h2>Core Modules</h2>
              <p>Everything you need to run your business, unified.</p>
            </div>
            
            <div className="container">
              <ul className="portfolio-filters" data-aos="fade-up" data-aos-delay="100">
                {['All', 'Operations', 'Finance', 'Growth'].map((filter) => (
                  <li 
                    key={filter} 
                    className={activeFilter === filter ? 'filter-active' : ''}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                  </li>
                ))}
              </ul>
              
              <div className="row gy-4" data-aos="fade-up" data-aos-delay="200">
                {filteredPortfolio.map((item, idx) => (
                  <div key={item.id} className="col-lg-4 col-md-6 portfolio-item" data-aos="fade-up" data-aos-delay={100 + idx * 100}>
                    <img src={`/arsha/img/portfolio/portfolio-${item.id}.webp`} className="img-fluid" alt="" />
                    <div className="portfolio-info">
                      <h4>{item.title}</h4>
                      <p>{item.desc}</p>
                      <a href={`/arsha/img/portfolio/portfolio-${item.id}.webp`} className="glightbox preview-link"><i className="bi bi-zoom-in"></i></a>
                      <a href="#" className="details-link"><i className="bi bi-link-45deg"></i></a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          {/* Testimonials Section */}
          <section id="testimonials" className="testimonials section light-background">
            <div className="container section-title" data-aos="fade-up">
              <h2>What Our Clients Say</h2>
              <p>Trusted by ambitious business leaders across industries</p>
            </div>
            
            <div className="container" data-aos="fade-up" data-aos-delay="100">
              <div className="row gy-5">
                {[
                  { img: 'person-m-7.webp', name: 'Rajesh Kumar', role: 'CEO, TechVentures', quote: 'BISMAN transformed our operations. We went from managing 5 spreadsheets to one unified dashboard. The time savings alone justified the investment within the first month.' },
                  { img: 'person-f-8.webp', name: 'Priya Sharma', role: 'CFO, GlobalTrade Ltd', quote: 'The GST compliance features are exceptional. What used to take us 3 days now happens automatically. Our audit preparation time dropped by 80%.' },
                  { img: 'person-m-6.webp', name: 'Arjun Patel', role: 'Operations Head, ManuTech', quote: 'The QA module integrated with our manufacturing workflow is a game-changer. Real-time quality tracking has reduced our defect rate significantly.' },
                ].map((testimonial, idx) => (
                  <div key={idx} className="col-lg-4" data-aos="fade-up" data-aos-delay={100 + idx * 100}>
                    <div className="testimonial-item">
                      <img src={`/arsha/img/person/${testimonial.img}`} className="testimonial-img" alt="" />
                      <h3>{testimonial.name}</h3>
                      <h4>{testimonial.role}</h4>
                      <div className="stars">
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                      </div>
                      <p>
                        <i className="bi bi-quote quote-icon-left"></i>
                        <span>{testimonial.quote}</span>
                        <i className="bi bi-quote quote-icon-right"></i>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          {/* FAQ Section */}
          <section id="faq-2" className="faq-2 section">
            <div className="container section-title" data-aos="fade-up">
              <h2>Frequently Asked Questions</h2>
              <p>Get answers to common questions about BISMAN ERP</p>
            </div>
            
            <div className="container">
              <div className="row justify-content-center">
                <div className="col-lg-10">
                  <div className="faq-container">
                    {[
                      { q: 'How long does implementation take?', a: 'Most implementations are completed within 2-4 weeks. Our pre-configured industry templates and experienced onboarding team accelerate the process significantly.' },
                      { q: 'Can I import data from my existing system?', a: 'Yes! We support data migration from Excel, Tally, SAP, and most common ERP systems. Our team handles the migration to ensure data integrity.' },
                      { q: 'Is my data secure?', a: 'Absolutely. We use bank-grade encryption, role-based access control (RBAC), and complete audit trails. Your data is isolated and backed up continuously across multiple regions.' },
                      { q: 'What kind of support do you provide?', a: 'We offer 24/7 support via chat, email, and phone. Every client gets a dedicated success manager to ensure you get maximum value from BISMAN.' },
                      { q: 'Can I try before I buy?', a: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required to start.' },
                    ].map((faq, idx) => (
                      <div key={idx} className={`faq-item ${activeFaq === idx + 10 ? 'faq-active' : ''}`} onClick={() => toggleFaq(idx + 10)} data-aos="fade-up" data-aos-delay={200 + idx * 100}>
                        <i className="faq-icon bi bi-question-circle"></i>
                        <h3>{faq.q}</h3>
                        <div className="faq-content">
                          <p>{faq.a}</p>
                        </div>
                        <i className="faq-toggle bi bi-chevron-right"></i>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Why BISMAN Section (replaces Team) */}
          <section id="team" className="team section light-background">
            <div className="container section-title" data-aos="fade-up">
              <h2>Why Businesses Choose BISMAN</h2>
              <p>Trusted by growing enterprises across industries</p>
            </div>
            
            <div className="container">
              <div className="row gy-4">
                {[
                  { img: 'person-m-7.webp', name: '99.9% Uptime', role: 'Enterprise Reliability', desc: 'Built on cloud-native architecture with automatic failover and disaster recovery.' },
                  { img: 'person-f-8.webp', name: '24/7 Support', role: 'Dedicated Success Team', desc: 'Expert support team available round the clock to ensure your operations never stop.' },
                  { img: 'person-m-6.webp', name: 'Data Security', role: 'Bank-Grade Protection', desc: 'SOC 2 compliant with end-to-end encryption and role-based access controls.' },
                  { img: 'person-f-4.webp', name: 'Rapid Deployment', role: 'Go Live in Days', desc: 'Pre-configured industry templates get you operational in days, not months.' },
                ].map((member, idx) => (
                  <div key={idx} className="col-lg-6" data-aos="fade-up" data-aos-delay={100 + idx * 100}>
                    <div className="team-member d-flex align-items-start">
                      <div className="pic"><img src={`/arsha/img/person/${member.img}`} className="img-fluid" alt="" /></div>
                      <div className="member-info">
                        <h4>{member.name}</h4>
                        <span>{member.role}</span>
                        <p>{member.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          {/* Pricing Section */}
          <section id="pricing" className="pricing section">
            <div className="container section-title" data-aos="fade-up">
              <h2>Flexible Pricing Designed for Growth</h2>
              <p>Start small, scale big. Only pay for what you need.</p>
            </div>
            
            <div className="container">
              <div className="row gy-4">
                <div className="col-lg-4" data-aos="zoom-in" data-aos-delay="100">
                  <div className="pricing-item">
                    <h3>Starter</h3>
                    <p style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>Perfect for SMEs establishing their foundation.</p>
                    <h4><sup>₹</sup>999<span> / month</span></h4>
                    <ul>
                      <li><i className="bi bi-check"></i> Sales & Purchasing</li>
                      <li><i className="bi bi-check"></i> Inventory Management</li>
                      <li><i className="bi bi-check"></i> Core Accounting</li>
                      <li><i className="bi bi-check"></i> 5 Users included</li>
                    </ul>
                    <a href="#" className="buy-btn">Get Started</a>
                  </div>
                </div>
                <div className="col-lg-4" data-aos="zoom-in" data-aos-delay="200">
                  <div className="pricing-item featured">
                    <p style={{ fontSize: 11, color: 'var(--accent-color)', fontWeight: 600, marginBottom: 5 }}>Most Popular</p>
                    <h3>Professional</h3>
                    <p style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>Select specialized tools as you need them.</p>
                    <h4><sup>₹</sup>2,999<span> / month</span></h4>
                    <ul>
                      <li><i className="bi bi-check"></i> Everything in Starter</li>
                      <li><i className="bi bi-check"></i> Integrated QA Module</li>
                      <li><i className="bi bi-check"></i> Automation Engine</li>
                      <li><i className="bi bi-check"></i> HR & Payroll</li>
                      <li><i className="bi bi-check"></i> 25 Users included</li>
                    </ul>
                    <a href="#" className="buy-btn">Get Started</a>
                  </div>
                </div>
                <div className="col-lg-4" data-aos="zoom-in" data-aos-delay="300">
                  <div className="pricing-item">
                    <h3>Enterprise</h3>
                    <p style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>For expanding enterprises scaling globally.</p>
                    <h4><sup>₹</sup>9,999<span> / month</span></h4>
                    <ul>
                      <li><i className="bi bi-check"></i> Everything in Professional</li>
                      <li><i className="bi bi-check"></i> Unlimited Users</li>
                      <li><i className="bi bi-check"></i> Multi-Branch Access</li>
                      <li><i className="bi bi-check"></i> Advanced Reporting</li>
                      <li><i className="bi bi-check"></i> Priority Support</li>
                    </ul>
                    <a href="#" className="buy-btn">Get Started</a>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Contact Section */}
          <section id="contact" className="contact section light-background">
            <div className="container section-title" data-aos="fade-up">
              <h2>Contact</h2>
              <p>Get in touch with our team to learn more about BISMAN ERP</p>
            </div>
            
            <div className="container" data-aos="fade-up" data-aos-delay="100">
              <div className="row gy-4">
                <div className="col-lg-5">
                  <div className="info-wrap">
                    <div className="info-item d-flex" data-aos="fade-up" data-aos-delay="200">
                      <i className="bi bi-geo-alt flex-shrink-0"></i>
                      <div>
                        <h3>Address</h3>
                        <p>Chennai, Tamil Nadu, India</p>
                      </div>
                    </div>
                    <div className="info-item d-flex" data-aos="fade-up" data-aos-delay="300">
                      <i className="bi bi-telephone flex-shrink-0"></i>
                      <div>
                        <h3>Call Us</h3>
                        <p>+91 98765 43210</p>
                      </div>
                    </div>
                    <div className="info-item d-flex" data-aos="fade-up" data-aos-delay="400">
                      <i className="bi bi-envelope flex-shrink-0"></i>
                      <div>
                        <h3>Email Us</h3>
                        <p>contact@bisman.io</p>
                      </div>
                    </div>
                    
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d248849.886539092!2d80.06892!3d13.04778!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5265ea4f7d3361%3A0x6e61a70b6863d433!2sChennai%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1698300000000!5m2!1sen!2sin" 
                      frameBorder="0" 
                      style={{ border: 0, width: '100%', height: 270, marginTop: 20, borderRadius: 8 }} 
                      allowFullScreen 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                </div>
                <div className="col-lg-7">
                  <form action="#" method="post" className="php-email-form" data-aos="fade-up" data-aos-delay="200">
                    <div className="row gy-4">
                      <div className="col-md-6">
                        <label htmlFor="name-field" className="pb-2">Your Name</label>
                        <input type="text" name="name" id="name-field" className="form-control" required />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="email-field" className="pb-2">Your Email</label>
                        <input type="email" name="email" id="email-field" className="form-control" required />
                      </div>
                      <div className="col-md-12">
                        <label htmlFor="subject-field" className="pb-2">Subject</label>
                        <input type="text" name="subject" id="subject-field" className="form-control" required />
                      </div>
                      <div className="col-md-12">
                        <label htmlFor="message-field" className="pb-2">Message</label>
                        <textarea name="message" rows={6} id="message-field" className="form-control" required></textarea>
                      </div>
                      <div className="col-md-12 text-center">
                        <button type="submit">Send Message</button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>
        </main>
        
        {/* Bottom CTA Section */}
        <section className="bottom-cta section dark-background" style={{ background: '#0d1b2a', padding: '80px 0', textAlign: 'center' }}>
          <div className="container" data-aos="fade-up">
            <h2 style={{ color: '#F5A623', fontSize: 42, fontWeight: 700, marginBottom: 20, fontFamily: 'var(--heading-font)' }}>Your ERP is ready. Are you?</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, maxWidth: 600, margin: '0 auto 30px' }}>Join the ambitious leaders using BISMAN to unify their operations and scale globally.</p>
            <a href="#pricing" className="cta-btn">
              Start Your Free Trial <i className="bi bi-chevron-right"></i>
            </a>
          </div>
        </section>
        
        {/* Footer */}
        <footer id="footer" className="footer">
          <div className="container">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px 0' }}>
              <div style={{ flex: '1 1 300px', maxWidth: '40%', paddingRight: 30 }}>
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="sitename" style={{ color: '#fff', fontSize: 28, fontWeight: 700, fontFamily: 'var(--heading-font)' }}>BISMAN</span>
                  <span style={{ color: '#F5A623', fontSize: 28, fontWeight: 700 }}>.</span>
                </Link>
                <div className="footer-contact" style={{ marginTop: 20, color: 'rgba(255,255,255,0.7)' }}>
                  <p>The operating system for the next global</p>
                  <p>leader. Simple. Fast. Secure.</p>
                </div>
              </div>
              <div className="footer-links" style={{ flex: '0 0 150px' }}>
                <h4>Product</h4>
                <ul>
                  <li><a href="#services">Features</a></li>
                  <li><a href="#portfolio">Modules</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#">Security</a></li>
                </ul>
              </div>
              <div className="footer-links" style={{ flex: '0 0 150px' }}>
                <h4>Company</h4>
                <ul>
                  <li><a href="#about">About Us</a></li>
                  <li><a href="#contact">Contact</a></li>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Blog</a></li>
                </ul>
              </div>
              <div className="footer-links" style={{ flex: '0 0 150px' }}>
                <h4>Legal</h4>
                <ul>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Cookie Policy</a></li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
        
        {/* Scroll Top */}
        <a 
          href="#" 
          className={`scroll-top ${scrolled ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); scrollToTop(); }}
        >
          <i className="bi bi-arrow-up-short"></i>
        </a>
      </div>
    </>
  );
}
