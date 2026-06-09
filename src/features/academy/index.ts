export {
  academyApi,
  useGetCoursesQuery,
  useGetMyEnrollmentsQuery,
  useGetAllEnrollmentsQuery,
  useEnrollCourseMutation,
  useLazyGetMaterialQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
} from './academyApi';
export type { Course, Enrollment, EnrollResult, MaterialResult } from './academyApi';
