import { emptyApi } from '@shared/api/emptyApi';

// ── Types ─────────────────────────────────────────────────────────────────

export interface TradeFairEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  venue: string;
  status: 'draft' | 'upcoming' | 'open_for_registration' | 'ongoing' | 'completed' | 'cancelled';
  boothsAvailable: number;
  registrationDeadline?: string;
  imageUrl?: string | null;
  kaccimaSharePct?: number;
  tradelySharePct?: number;
}

export interface TradeFairBooth {
  id: string;
  eventId: string;
  boothNumber: string;
  boothType: string;
  zone: string;
  size: string;
  price: number;
  status: 'available' | 'reserved' | 'paid' | 'cancelled';
}

export type BookingStatus = 'pending_payment' | 'reserved' | 'checked_in' | 'cancelled';

export interface MyBooth {
  id: string;
  boothId: string;
  eventId: string;
  boothNumber: string;
  boothType: string;
  zone?: string;
  size?: string;
  eventTitle: string;
  eventStartDate: string;
  amount: number;
  status: BookingStatus;
  paymentRef?: string;
  receiptUrl: string | null;
  createdAt: string;
}

export interface AdminBooking {
  id: string;
  boothNumber: string;
  boothType: string;
  zone: string;
  size: string;
  amount: number;
  status: BookingStatus;
  paymentRef?: string;
  eventId: string;
  eventTitle: string;
  memberName: string;
  memberEmail: string;
  createdAt: string;
  cancelledAt?: string;
  refundRef?: string;
}

export interface ReserveBoothResult {
  reservationId: string;
  alreadyPaid: boolean;
  authorizationUrl?: string;
  reference?: string;
  receiptUrl?: string;
}

interface ApiResponse<T> { success: boolean; data: T; }
interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ── API slice ──────────────────────────────────────────────────────────────

