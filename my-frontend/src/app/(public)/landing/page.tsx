"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import './fonts.css';
import './landing.css';

// Preload fonts to prevent FOUT
const fontPreloads = [
  '/fonts/jost-500.woff2',
  '/fonts/jost-600.woff2',
  '/fonts/opensans-400.woff2',
  '/fonts/poppins-500.woff2',
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavActive, setMobileNavActive] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeFaq, setActiveFaq] = useState<number | null>(10);

  // Preload critical fonts immediately
  useEffect(() => {
    fontPreloads.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.href = font;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }, []);

  // Set mounted after initial render to prevent FOUC
  useEffect(() => {
    setMounted(true);
  }, []);

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
    // Keep the clicked FAQ open, only close when clicking a different one
    setActiveFaq(index);
  };
  
  // Portfolio items with categories - using available images (1, 3, 4, 7, 8, 9)
  const portfolioItems = [
    { id: 1, title: 'Core Operations', category: 'Operations', img: 'portfolio-1.webp', desc: 'Sales, Purchasing & Inventory' },
    { id: 7, title: 'Finance & Compliance', category: 'Finance', img: 'portfolio-7.webp', desc: 'Accounting, GST & Reports' },
    { id: 3, title: 'Growth & Support', category: 'Growth', img: 'portfolio-3.webp', desc: 'CRM, Support & Marketing' },
    { id: 4, title: 'Manufacturing', category: 'Operations', img: 'portfolio-4.webp', desc: 'BOM, Work Orders & Production' },
    { id: 8, title: 'Quality Assurance', category: 'Operations', img: 'portfolio-8.webp', desc: 'QC, Inspections & Compliance' },
    { id: 9, title: 'Analytics', category: 'Growth', img: 'portfolio-9.webp', desc: 'Dashboards & Business Intelligence' },
  ];
  
  const filteredPortfolio = activeFilter === 'All' 
    ? portfolioItems 
    : portfolioItems.filter(item => item.category === activeFilter);

  return (
    <>
      {/* Loading overlay - hides unstyled content flash */}
      <div className={`landing-loading-overlay ${mounted ? 'hidden' : ''}`}>
        <div className="landing-spinner"></div>
      </div>
      
      <div className={`landing-page index-page ${scrolled ? 'scrolled' : ''} ${mobileNavActive ? 'mobile-nav-active' : ''}`} style={{ visibility: mounted ? 'visible' : 'hidden' }}>
        {/* Header */}
        <header id="header" className="header d-flex align-items-center" style={{ padding: '10px 0' }}>
          <div className="container-fluid d-flex align-items-center justify-content-between" style={{ maxWidth: 1200 }}>
            <Link href="/" className="logo d-flex align-items-center" style={{ textDecoration: 'none', gap: 8 }}>
              <img src="/brand/bisman-logo.svg" alt="BISMAN" style={{ height: 32 }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>BISMAN</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase' }}>ERP Solution</span>
              </div>
            </Link>
            
            <nav id="navmenu" className="navmenu" style={{ display: 'flex', alignItems: 'center' }}>
              <ul>
                <li><a href="#services" style={{ color: 'rgba(255,255,255,0.7)' }}>Features</a></li>
                <li><a href="#portfolio" style={{ color: 'rgba(255,255,255,0.7)', pointerEvents: 'auto' }} className="no-hover">Modules</a></li>
                <li><a href="#pricing" style={{ color: 'rgba(255,255,255,0.7)' }}>Pricing</a></li>
              </ul>
            </nav>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginLeft: 'auto' }}>
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
                    <a href="/signup" className="btn-get-started">Start Your Free Trial</a>
                    <a href="#about" className="btn-watch-video d-flex align-items-center">
                      <i className="bi bi-play-circle"></i><span>Watch Demo</span>
                    </a>
                  </div>
                  <p style={{ fontSize: 12, marginTop: 15, color: 'rgba(255,255,255,0.6)' }}>No credit card required • Cancel anytime</p>
                </div>
                <div className="col-lg-6 order-1 order-lg-2 hero-img" data-aos="zoom-out">
                  <img src="/arsha/img/hero-img.png" className="img-fluid animated" alt="BISMAN ERP Dashboard" />
                </div>
              </div>
            </div>
          </section>
          
          {/* Modules Showcase Section */}
          <section id="clients" className="clients section light-background">
            <div className="container" data-aos="zoom-in">
              <p style={{ textAlign: 'center', fontSize: 12, textTransform: 'uppercase', letterSpacing: 3, color: '#64748b', marginBottom: 24 }}>8 Powerful Modules • One Platform</p>
              {/* Top row - 6 modules */}
              <div className="row" style={{ justifyContent: 'center', gap: 32, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                {[
                  'Task Management',
                  'Team Collaboration',
                  'Analytics & Reports',
                  'HR Management',
                  'Inventory Control',
                  'Finance & Billing',
                ].map((name, i) => (
                  <span 
                    key={i} 
                    className="module-item"
                    data-aos="fade-up"
                    data-aos-delay={i * 100}
                    style={{ 
                      fontSize: 14, 
                      fontWeight: 500, 
                      color: '#334155',
                      padding: '8px 0',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0d6efd';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#334155';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
              {/* Bottom row - 2 modules */}
              <div className="row" style={{ justifyContent: 'center', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  'Calendar & Scheduling',
                  'Access & Security',
                ].map((name, i) => (
                  <span 
                    key={i} 
                    className="module-item"
                    data-aos="fade-up"
                    data-aos-delay={(i + 6) * 100}
                    style={{ 
                      fontSize: 14, 
                      fontWeight: 500, 
                      color: '#334155',
                      padding: '8px 0',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0d6efd';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#334155';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {name}
                  </span>
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
                  <a className="cta-btn" href="/signup">Start Free Trial</a>
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
                      { q: 'Can I try before I buy?', a: 'Yes! We offer a free trial with full access to all features. No credit card required to start.' },
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
                    <a href="/signup" className="buy-btn">Get Started</a>
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
                    <a href="/signup" className="buy-btn">Get Started</a>
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
                    <a href="/signup" className="buy-btn">Get Started</a>
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
            <a href="/signup" className="cta-btn">
              Start Your Free Trial <i className="bi bi-chevron-right"></i>
            </a>
          </div>
        </section>
        
        {/* Footer */}
        <footer id="footer" className="footer">
          <div className="container">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px 0' }}>
              <div style={{ flex: '1 1 300px', maxWidth: '40%', paddingRight: 30 }}>
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="sitename" style={{ color: '#fff', fontSize: 22, fontWeight: 700, fontFamily: 'var(--heading-font)' }}>BISMAN</span>
                  <span style={{ color: '#F5A623', fontSize: 22, fontWeight: 700 }}>.</span>
                </Link>
                <div className="footer-contact" style={{ marginTop: 10, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                  <p style={{ margin: 0 }}>The operating system for the next global leader. Simple. Fast. Secure.</p>
                </div>
              </div>
              <div className="footer-links" style={{ flex: '0 0 130px' }}>
                <h4>Product</h4>
                <ul>
                  <li><a href="#services">Features</a></li>
                  <li><a href="#portfolio">Modules</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#">Security</a></li>
                </ul>
              </div>
              <div className="footer-links" style={{ flex: '0 0 130px' }}>
                <h4>Company</h4>
                <ul>
                  <li><a href="#about">About Us</a></li>
                  <li><a href="#contact">Contact</a></li>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Blog</a></li>
                </ul>
              </div>
              <div className="footer-links" style={{ flex: '0 0 130px' }}>
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
