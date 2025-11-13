/**
 * Page Collector Service
 * Fetches and extracts data from web pages for meeting/event creation
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ExtractedPageData {
  title: string | null;
  h1: string | null;
  h2: string | null;
  description: string | null;
  emails: string[];
  phones: string[];
  structured: any;
  html: string;
}

interface PageSummary {
  pageId: string;
  url: string;
  summary: {
    title: string | null;
    description: string | null;
    h1: string | null;
    contacts: string[];
  };
  questions: Array<{
    key: string;
    prompt: string;
    required: boolean;
    default?: string;
  }>;
}

/**
 * Fetch and extract data from a URL
 */
export async function fetchAndExtractPage(url: string): Promise<ExtractedPageData> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BISMAN-ERP-Bot/1.0'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract basic metadata
    const title = $('title').first().text().trim() || null;
    const h1 = $('h1').first().text().trim() || null;
    const h2 = $('h2').first().text().trim() || null;
    const description = $('meta[name="description"]').attr('content')?.trim() || null;
    
    // Extract contact information
    const emailMatches = html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
    const emails = [...new Set(emailMatches)].filter(email => 
      !email.includes('example.com') && !email.includes('placeholder')
    );
    
    const phoneMatches = html.match(/(\+?\d[\d\-\s]{7,}\d)/g) || [];
    const phones = [...new Set(phoneMatches)];
    
    // Extract JSON-LD structured data
    let structured: any = null;
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const parsed = JSON.parse($(el).contents().text());
        structured = parsed;
      } catch (e) {
        // Ignore invalid JSON-LD
      }
    });
    
    return {
      title,
      h1,
      h2,
      description,
      emails,
      phones,
      structured,
      html
    };
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Page fetch timeout - page took too long to load');
    }
    throw new Error(`Failed to fetch page: ${error.message}`);
  }
}

/**
 * Save extracted page data to database
 */
export async function savePageRecord(
  userId: string,
  url: string,
  extracted: ExtractedPageData
): Promise<string> {
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO pages (
      id, url, title, description, h1, h2, contacts, structured, raw_html, fetched_by
    )
    VALUES (
      gen_random_uuid(),
      ${url},
      ${extracted.title},
      ${extracted.description},
      ${extracted.h1},
      ${extracted.h2},
      ${JSON.stringify({ emails: extracted.emails, phones: extracted.phones })}::jsonb,
      ${JSON.stringify(extracted.structured || {})}::jsonb,
      ${extracted.html},
      ${userId}::uuid
    )
    RETURNING id::text
  `;
  
  return result[0].id;
}

/**
 * Generate smart questions based on extracted page data
 */
export async function generatePageQuestions(
  pageId: string,
  url: string,
  extracted: ExtractedPageData
): Promise<PageSummary> {
  const suggestedTitle = extracted.title || 
    (extracted.h1 ? `Meeting about: ${extracted.h1}` : 'Meeting');
  
  const questions = [
    {
      key: 'title',
      prompt: `Event title (suggested: "${suggestedTitle}")`,
      required: true,
      default: suggestedTitle
    },
    {
      key: 'date',
      prompt: 'Date (YYYY-MM-DD or "today", "tomorrow")',
      required: true
    },
    {
      key: 'time',
      prompt: 'Start time (HH:MM in 24-hour format)',
      required: true
    },
    {
      key: 'duration',
      prompt: 'Duration in minutes (default: 60)',
      required: false,
      default: '60'
    },
    {
      key: 'participants',
      prompt: 'Participants (emails or names, comma-separated)',
      required: false,
      default: extracted.emails.slice(0, 3).join(', ')
    },
    {
      key: 'agenda',
      prompt: 'Agenda / meeting notes',
      required: false,
      default: extracted.description || ''
    },
    {
      key: 'location',
      prompt: 'Location or meeting link',
      required: false
    },
    {
      key: 'reminder_mins',
      prompt: 'Reminder (minutes before event, default: 30)',
      required: false,
      default: '30'
    }
  ];
  
  return {
    pageId,
    url,
    summary: {
      title: extracted.title,
      description: extracted.description,
      h1: extracted.h1,
      contacts: extracted.emails
    },
    questions
  };
}

/**
 * Log page audit event
 */
export async function logPageAudit(
  userId: string,
  action: string,
  meta: any
): Promise<void> {
  await prisma.$queryRaw`
    INSERT INTO page_audit (user_id, action, meta)
    VALUES (${userId}::uuid, ${action}, ${JSON.stringify(meta)}::jsonb)
  `;
}

export default {
  fetchAndExtractPage,
  savePageRecord,
  generatePageQuestions,
  logPageAudit
};