export const tradeFairApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getTradeFairEvents: builder.query<TradeFairEvent[], void>({
      query: () => '/trade-fair/events',
      transformResponse: (res: ApiResponse<TradeFairEvent[]>) => res.data,
      providesTags: ['TradeFairEvents'],
    }),

    getAdminTradeFairEvents: builder.query<TradeFairEvent[], void>({
      query: () => ({ url: '/trade-fair/admin/events', params: { page: 1, limit: 100 } }),
      transformResponse: (res: PaginatedResponse<TradeFairEvent>) => res.data,
      providesTags: ['TradeFairEvents'],
    }),

    getAvailableBooths: builder.query<TradeFairBooth[], string>({
      query: (eventId) => `/trade-fair/events/${eventId}/booths`,
      transformResponse: (res: ApiResponse<TradeFairBooth[]>) => res.data,
      providesTags: (_, __, eventId) => [{ type: 'TradeFairBooths', id: eventId }],
    }),

    reserveBooth: builder.mutation<ReserveBoothResult, { eventId: string; boothId: string; callbackUrl?: string }>({
      query: (body) => ({ url: '/trade-fair/booths/reserve', method: 'POST', body }),
      transformResponse: (res: ApiResponse<ReserveBoothResult>) => res.data,
      invalidatesTags: ['TradeFairBooths', 'TradeFairBookings'],
    }),

    initiateBoothPayment: builder.mutation<{ authorizationUrl: string; reference: string }, { reservationId: string; callbackUrl?: string }>({
      query: (body) => ({ url: '/trade-fair/payment/initiate', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ authorizationUrl: string; reference: string }>) => res.data,
      invalidatesTags: ['TradeFairBookings'],
    }),

    verifyBoothPayment: builder.mutation<{ status: string; confirmed: boolean }, string>({
      query: (reference) => ({ url: '/trade-fair/payment/verify', params: { reference } }),
      transformResponse: (res: ApiResponse<{ status: string; confirmed: boolean }>) => res.data,
      invalidatesTags: ['TradeFairBookings', 'TradeFairBooths'],
    }),

    getMyBooths: builder.query<MyBooth[], void>({
      query: () => '/trade-fair/my-booths',
      transformResponse: (res: ApiResponse<MyBooth[]>) => res.data,
      providesTags: ['TradeFairBookings'],
    }),

    getAllBookings: builder.query<AdminBooking[], { eventId?: string; page?: number; limit?: number }>({
      query: ({ eventId, page = 1, limit = 20 } = {}) => ({
        url: '/trade-fair/admin/bookings',
        params: { ...(eventId ? { eventId } : {}), page, limit },
      }),
      transformResponse: (res: PaginatedResponse<AdminBooking> | ApiResponse<AdminBooking[]>) =>
        'data' in res && Array.isArray(res.data) ? res.data : [],
      providesTags: ['TradeFairBookings'],
    }),

    addBooth: builder.mutation<TradeFairBooth, { eventId: string; boothNumber: string; boothType: string; zone: string; size: string; price: number }>({
      query: (body) => ({ url: '/trade-fair/admin/booths', method: 'POST', body }),
      transformResponse: (res: ApiResponse<TradeFairBooth>) => res.data,
      invalidatesTags: ['TradeFairBooths', 'TradeFairEvents'],
    }),

    updateBooth: builder.mutation<TradeFairBooth, { boothId: string; eventId?: string; boothNumber?: string; boothType?: string; zone?: string; size?: string; price?: number; status?: string }>({
      query: ({ boothId, ...body }) => ({ url: `/trade-fair/admin/booths/${boothId}`, method: 'PATCH', body }),
      transformResponse: (res: ApiResponse<TradeFairBooth>) => res.data,
      invalidatesTags: ['TradeFairBooths', 'TradeFairEvents'],
    }),
    getAllAdminBooths: builder.query<TradeFairBooth[], { eventId?: string; page?: number; limit?: number }>({
      query: ({ eventId, page = 1, limit = 100 } = {}) => ({
        url: '/trade-fair/admin/booths',
        params: { ...(eventId ? { eventId } : {}), page, limit },
      }),
      transformResponse: (res: PaginatedResponse<TradeFairBooth>) => res.data,
      providesTags: ['TradeFairBooths'],
    }),

    createEvent: builder.mutation<TradeFairEvent, { title: string; venue: string; startDate: string; endDate: string; kaccimaSharePct: number; tradelySharePct: number; description?: string; registrationDeadline?: string }>({
      query: (body) => ({ url: '/trade-fair/admin/events', method: 'POST', body }),
      transformResponse: (res: ApiResponse<TradeFairEvent>) => res.data,
      invalidatesTags: ['TradeFairEvents'],
    }),

    updateEvent: builder.mutation<TradeFairEvent, { eventId: string } & Partial<{ title: string; venue: string; startDate: string; endDate: string; kaccimaSharePct: number; tradelySharePct: number; description: string; registrationDeadline: string; status: string }>>({
      query: ({ eventId, ...body }) => ({ url: `/trade-fair/admin/events/${eventId}`, method: 'PATCH', body }),
      transformResponse: (res: ApiResponse<TradeFairEvent>) => res.data,
      invalidatesTags: ['TradeFairEvents'],
    }),

    cancelBooking: builder.mutation<void, string>({
      query: (bookingId) => ({ url: `/trade-fair/admin/bookings/${bookingId}/cancel`, method: 'POST' }),
      invalidatesTags: ['TradeFairBookings', 'TradeFairBooths', 'TradeFairEvents'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTradeFairEventsQuery,
  useGetAdminTradeFairEventsQuery,
  useGetAvailableBoothsQuery,
  useReserveBoothMutation,
  useInitiateBoothPaymentMutation,
  useVerifyBoothPaymentMutation,
  useGetMyBoothsQuery,
  useGetAllBookingsQuery,
  useAddBoothMutation,
  useUpdateBoothMutation,
  useGetAllAdminBoothsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useCancelBookingMutation,
} = tradeFairApi;
