import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

export const emptyApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['ECO', 'Members', 'AuditLogs', 'AdminMembers', 'Documents', 'AcademyEnrollments', 'AcademyCourses', 'AcademySections', 'EcoQueue', 'TradeFairBooths', 'TradeFairEvents', 'TradeFairBookings', 'ExportDocuments', 'ExporterProfiles', 'TradeCorridors', 'TradeDataApi', 'WhiteLabel'],
  endpoints: () => ({}),
});
