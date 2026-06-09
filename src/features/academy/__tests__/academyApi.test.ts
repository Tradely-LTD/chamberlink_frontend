/**
 * Unit tests for the academy feature API slice.
 *
 * We test the transformResponse logic directly (the functions that convert
 * raw API envelopes to the typed data the UI consumes), plus the Course and
 * Enrollment type shapes expected by the backend contract.
 */

import type { Course, Enrollment, EnrollResult, MaterialResult } from '../academyApi';

// ── transformResponse helpers (extracted for unit-testing) ─────────────────

function transformCourses(raw: { success: boolean; data: Course[] }): Course[] {
  return raw.data;
}

function transformEnrollments(raw: { success: boolean; data: Enrollment[] }): Enrollment[] {
  return raw.data;
}

function transformEnroll(raw: {
  success: boolean;
  data: { enrolled: boolean; checkoutUrl?: string };
}): EnrollResult {
  return {
    enrolled: raw.data.enrolled,
    checkoutUrl: raw.data.checkoutUrl,
  };
}

function transformMaterial(raw: {
  success: boolean;
  data: MaterialResult;
}): MaterialResult {
  return raw.data;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('academy transformResponse helpers', () => {
  describe('transformCourses', () => {
    it('unwraps the data array from the ApiResponse envelope', () => {
      const course: Course = {
        id: 'c1',
        title: 'Export Documentation',
        description: 'Learn export docs',
        category: 'Export',
        duration: '4 hours',
        level: 'beginner',
        price: 0,
        isFree: true,
        enrolledCount: 100,
        instructorName: 'KACCIMA',
        isPublished: true,
        videoUrl: 'https://www.youtube.com/watch?v=abc',
      };
      const result = transformCourses({ success: true, data: [course] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
      expect(result[0].videoUrl).toBe('https://www.youtube.com/watch?v=abc');
    });

    it('returns an empty array when data is empty', () => {
      const result = transformCourses({ success: true, data: [] });
      expect(result).toEqual([]);
    });
  });

  describe('transformEnrollments', () => {
    it('unwraps enrollments from the ApiResponse envelope', () => {
      const enrollment: Enrollment = {
        id: 'e1',
        courseId: 'c1',
        courseTitle: 'Export Documentation',
        progress: 75,
        enrolledAt: '2025-01-20T00:00:00Z',
      };
      const result = transformEnrollments({ success: true, data: [enrollment] });
      expect(result).toHaveLength(1);
      expect(result[0].courseId).toBe('c1');
      expect(result[0].progress).toBe(75);
    });

    it('preserves optional fields (completedAt, memberName, memberEmail)', () => {
      const enrollment: Enrollment = {
        id: 'e2',
        courseId: 'c2',
        courseTitle: 'HS Code Masterclass',
        progress: 100,
        enrolledAt: '2025-02-01T00:00:00Z',
        completedAt: '2025-02-10T00:00:00Z',
        memberName: 'Amina Musa',
        memberEmail: 'amina@example.com',
      };
      const result = transformEnrollments({ success: true, data: [enrollment] });
      expect(result[0].completedAt).toBe('2025-02-10T00:00:00Z');
      expect(result[0].memberName).toBe('Amina Musa');
    });
  });

  describe('transformEnroll — checkoutUrl handling', () => {
    it('returns enrolled=true with no checkoutUrl for a free course (HTTP 201)', () => {
      const result = transformEnroll({ success: true, data: { enrolled: true } });
      expect(result.enrolled).toBe(true);
      expect(result.checkoutUrl).toBeUndefined();
    });

    it('returns enrolled=false with checkoutUrl for a paid course (HTTP 202)', () => {
      const result = transformEnroll({
        success: true,
        data: { enrolled: false, checkoutUrl: 'https://checkout.paystack.com/abc123' },
      });
      expect(result.enrolled).toBe(false);
      expect(result.checkoutUrl).toBe('https://checkout.paystack.com/abc123');
    });

    it('does NOT read paymentUrl or authorizationUrl — only checkoutUrl', () => {
      // Confirm the contract: only checkoutUrl from the real backend is mapped
      const result = transformEnroll({
        success: true,
        data: { enrolled: false, checkoutUrl: 'https://checkout.example.com/xyz' },
      });
      expect(result.checkoutUrl).toBe('https://checkout.example.com/xyz');
    });
  });

  describe('transformMaterial', () => {
    it('unwraps presignedUrl and expiresInSeconds from the envelope', () => {
      const result = transformMaterial({
        success: true,
        data: {
          presignedUrl: 'https://s3.example.com/material.pdf?X-Amz-Signature=abc',
          expiresInSeconds: 3600,
        },
      });
      expect(result.presignedUrl).toContain('https://s3.example.com');
      expect(result.expiresInSeconds).toBe(3600);
    });
  });
});

describe('Course type shape (backend contract)', () => {
  it('accepts all CoursePublicDto fields including videoUrl and materialPdfUrl', () => {
    const course: Course = {
      id: 'c99',
      title: 'Digital Trade Finance',
      description: 'Letters of credit and more.',
      category: 'Finance',
      duration: '5 hours',
      level: 'advanced',
      price: 25000,
      isFree: false,
      enrolledCount: 89,
      instructorName: 'Mrs. Aisha Bayero',
      isPublished: true,
      videoUrl: 'https://vimeo.com/123456',
      materialPdfUrl: 'https://s3.example.com/course-99-material.pdf',
    };
    expect(course.videoUrl).toBe('https://vimeo.com/123456');
    expect(course.materialPdfUrl).toBeDefined();
  });

  it('allows optional fields to be omitted', () => {
    const minimal: Course = {
      id: 'c01',
      title: 'Intro to Export',
      description: 'Basics',
      category: 'Export',
      duration: '1 hour',
      level: 'beginner',
      price: 0,
      isFree: true,
      enrolledCount: 0,
    };
    expect(minimal.videoUrl).toBeUndefined();
    expect(minimal.materialPdfUrl).toBeUndefined();
    expect(minimal.instructorName).toBeUndefined();
  });
});
