import { configureStore } from '@reduxjs/toolkit'
import portfolioReducer from './portfolioSlice'

export const store = configureStore({
  reducer: {
    portfolio: portfolioReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch