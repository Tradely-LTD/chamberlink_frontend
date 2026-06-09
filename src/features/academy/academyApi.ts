import { emptyApi } from '@shared/api/emptyApi';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  isFree: boolean;
  enrolledCount: number;
  instructorName?: string;
  isPublished?: boolean;
  videoUrl?: string;
  materialPdfUrl?: string;
}

export interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  videoUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  progress: number;
  enrolledAt: string;
  completedAt?: string;
  memberName?: string;
  memberEmail?: string;
}

export interface EnrollResult {
  enrolled: boolean;
  checkoutUrl?: string;
}

export interface MaterialResult {
  presignedUrl: string;
  expiresInSeconds: number;
}

export const academyApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getCourses: builder.query<Course[], void>({
      query: () => '/academy/courses',
      transformResponse: (res: ApiResponse<Course[]>) => res.data,
      providesTags: ['AcademyCourses'],
    }),
    getMyEnrollments: builder.query<Enrollment[], void>({
      query: () => '/academy/enrollments',
      transformResponse: (res: ApiResponse<Enrollment[]>) => res.data,
      providesTags: ['AcademyEnrollments'],
    }),
    getAllEnrollments: builder.query<Enrollment[], void>({
      query: () => '/academy/admin/enrollments',
      transformResponse: (res: ApiResponse<Enrollment[]>) => res.data,
      providesTags: ['AcademyEnrollments'],
    }),
    enrollCourse: builder.mutation<EnrollResult, string>({
      query: (courseId) => ({
        url: `/academy/courses/${courseId}/enroll`,
        method: 'POST',
        body: { callbackUrl: `${window.location.origin}/dashboard/academy` },
      }),
      transformResponse: (res: ApiResponse<{ enrolled: boolean; checkoutUrl?: string }>) => ({
        enrolled: res.data.enrolled,
        checkoutUrl: res.data.checkoutUrl,
      }),
      invalidatesTags: ['AcademyEnrollments'],
    }),
    getMaterial: builder.query<MaterialResult, string>({
      query: (courseId) => ({ url: `/academy/courses/${courseId}/material` }),
      transformResponse: (res: ApiResponse<MaterialResult>) => res.data,
    }),
    createCourse: builder.mutation<Course, Partial<Course>>({
      query: (body) => ({ url: '/academy/admin/courses', method: 'POST', body }),
      transformResponse: (res: ApiResponse<Course>) => res.data,
      invalidatesTags: ['AcademyCourses'],
    }),
    updateCourse: builder.mutation<Course, { id: string } & Partial<Course>>({
      query: ({ id, ...body }) => ({ url: `/academy/admin/courses/${id}`, method: 'PATCH', body }),
      transformResponse: (res: ApiResponse<Course>) => res.data,
      invalidatesTags: ['AcademyCourses'],
    }),
    deleteCourse: builder.mutation<void, string>({
      query: (id) => ({ url: `/academy/admin/courses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AcademyCourses'],
    }),

    // ── Sections ────────────────────────────────────────────────────────────

    getCourseSections: builder.query<CourseSection[], string>({
      query: (courseId) => `/academy/courses/${courseId}/sections`,
      transformResponse: (res: ApiResponse<CourseSection[]>) => res.data,
      providesTags: (_, __, courseId) => [{ type: 'AcademySections', id: courseId }],
    }),
    addSection: builder.mutation<CourseSection, { courseId: string; title: string; description?: string; videoUrl: string; sortOrder?: number }>({
      query: ({ courseId, ...body }) => ({ url: `/academy/admin/courses/${courseId}/sections`, method: 'POST', body }),
      transformResponse: (res: ApiResponse<CourseSection>) => res.data,
      invalidatesTags: (_, __, { courseId }) => [{ type: 'AcademySections', id: courseId }],
    }),
    updateSection: builder.mutation<CourseSection, { sectionId: string; courseId: string; title?: string; description?: string; videoUrl?: string; sortOrder?: number }>({
      query: ({ sectionId, courseId: _courseId, ...body }) => ({ url: `/academy/admin/sections/${sectionId}`, method: 'PATCH', body }),
      transformResponse: (res: ApiResponse<CourseSection>) => res.data,
      invalidatesTags: (_, __, { courseId }) => [{ type: 'AcademySections', id: courseId }],
    }),
    deleteSection: builder.mutation<void, { sectionId: string; courseId: string }>({
      query: ({ sectionId }) => ({ url: `/academy/admin/sections/${sectionId}`, method: 'DELETE' }),
      invalidatesTags: (_, __, { courseId }) => [{ type: 'AcademySections', id: courseId }],
    }),

    // Upload (or replace) the PDF material attached to a course.
    // Sends multipart/form-data so the backend multer middleware receives the file.
    uploadCourseMaterial: builder.mutation<Course, { courseId: string; file: File }>({
      query: ({ courseId, file }) => {
        const body = new FormData();
        body.append('materialPdf', file);
        return { url: `/academy/admin/courses/${courseId}`, method: 'PATCH', body };
      },
      transformResponse: (res: ApiResponse<Course>) => res.data,
      invalidatesTags: ['AcademyCourses'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCoursesQuery,
  useGetMyEnrollmentsQuery,
  useGetAllEnrollmentsQuery,
  useEnrollCourseMutation,
  useLazyGetMaterialQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useGetCourseSectionsQuery,
  useAddSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useUploadCourseMaterialMutation,
} = academyApi;
