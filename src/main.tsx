import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@app/store';
import { router } from '@app/router';
import { AppLoader } from '@app/AppLoader';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppLoader>
        <RouterProvider router={router} />
      </AppLoader>
    </Provider>
  </React.StrictMode>
);
